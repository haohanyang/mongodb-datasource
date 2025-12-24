import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, DataQueryResponse } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { EJSON } from 'bson';
import { parseFilter } from 'mongodb-query-parser';
import { Observable } from 'rxjs';
import { unixTsToMongoID } from './utils';
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

    let from: number | undefined = undefined;
    let to: number | undefined = undefined;

    if (query.localFrom) {
      from = query.localFrom.toDate().getTime();

      variables['__local_from'] = { value: from.toString() };
      variables['__from_oid'] = { value: `"${unixTsToMongoID(from, '0')}"` };
    }

    if (query.localTo) {
      to = query.localTo.toDate().getTime();
      variables['__local_to'] = { value: to.toString() };
      variables['__to_oid'] = { value: `"${unixTsToMongoID(to, '0')}"` };
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
    return super.query({
      ...request,
      targets: request.targets.map((query) => {
        return { ...query, localFrom: request.range.from, localTo: request.range.to };
      }),
    });
  }

  getCollectionNames(): Promise<string[]> {
    return this.getResource('collections').catch((err) => {
      return [];
    });
  }
}
