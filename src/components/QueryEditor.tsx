import React, { ChangeEvent, useRef, useState } from 'react';
import { Button, CodeEditor, Divider, Field, InlineField, InlineFieldRow, Input, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { MongoDataSourceOptions, MongoQuery, QueryType } from '../types';
import * as monacoType from 'monaco-editor/esm/vs/editor/editor.api';

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
    onChange({ ...query, queryText: queryText });
    if (!queryText) {
      setQueryTextError('Please enter the query');
    } else {
      try {
        const queryJson = JSON.parse(queryText);

        if (!Array.isArray(queryJson)) {
          setQueryTextError("Invalid query");
        } else {
          setQueryTextError(null);
        }
      } catch (e) {
        setQueryTextError("Invalid query");
      }
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
      codeEditorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const { queryText, collection, queryType } = query;

  return (
    <>
      <InlineFieldRow>
        <InlineField label="Query Type">
          <Select id="query-editor-query-type" options={queryTypes} value={queryType || QueryType.TIMESERIES} onChange={onQueryTypeChange}></Select>
        </InlineField>
        <InlineField label="Collection" tooltip="Enter the collection to query"
          error="Please enter the collection" invalid={!collection}>
          <Input id="query-editor-collection" onChange={onCollectionChange} value={collection} required />
        </InlineField>
      </InlineFieldRow>
      <Divider />
      <Field label="Query Text" description="Enter the Mongo Aggregation Pipeline"
        error={queryTextError} invalid={queryTextError != null}>
        <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language="json"
          onBlur={onQueryTextChange} value={queryText || ""} showMiniMap={false} />
      </Field>
      <Button onClick={onFormatQueryText}>Format</Button>
    </>
  );
};
