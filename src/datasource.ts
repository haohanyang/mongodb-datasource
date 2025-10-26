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
import { EJSON } from 'bson';
import { parseFilter } from 'mongodb-query-parser';
import { merge, Observable, of } from 'rxjs';
import { base64UrlEncode, unixTsToMongoID } from './utils';
import { MongoDBQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage } from './types';
import { MongoDBVariableSupport } from './variables';

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

    console.log('applyTemplateVariables', variables);

    let from: number | undefined = undefined;
    let to: number | undefined = undefined;

    if (query.localFrom) {
      from = query.localFrom.toDate().getTime();

      const localFromText = JSON.stringify({
        $date: {
          $numberLong: from.toString(),
        },
      });
      variables['__local_from'] = { value: localFromText };
      variables['__from_oid'] = { value: unixTsToMongoID(from, '0') };
    }

    if (query.localTo) {
      to = query.localTo.toDate().getTime();
      const localToText = JSON.stringify({
        $date: {
          $numberLong: to.toString(),
        },
      });
      variables['__local_to'] = { value: localToText };
      variables['__to_oid'] = { value: unixTsToMongoID(to, '0') };
    }

    let queryText = query.queryText!;

    const interval_ms: number | undefined = scopedVars['__interval_ms']?.value;

    // $dateBucketCount
    if (interval_ms && from && to) {
      variables.dateBucketCount = { value: Math.ceil((to - from) / interval_ms) };
    }

    let text = this.templateSrv.replace(queryText, variables);

    if (query.queryLanguage === QueryLanguage.JAVASCRIPT) {
      // Convert JS to JSON
      // TODO: handle errors
      text = EJSON.stringify(parseFilter(text));
    }
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
    console.log('query');

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
      return super.query({
        ...request,
        targets: request.targets.map((query) => {
          return { ...query, localFrom: request.range.from, localTo: request.range.to };
        }),
      });
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
