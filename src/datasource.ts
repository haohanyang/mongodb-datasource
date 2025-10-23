import {
  DataSourceInstanceSettings,
  CoreApp,
  ScopedVars,
  DataQueryRequest,
  LiveChannelScope,
  DataQueryResponse,
  LoadingState,
} from '@grafana/data';
import { DataSourceWithBackend, getGrafanaLiveSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { parseJsQuery, parseJsQueryLegacy, base64UrlEncode, unixTsToMongoID } from './utils';
import { MongoDBQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage } from './types';
import { merge, Observable, of } from 'rxjs';
import { MongoDBVariableSupport } from 'variables';

export class MongoDBDataSource extends DataSourceWithBackend<MongoDBQuery, MongoDataSourceOptions> {
  constructor(
    instanceSettings: DataSourceInstanceSettings<MongoDataSourceOptions>,
    private readonly templateSrv: TemplateSrv = getTemplateSrv(),
  ) {
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
    let from_ms: number | undefined = undefined;
    let to_ms: number | undefined = undefined;

    const from = this.templateSrv.replace('$__from', variables);
    const to = this.templateSrv.replace('$__to', variables);

    if (from !== '$__from') {
      from_ms = parseInt(from, 10);
      // $__from_oid
      variables.__from_oid = { value: unixTsToMongoID(from_ms, '0') };
      // $from
      queryText = queryText.replaceAll(
        /"\$from"/g,
        JSON.stringify({
          $date: {
            $numberLong: from,
          },
        }),
      );
    }

    if (to !== '$__to') {
      to_ms = parseInt(to, 10);
      // $__to_oid
      variables.__to_oid = { value: unixTsToMongoID(to_ms, 'f') };
      // $to
      queryText = queryText.replaceAll(
        /"\$to"/g,
        JSON.stringify({
          $date: {
            $numberLong: to,
          },
        }),
      );
    }

    const interval_ms: number | undefined = scopedVars['__interval_ms']?.value;
    // $dateBucketCount
    if (interval_ms && from_ms && to_ms) {
      variables.dateBucketCount = { value: Math.ceil((parseInt(to, 10) - parseInt(from, 10)) / interval_ms) };
    }

    const text = this.templateSrv.replace(queryText, variables);
    const collection = query.collection ? this.templateSrv.replace(query.collection, variables) : query.collection;

    return {
      ...query,
      queryText: text,
      collection,
    };
  }

  annotations = {};

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

  getCollectionNames(): Promise<string[]> {
    return this.getResource('collections').catch((err) => {
      return [];
    });
  }
}
