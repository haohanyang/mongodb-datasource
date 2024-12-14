import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, LegacyMetricFindQueryOptions, MetricFindValue, dateTime, AdHocVariableFilter } from "@grafana/data";
import { DataSourceWithBackend, getTemplateSrv } from "@grafana/runtime";
import { parseJsQuery, datetimeToJson, getBucketCount, parseJsQueryLegacy, randomId, getMetricValues } from "./utils";
import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage, VariableQuery } from "./types";
import { firstValueFrom } from "rxjs";


export class DataSource extends DataSourceWithBackend<MongoQuery, MongoDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MongoDataSourceOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(_: CoreApp): Partial<MongoQuery> {
    return DEFAULT_QUERY;
  }

  interpolateVariablesInQueries(queries: MongoQuery[], scopedVars: ScopedVars, filters?: AdHocVariableFilter[]): MongoQuery[] {
    console.log("interpolateVariablesInQueries");
    return [];
  }

  applyTemplateVariables(query: MongoQuery, scopedVars: ScopedVars) {
    console.log(scopedVars["__interval_ms"]?.value);
    let queryText = query.queryText!;

    if (query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW) {
      const { jsonQuery } =
        query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW
          ? parseJsQuery(queryText)
          : parseJsQueryLegacy(queryText);
      queryText = jsonQuery!;
    }

    const from = getTemplateSrv().replace("$__from", {});
    const to = getTemplateSrv().replace("$__to", {});

    let text = getTemplateSrv().replace(queryText, scopedVars);
    if (from !== "$__from") {
      text = text.replaceAll(/"\$from"/g, datetimeToJson(from));
    }

    if (to !== "$__to") {
      text = text.replaceAll(/"\$to"/g, datetimeToJson(to));
    }

    const interval = scopedVars["__interval_ms"]?.value;

    if (interval) {
      text = text.replaceAll(
        /"\$dateBucketCount"/g,
        getBucketCount(from, to, interval).toString()
      );
    }

    return {
      ...query,
      queryText: text
    };
  }

  async metricFindQuery(query: VariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    const request: DataQueryRequest<MongoQuery> = {
      requestId: "variable-query-" + randomId(3),
      targets: [{
        refId: "A",
        queryLanguage: QueryLanguage.JSON,
        collection: query.collection,
        queryText: getTemplateSrv().replace(query.queryText),
        queryType: "table"
      }],
      scopedVars: options?.scopedVars || {},
      interval: "5s",
      timezone: "browser",
      intervalMs: 5000,
      range: options?.range || {
        from: dateTime(),
        to: dateTime(),
        raw: {
          from: "now",
          to: "now"
        }
      },
      app: "variable-query",
      startTime: (options?.range?.from || dateTime()).toDate().getUTCMilliseconds()
    };

    const resp = await firstValueFrom(this.query(request));
    if (resp.errors?.length && resp.errors.length > 0) {
      throw new Error(resp.errors[0].message || "Unknown error");
    }

    return getMetricValues(resp);
  }

  filterQuery(query: MongoQuery): boolean {
    return !!query.queryText && !!query.collection;
  }

}
