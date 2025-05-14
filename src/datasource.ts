import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, LiveChannelScope, DataQueryResponse, LoadingState, rangeUtil } from '@grafana/data';
import { DataSourceWithBackend, getGrafanaLiveSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { parseJsQuery, getBucketCount, parseJsQueryLegacy, base64UrlEncode, datetimeToJson, unixTsToMongoID } from './utils';
import { MongoDBQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage } from './types';
import { merge, Observable, of } from 'rxjs';
import { MongoDBVariableSupport } from 'variables'

export class MongoDBDataSource extends DataSourceWithBackend<MongoDBQuery, MongoDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MongoDataSourceOptions>,
    private readonly templateSrv: TemplateSrv = getTemplateSrv()) {
    super(instanceSettings);
    this.variables = new MongoDBVariableSupport(this);
  }

  getDefaultQuery(_: CoreApp): Partial<MongoDBQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: MongoDBQuery, scopedVars: ScopedVars) {
    const variables = { ...scopedVars };

    let queryText = query.queryText!;
    if (query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW) {
      const { jsonQuery } =
        query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW
          ? parseJsQuery(queryText)
          : parseJsQueryLegacy(queryText);
      queryText = jsonQuery!;
    }

    // Get time range
    const from = this.templateSrv.replace('$__from', variables);
    const to = this.templateSrv.replace('$__to', variables);

    if (from && to) {
      variables.__from_oid = { value: unixTsToMongoID(from, '0') }
      variables.__to_oid = { value: unixTsToMongoID(to, 'f') }

      queryText = queryText
        .replaceAll(/"\$from"/g, datetimeToJson(from))
        .replaceAll(/"\$to"/g, datetimeToJson(to));
    }


    const interval = scopedVars['__interval_ms']?.value;
    // $dateBucketCount
    if (interval && from && to) {
      variables.dateBucketCount = { value: getBucketCount(from, to, interval) }
    }

    const text = this.templateSrv.replace(queryText, variables);
    return {
      ...query,
      queryText: text,
    };
  }

  annotations = {}

  filterQuery(query: MongoDBQuery): boolean {
    return !!query.queryText && !!query.collection;
  }

  query(request: DataQueryRequest<MongoDBQuery>): Observable<DataQueryResponse> {
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
