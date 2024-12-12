import React, { ChangeEvent, useRef, useState } from "react";
import {
  ActionMeta,
  Button,
  CodeEditor,
  Divider,
  Field,
  InlineField,
  InlineFieldRow,
  Input,
  Select,

} from "@grafana/ui";
import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { DataSource } from "../datasource";
import { MongoDataSourceOptions, MongoQuery, QueryLanguage, QueryType, DEFAULT_QUERY } from "../types";
import { parseJsQuery, parseJsQueryLegacy, validateJsonQueryText, validateTimeout } from "../utils";
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


export function QueryEditor({ query, onChange, onRunQuery }: Props) {

  const codeEditorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
  const [queryTextError, setQueryTextError] = useState<string | null>(null);
  const [timeoutText, setTimeoutText] = useState<string>(query.timeout ? query.timeout.toString() : "");

  const optionsLanguage = [
    { label: "JSON", value: QueryLanguage.JSON },
    { label: "JavaScript", value: QueryLanguage.JAVASCRIPT, description: "javascript legacy" },
    { label: "JavaScriptShadow", value: QueryLanguage.JAVASCRIPT_SHADOW, description: "javascript with evaluation" }
  ];

  const onQueryTextChange = (queryText: string) => {
    if (query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW) {
      // parse the JavaScript query
      const { error, collection } = query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW ? parseJsQuery(queryText) : parseJsQueryLegacy(queryText);
      // let the same query text as it is
      onChange({ ...query, queryText: queryText, ...(collection ? { collection } : {}) });
      setQueryTextError(error);
      if (!error) {
        onRunQuery();
      }
    } else {
      onChange({ ...query, queryText: queryText });
      const error = validateJsonQueryText(queryText);
      if (!error) {
        onRunQuery();
      }
      setQueryTextError(error);
    }
  };

  const onQueryLanguageChange = (value: SelectableValue<string>, actionMeta: ActionMeta) => {
    onChange({ ...query, queryLanguage: value.value });
  };

  const onQueryTypeChange = (sv: SelectableValue<string>) => {
    onChange({ ...query, queryType: sv.value });
  };

  const onCollectionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, collection: event.target.value });
  };

  const onTimeoutChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTimeoutText(event.target.value);
    console.log(event.target.value);
    if (!event.target.value) {
      onChange({ ...query, timeout: undefined });
    } else if (validateTimeout(event.target.value)) {
      onChange({ ...query, timeout: parseInt(event.target.value, 10) });
    }
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
      <InlineFieldRow>
        <InlineField label="Query Type">
          <Select id="query-editor-query-type" options={queryTypes} value={query.queryType || QueryType.TIMESERIES} onChange={onQueryTypeChange}></Select>
        </InlineField>
        <InlineField label="Collection" tooltip="Enter the collection to query"
          error="Please enter the collection" invalid={!query.collection}>
          <Input id="query-editor-collection" onChange={onCollectionChange} value={query.collection} required />
        </InlineField>
        <InlineField label="Timeout" tooltip="(Optional) The maximum amount of time (in milisecond) that the query can run on the server."
          error="Invalid timeout" invalid={timeoutText !== "" && !validateTimeout(timeoutText)}>
          <Input id="query-editor-timeout" onChange={onTimeoutChange} value={timeoutText} />
        </InlineField>
      </InlineFieldRow>
      <Divider />
      <InlineField label="Query language">
        <Select id="query-editor-use-js-query" onChange={onQueryLanguageChange} options={optionsLanguage} value={query.queryLanguage} />
      </InlineField>
      <Field label="Query Text" description={`Enter the Mongo Aggregation Pipeline (${query.queryLanguage})`}
        error={queryTextError} invalid={queryTextError != null}>
        <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language={query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW ? "javascript" : "json"}
          onBlur={onQueryTextChange} value={query.queryText || ""} showMiniMap={false} showLineNumbers={true} monacoOptions={{ fontSize: 14 }} />
      </Field>
      <Button onClick={onFormatQueryText}>Format</Button>
    </>
  );
};
