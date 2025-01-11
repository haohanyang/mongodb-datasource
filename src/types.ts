import { DataSourceJsonData } from "@grafana/data";
import { DataQuery } from "@grafana/schema";

export interface MongoQuery extends DataQuery {
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

export const QueryType = {
  TIMESERIES: "timeseries",
  TABLE: "table"
};

export const QueryLanguage = {
  JSON: "json",
  JAVASCRIPT: "javascript",
  JAVASCRIPT_SHADOW: "javascriptShadow"
};


export const DEFAULT_QUERY: Partial<MongoQuery> = {
  queryText: "",
  queryType: QueryType.TABLE,
  queryLanguage: QueryLanguage.JSON,
  isStreaming: false
};


export interface JsQueryResult {
  jsonQuery?: string;
  collection?: string;
  error: string | null;
}


export const MongoDBAuthMethod = {
  NONE: "auth-none",
  USERNAME_PASSWORD: "auth-username-password"
};

export const ConnectionStringScheme = {
  STANDARD: "standard",
  DNS_SEED_LIST: "dns_seed_list"
};

export interface VariableQuery {
  collection?: string;
  queryText?: string;
}

/**
 * These are options configured for each DataSource instance
 */
export interface MongoDataSourceOptions extends DataSourceJsonData {
  connectionStringScheme?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  connectionParameters?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  password?: string;
}

