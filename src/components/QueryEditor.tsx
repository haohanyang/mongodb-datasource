import React, { ChangeEvent, useRef, useState } from "react";
import { Button, CodeEditor, Divider, Field, InlineField, InlineFieldRow, InlineSwitch, Input, Select } from "@grafana/ui";
import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { DataSource } from "../datasource";
import { MongoDataSourceOptions, MongoQuery, QueryLanguage, QueryType, DEFAULT_QUERY } from "../types";
import { parseJsQuery, validateJsonQueryText } from "../utils";
import * as monacoType from "monaco-editor/esm/vs/editor/editor.api";

type Props = QueryEditorProps<DataSource, MongoQuery, MongoDataSourceOptions>;

const queryTypes: Array<SelectableValue<string>> = [
  {
    label: "Time series",
    value: QueryType.TIMESERIES
  },
  {
    label: "Table",
    value: QueryType.TABLE
  }
];


export function QueryEditor({ query, onChange }: Props) {

  const codeEditorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
  const [queryTextError, setQueryTextError] = useState<string | null>(null);

  const onQueryTextChange = (queryText: string) => {
    if (query.queryLanguage == QueryLanguage.JAVASCRIPT) {
      const { collection, error } = parseJsQuery(queryText);
      onChange({ ...query, collection: collection, queryText: queryText });
      setQueryTextError(error);
    } else {
      onChange({ ...query, queryText: queryText });
      const error = validateJsonQueryText(queryText);
      setQueryTextError(error);
    }
  };

  const onQueryLanguageChange = (e: React.FormEvent<HTMLInputElement>) => {
    if (e.currentTarget.checked) {
      onChange({ ...query, queryLanguage: QueryLanguage.JAVASCRIPT });

    } else {
      onChange({ ...query, queryLanguage: QueryLanguage.JSON });
    }
  };

  const onQueryTypeChange = (sv: SelectableValue<string>) => {
    onChange({ ...query, queryType: sv.value });
  };

  const onCollectionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, collection: event.target.value });
  };

  const onCodeEditorDidMount = (e: monacoType.editor.IStandaloneCodeEditor) => {
    codeEditorRef.current = e;
  };

  const onFormatQueryText = () => {
    if (codeEditorRef.current) {
      codeEditorRef.current.getAction("editor.action.formatDocument").run();
    }
  };

  if (!query.queryLanguage) {
    query.queryLanguage = DEFAULT_QUERY.queryLanguage;
  }

  return (
    <>
      <code>{query.queryText!.trim().replace(/(;$)/g, "").replace(/(\r\n|\n|\r)/gm, "")}</code>
      <InlineFieldRow>
        <InlineField label="Query Type">
          <Select id="query-editor-query-type" options={queryTypes} value={query.queryType || QueryType.TIMESERIES} onChange={onQueryTypeChange}></Select>
        </InlineField>
        {query.queryLanguage == QueryLanguage.JSON && <InlineField label="Collection" tooltip="Enter the collection to query"
          error="Please enter the collection" invalid={!query.collection}>
          <Input id="query-editor-collection" onChange={onCollectionChange} value={query.collection} required />
        </InlineField>}
      </InlineFieldRow>
      <Divider />
      <InlineField label="Use JavaScript Query">
        <InlineSwitch id="query-editor-use-js-query" value={query.queryLanguage == QueryLanguage.JAVASCRIPT} onChange={onQueryLanguageChange} />
      </InlineField>
      <Field label="Query Text" description={`Enter the Mongo Aggregation Pipeline (${query.queryLanguage == QueryLanguage.JSON ? "JSON" : "JavaScript"})`}
        error={queryTextError} invalid={queryTextError != null}>
        <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language={query.queryLanguage || ""}
          onBlur={onQueryTextChange} value={query.queryText || ""} showMiniMap={false} showLineNumbers={true} />
      </Field>
      <Button onClick={onFormatQueryText}>Format</Button>
    </>
  );
};
