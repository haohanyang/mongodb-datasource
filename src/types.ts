import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  queryText: string;
  collection: string;
  applyTimeRange: boolean;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  queryText: "{}",
  applyTimeRange: true,
  collection: ""
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

export const MongoDBAuthMethod = {
  NONE: "auth-none",
  USERNAME_PASSWORD: "auth-username-password"
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  password?: string;
}
