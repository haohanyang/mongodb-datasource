import { DataSourcePlugin } from "@grafana/data";
import { DataSource } from "./datasource";
import { ConfigEditor } from "./components/ConfigEditor";
import { QueryEditor } from "./components/QueryEditor";
import { QueryHelper } from "./components/QueryHelper";
import { VariableQueryEditor } from "./components/VariableQueryEditor";
import { MongoQuery, MongoDataSourceOptions } from "./types";

export const plugin = new DataSourcePlugin<DataSource, MongoQuery, MongoDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor)
  .setQueryEditorHelp(QueryHelper)
  .setVariableQueryEditor(VariableQueryEditor);
