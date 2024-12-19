import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, LegacyMetricFindQueryOptions, MetricFindValue, dateTime, LiveChannelScope, DataQueryResponse } from "@grafana/data";
import { DataSourceWithBackend, getGrafanaLiveSrv, getTemplateSrv } from "@grafana/runtime";
import { parseJsQuery, getBucketCount, parseJsQueryLegacy, randomId, getMetricValues, datetimeToJson } from "./utils";
import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage, VariableQuery } from "./types";
import { firstValueFrom, merge, Observable } from "rxjs";

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

    const from = getTemplateSrv().replace("$__from", {});
    const to = getTemplateSrv().replace("$__to", {});

    // Compatible with legacy plugin $from
    if (from !== "$__from") {
      queryText = queryText.replaceAll(/"\$from"/g, datetimeToJson(from));
    }

    // Compatible with legacy plugin $to
    if (to !== "$__to") {
      queryText = queryText.replaceAll(/"\$to"/g, datetimeToJson(to));
    }

    const interval = scopedVars["__interval_ms"]?.value;

    // Compatible with legacy plugin $dateBucketCount
    if (interval && from && to) {
      queryText = queryText.replaceAll(
        /"\$dateBucketCount"/g,
        getBucketCount(from, to, interval).toString()
      );
    }

    const text = getTemplateSrv().replace(queryText, scopedVars);

    console.log(text);
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


  query(request: DataQueryRequest<MongoQuery>): Observable<DataQueryResponse> {

    const queries = request.targets.map((query) => {
      let queryText = query.queryText!;
      if (query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW) {
        const { jsonQuery } =
          query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW
            ? parseJsQuery(queryText)
            : parseJsQueryLegacy(queryText);
        queryText = jsonQuery!;
      }

      return {
        ...query,
        queryText: queryText
          .replaceAll(/"\$from"/g, datetimeToJson(request.range.from))
          .replaceAll(/"\$to"/g, datetimeToJson(request.range.to))
          .replaceAll(
            /"\$dateBucketCount"/g,
            getBucketCount(request.range.from, request.range.to, request.intervalMs).toString()
          ),
      };
    });

    const isStreaming = true;

    if (isStreaming) {
      const observables = queries.map(query => {

        return getGrafanaLiveSrv().getDataStream({
          addr: {
            scope: LiveChannelScope.DataSource,
            namespace: this.uid,
            path: "mongodb-datasource/stream", // TODO: name
            data: {
              ...query,
            },
          },
        });
      });
  
      return merge(...observables);
    }

    return super.query({ ...request, targets: queries });
  }

}
