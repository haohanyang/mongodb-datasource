import { DataSourcePlugin } from '@grafana/data';
import { MongoDBDataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { QueryHelper } from './components/QueryHelper';
import { MongoDBQuery, MongoDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<MongoDBDataSource, MongoDBQuery, MongoDataSourceOptions>(MongoDBDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor)
  .setQueryEditorHelp(QueryHelper);
