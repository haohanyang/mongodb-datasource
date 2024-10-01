import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, DataQueryResponse, DateTime } from "@grafana/data";
import { DataSourceWithBackend, getTemplateSrv } from "@grafana/runtime";
import { validateJsonQueryText, validateJsQueryText, parseJsQuery } from "./utils";
import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage } from "./types";
import { Observable } from "rxjs";

function datetimeToJson(datetime: DateTime) {
  return JSON.stringify({
    $date: {
      $numberLong: datetime.toDate().getTime().toString()
    }
  });
}

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
    if (!query.collection) {
      return false;
    }

    if (query.queryLanguage == QueryLanguage.JAVASCRIPT) {
      return !validateJsQueryText(query.queryText);
    } else {
      return !validateJsonQueryText(query.queryText);
    }
  }

  query(request: DataQueryRequest<MongoQuery>): Observable<DataQueryResponse> {
    const queries = request.targets.map(query => {
      let queryText = query.queryText!;
      if (query.queryLanguage == QueryLanguage.JAVASCRIPT) {
        const { jsonQuery } = parseJsQuery(queryText);
        queryText = jsonQuery!;
      }

      return {
        ...query,
        queryText: queryText.replaceAll(/"\$from"/g, datetimeToJson(request.range.from))
          .replaceAll(/"\$to"/g, datetimeToJson(request.range.to))
      };
    });

    return super.query({ ...request, targets: queries });
  }
}
