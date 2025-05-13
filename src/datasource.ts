import {
  DataSourceInstanceSettings,
  CoreApp,
  ScopedVars,
  DataQueryRequest,
  LegacyMetricFindQueryOptions,
  MetricFindValue,
  dateTime,
  LiveChannelScope,
  DataQueryResponse,
  LoadingState
} from '@grafana/data';
import { DataSourceWithBackend, getGrafanaLiveSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  parseJsQuery,
  getBucketCount,
  parseJsQueryLegacy,
  randomId,
  getMetricValues,
  datetimeToJson,
  base64UrlEncode,
  unixTsToMongoID
} from './utils';
import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage, VariableQuery } from './types';
import { firstValueFrom, merge, Observable, of } from 'rxjs';
import { MongoDBVariableSupport } from 'variables'

export class MongoDBDataSource extends DataSourceWithBackend<MongoQuery, MongoDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MongoDataSourceOptions>,
    private readonly templateSrv: TemplateSrv = getTemplateSrv()) {
    super(instanceSettings);
    this.variables = new MongoDBVariableSupport(this, this.templateSrv);
  }

  getDefaultQuery(_: CoreApp): Partial<MongoQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: MongoQuery, scopedVars: ScopedVars) {
    let queryText = query.queryText!;

    if (query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW) {
      const { jsonQuery } =
        query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW
          ? parseJsQuery(queryText)
          : parseJsQueryLegacy(queryText);
      queryText = jsonQuery!;
    }

    const from = getTemplateSrv().replace('$__from', {});
    const to = getTemplateSrv().replace('$__to', {});

    queryText = queryText
      .replaceAll(/"\$__from_oid"/g, `"${unixTsToMongoID(from, '0')}"`)
      .replaceAll(/"\$__to_oid"/g, `"${unixTsToMongoID(to, 'f')}"`);

    // Compatible with legacy plugin $from
    if (from !== '$__from') {
      queryText = queryText.replaceAll(/"\$from"/g, datetimeToJson(from));
    }

    // Compatible with legacy plugin $to
    if (to !== '$__to') {
      queryText = queryText.replaceAll(/"\$to"/g, datetimeToJson(to));
    }

    const interval = scopedVars['__interval_ms']?.value;

    // Compatible with legacy plugin $dateBucketCount
    if (interval && from && to) {
      queryText = queryText.replaceAll(/"\$dateBucketCount"/g, getBucketCount(from, to, interval).toString());
    }

    const text = getTemplateSrv().replace(queryText, scopedVars);
    return {
      ...query,
      queryText: text,
    };
  }

  annotations = {}

  async metricFindQuery(query: VariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    const request: DataQueryRequest<MongoQuery> = {
      requestId: 'variable-query-' + randomId(3),
      targets: [
        {
          refId: 'A',
          queryLanguage: QueryLanguage.JSON,
          collection: query.collection,
          queryText: getTemplateSrv().replace(query.queryText),
          queryType: 'table',
          isStreaming: false,
        },
      ],
      scopedVars: options?.scopedVars || {},
      interval: '5s',
      timezone: 'browser',
      intervalMs: 5000,
      range: options?.range || {
        from: dateTime(),
        to: dateTime(),
        raw: {
          from: 'now',
          to: 'now',
        },
      },
      app: 'variable-query',
      startTime: (options?.range?.from || dateTime()).toDate().getUTCMilliseconds(),
    };

    const resp = await firstValueFrom(this.query(request));
    if (resp.errors?.length && resp.errors.length > 0) {
      throw new Error(resp.errors[0].message || 'Unknown error');
    }

    return getMetricValues(resp);
  }

  filterQuery(query: MongoQuery): boolean {
    return !!query.queryText && !!query.collection;
  }

  query(request: DataQueryRequest<MongoQuery>): Observable<DataQueryResponse> {
    if (request.liveStreaming) {
      const observables = request.targets.map((query) => {
        return getGrafanaLiveSrv().getDataStream({
          addr: {
            scope: LiveChannelScope.DataSource,
            namespace: this.uid,
            path: `mongodb-datasource/${query.refId}`,
            data: {
              ...query,
            },
          },
        });
      });

      return merge(...observables);
    }

    const streamQueries = request.targets.filter((query) => query.isStreaming);

    if (streamQueries.length === 0) {
      return super.query(request);
    } else if (streamQueries.length === request.targets.length) {
      const observables = request.targets.map((query) => {
        return getGrafanaLiveSrv().getDataStream({
          addr: {
            scope: LiveChannelScope.DataSource,
            namespace: this.uid,
            path: `mongodb-datasource/${base64UrlEncode(query.collection)}-${base64UrlEncode(query.queryText)}`,
            data: {
              ...query,
            },
          },
        });
      });

      return merge(...observables);
    } else {
      // Mix of streaming requests and normal requests is not supported
      return of({
        data: [],
        error: {
          message: 'Mix of streaming requests and normal requests is not supported',
        },
        state: LoadingState.Error,
      });
    }
  }
}
