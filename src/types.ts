import { DataSourceJsonData, DateTime } from '@grafana/data';
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

  localFrom?: DateTime;
  localTo?: DateTime;
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
  TLS: 'auth-tls',
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
  caCertPath?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
}

export interface MongoDataSourceSecureJsonData {
  password?: string;
  clientKeyPassword?: string;
}
