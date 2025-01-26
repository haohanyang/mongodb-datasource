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
  LoadingState,
  DataFrameSchema,
  FieldType,
} from '@grafana/data';
import { DataSourceWithBackend, getGrafanaLiveSrv, getTemplateSrv } from '@grafana/runtime';
import {
  parseJsQuery,
  parseJsQueryLegacy
} from './parse';
import { base64UrlEncode } from './encode'
import { datetimeToJson, unixTsToMongoID } from "./datetime"
import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage, VariableQuery } from './types';
import { firstValueFrom, merge, Observable, of } from 'rxjs';



function randomId(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export class DataSource extends DataSourceWithBackend<MongoQuery, MongoDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MongoDataSourceOptions>) {
    super(instanceSettings);
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

    // Get query ranges in unix milliseconds
    const from = parseInt(getTemplateSrv().replace('$__from', {}), 10);
    const to = parseInt(getTemplateSrv().replace('$__to', {}), 10);

    queryText = queryText
      // Compatible with legacy plugin $from
      .replaceAll(/"\$from"/g, datetimeToJson(from))
      .replaceAll(/"\$to"/g, datetimeToJson(to))
      .replaceAll(/"\$__from_oid"/g, `"${unixTsToMongoID(from, '0')}"`)
      .replaceAll(/"\$__to_oid"/g, `"${unixTsToMongoID(to, 'f')}"`);

    const interval = scopedVars['__interval_ms']?.value;

    // Compatible with legacy plugin $dateBucketCount
    if (interval) {
      const numBuckets = Math.ceil((to - from) / interval);
      queryText = queryText.replaceAll(/"\$dateBucketCount"/g, numBuckets.toString());
    }

    const text = getTemplateSrv().replace(queryText, scopedVars);
    return {
      ...query,
      queryText: text,
    };
  }

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


function getMetricValues(response: DataQueryResponse): MetricFindValue[] {
  const dataframe = response.data[0] as DataFrameSchema;
  const field = dataframe.fields.find((f) => f.name === 'value');

  if (!field) {
    throw new Error('Field "value" not found');
  }

  if (field.type !== FieldType.string && field.type !== FieldType.number) {
    throw new Error('Each element should be string or number');
  }

  // @ts-ignore
  return field.values.map((value: string | number) => {
    return {
      text: value.toString(),
      value: value,
      expandable: true,
    };
  });
}