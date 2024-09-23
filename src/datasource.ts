import { DataSourceInstanceSettings, CoreApp, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { MongoQuery, MongoDataSourceOptions, DEFAULT_QUERY } from './types';

function isJsonStringValid(jsonString: string) {
  try {
    const json = JSON.parse(jsonString);
    if (!Array.isArray(json)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
  return true;
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
}
