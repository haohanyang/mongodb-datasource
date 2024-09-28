import React, { ChangeEvent, useRef, useState } from "react";
import { Button, CodeEditor, Divider, Field, InlineField, InlineFieldRow, InlineSwitch, Input, Select } from "@grafana/ui";
import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { DataSource } from "../datasource";
import { MongoDataSourceOptions, MongoQuery, QueryType } from "../types";
import { validateQueryText } from "../utils";
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
  const [jsQueryMode, setJsQueryMode] = useState<boolean>(false);
  const [jsQueryText, setJsQueryText] = useState<string>("");
  const [jsQueryError, setJsQueryError] = useState<string | null>(null);

  const onQueryTextChange = (queryText: string) => {
    onChange({ ...query, queryText: queryText });
    const error = validateQueryText(queryText);
    setQueryTextError(error);
  };

  const onJsQueryTextChange = (jsQueryText: string) => {
    setJsQueryText(jsQueryText);
    const regex = /db\.(.+)\.aggregate\((.+)\)$/;
    const match = jsQueryText.trim().replace(/(;$)/g, "").replace(/(\r\n|\n|\r)/gm, "")
      .match(regex);

    if (match) {
      const collection = match[1];
      const queryText = match[2];
      onChange({ ...query, queryText: queryText, collection: collection });
      const error = validateQueryText(queryText);
      setJsQueryError(error);
    } else {
      setJsQueryError("Invalid query");
    }
  };

  const onToggleJSQueryMode = (e: React.FormEvent<HTMLInputElement>) => {
    setJsQueryMode(e.currentTarget.checked);
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

  return (
    <>
      <InlineFieldRow>
        <InlineField label="Query Type">
          <Select id="query-editor-query-type" options={queryTypes} value={query.queryType || QueryType.TIMESERIES} onChange={onQueryTypeChange}></Select>
        </InlineField>
        {!jsQueryMode && <InlineField label="Collection" tooltip="Enter the collection to query"
          error="Please enter the collection" invalid={!query.collection}>
          <Input id="query-editor-collection" onChange={onCollectionChange} value={query.collection} required />
        </InlineField>}
      </InlineFieldRow>
      <Divider />
      <InlineField label="Use JavaScript Query">
        <InlineSwitch id="query-editor-use-js-query" value={jsQueryMode} onChange={onToggleJSQueryMode} />
      </InlineField>
      {jsQueryMode ?
        <Field label="Query Text" description="Enter the Mongo Aggregation Pipeline (JavaScript)"
          error={jsQueryError} invalid={jsQueryError != null}>
          <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language="javascript"
            onBlur={onJsQueryTextChange} value={jsQueryText || ""} showMiniMap={false} showLineNumbers={true} />
        </Field> : <Field label="Query Text" description="Enter the Mongo Aggregation Pipeline (JSON)"
          error={queryTextError} invalid={queryTextError != null}>
          <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language="json"
            onBlur={onQueryTextChange} value={query.queryText || ""} showMiniMap={false} showLineNumbers={true} />
        </Field>}
      <Button onClick={onFormatQueryText}>Format</Button>
    </>
  );
};
