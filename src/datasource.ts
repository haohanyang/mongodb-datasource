import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, DataQueryResponse } from "@grafana/data";
import { DataSourceWithBackend, getTemplateSrv } from "@grafana/runtime";
import { parseJsQuery, datetimeToJson, getBucketCount } from "./utils";
import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage } from "./types";
import { Observable } from "rxjs";


export class DataSource extends DataSourceWithBackend<MongoQuery, MongoDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MongoDataSourceOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(_: CoreApp): Partial<MongoQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: MongoQuery, scopedVars: ScopedVars) {
    return {
      ...query,
      queryText: getTemplateSrv().replace(query.queryText, scopedVars),
    };
  }

  filterQuery(query: MongoQuery): boolean {
    return !!query.queryText && !!query.collection;
  }

  query(request: DataQueryRequest<MongoQuery>): Observable<DataQueryResponse> {
    const queries = request.targets.map(query => {
      let queryText = query.queryText!;
      if (query.queryLanguage === QueryLanguage.JAVASCRIPT) {
        const { jsonQuery } = parseJsQuery(queryText);
        queryText = jsonQuery!;
      }

      return {
        ...query,
        queryText: queryText.replaceAll(/"\$from"/g, datetimeToJson(request.range.from))
          .replaceAll(/"\$to"/g, datetimeToJson(request.range.to))
          .replaceAll(/"\$dateBucketCount"/g, getBucketCount(request.range.from, request.range.to, request.intervalMs).toString())
      };
    });

    return super.query({ ...request, targets: queries });
  }
}
