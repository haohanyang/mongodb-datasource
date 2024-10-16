import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, DataQueryResponse, LegacyMetricFindQueryOptions, MetricFindValue, dateTime, DataFrameSchema, FieldType } from "@grafana/data";
import { DataSourceWithBackend, getTemplateSrv } from "@grafana/runtime";
import { parseJsQuery, datetimeToJson, getBucketCount, parseJsQueryLegacy, randomId } from "./utils";
import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY, QueryLanguage, VariableQuery } from "./types";
import { Observable, firstValueFrom } from "rxjs";


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

  async metricFindQuery(query: VariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    // return Promise.resolve([
    //   {
    //     text: "v",
    //     value: 2
    //   }
    // ]);
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

    const dataframe = resp.data[0] as DataFrameSchema;
    const fields = dataframe.fields.filter(f => f.type === FieldType.string || f.type === FieldType.number);

    console.log(fields.map(f => ({
      text: f.name,
      // @ts-ignore
      value: f.values
    })));
    return fields.map(f => ({
      text: f.name,
      // @ts-ignore
      value: f.values,
      expandable: true

    }));
  }

  filterQuery(query: MongoQuery): boolean {
    return !!query.queryText && !!query.collection;
  }

  query(request: DataQueryRequest<MongoQuery>): Observable<DataQueryResponse> {
    console.log(request);
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

    return super.query({ ...request, targets: queries });
  }
}
