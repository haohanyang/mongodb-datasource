import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MongoDBQuery extends DataQuery {
  queryText?: string;
  collection?: string;
  queryType?: string;
  queryLanguage?: string;

  isStreaming?: boolean;

  // Aggregate options
  aggregateMaxTimeMS?: number;
  aggregateComment?: string;
  aggregateBatchSize?: number;
  aggregateAllowDiskUse?: boolean;
  aggregateMaxAwaitTime?: number;
  aggregateBypassDocumentValidation?: boolean;
}

export interface MongoDBVariableQuery extends DataQuery {
  queryText?: string;
  collection?: string;
}

export const QueryType = {
  TIMESERIES: 'timeseries',
  TABLE: 'table',
};

export const QueryLanguage = {
  JSON: 'json',
  JAVASCRIPT: 'javascript',
  JAVASCRIPT_SHADOW: 'javascriptShadow',
};

export const DEFAULT_QUERY: Partial<MongoDBQuery> = {
  queryText: '',
  queryType: QueryType.TABLE,
  queryLanguage: QueryLanguage.JSON,
  isStreaming: false,
};

export interface JsQueryResult {
  jsonQuery?: string;
  collection?: string;
  error: string | null;
}

export const MongoDBAuthMethod = {
  NONE: 'auth-none',
  USERNAME_PASSWORD: 'auth-username-password',
  TLS_SSL: 'auto-tls-ssl'
};

export const ConnectionStringScheme = {
  STANDARD: 'standard',
  DNS_SEED_LIST: 'dns_seed_list',
};


export interface MongoDataSourceOptions extends DataSourceJsonData {
  connectionStringScheme?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  connectionParameters?: string;
}

export interface MongoDataSourceSecureJsonData {
  password?: string;
  clientKeyPassword?: string;
}
