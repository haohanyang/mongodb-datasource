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
  NONE: 'none',
  USERNAME_PASSWORD: 'username-password',
  TLS_SSL: 'tls-ssl',
};

export const ConnectionStringScheme = {
  MONGODB: 'mongodb',
  MONGODBSRV: 'mongodb+srv',
};

export interface MongoDataSourceOptions extends DataSourceJsonData {
  // Connection settings
  connectionStringScheme?: string;
  host?: string;
  database?: string;
  connectionOptions?: string;
  // Authentication settings
  // Username/password auth
  username?: string;
  // TLS/SSL auth
  caCertPath?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  tlsInsecure?: boolean;
  tlsAllowInvalidHostnames?: boolean;
  tlsAllowInvalidCertificates?: boolean;
}

export interface MongoDataSourceSecureJsonData {
  password?: string;
  clientKeyPassword?: string;
}
