import { DataSourceInstanceSettings, CoreApp, ScopedVars, DataQueryRequest, DataQueryResponse, DateTime } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY } from './types';
import { Observable } from 'rxjs';

function isJsonStringValid(jsonString: string) {
  try {
    JSON.parse(jsonString);
  } catch (e) {
    return false;
  }
  return true;
}

function datetimeToJson(datetime: DateTime) {
  return JSON.stringify({
    $date: datetime.toISOString()
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
    return !!query.queryText && !!query.collection && isJsonStringValid(query.queryText!);
  }

  query(request: DataQueryRequest<MongoQuery>): Observable<DataQueryResponse> {
    const queries = request.targets.map(query => {
      if (query.applyTimeRange) {
        return {
          ...query,
          queryText: query.queryText?.replaceAll(/"\$from"/g, datetimeToJson(request.range.from))
            .replaceAll(/"\$to"/g, datetimeToJson(request.range.to))
        };
      }
      return query;
    });

    return super.query({ ...request, targets: queries });
  }
}