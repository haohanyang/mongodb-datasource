import React, { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { Button, CodeEditor, Divider, Field, InlineField, InlineFieldRow, InlineSwitch, Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MongoDataSourceOptions, MongoQuery } from '../types';
import * as monacoType from 'monaco-editor/esm/vs/editor/editor.api';

type Props = QueryEditorProps<DataSource, MongoQuery, MongoDataSourceOptions>;

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
          setQueryTextError(null);
        }
        setQueryTextError("This is not a valid Mongo Aggregation Pipeline");
      } catch (e) {
        setQueryTextError("This is not a valid Mongo Aggregation Pipeline");
      }
    }
  };

  const onApplyTimeRangeChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, applyTimeRange: event.currentTarget.checked });
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

  const { queryText, collection, applyTimeRange } = query;

  return (
    <>
      <InlineFieldRow>
        <InlineField label="Collection" tooltip="Enter the collection to query"
          error="Please enter the collection" invalid={!collection}>
          <Input id="query-editor-collection" onChange={onCollectionChange} value={collection} required />
        </InlineField>
        <InlineField label="Apply time range" tooltip="Apply time range">
          <InlineSwitch id="query-editor-apply-time-range" value={applyTimeRange} onChange={onApplyTimeRangeChange} />
        </InlineField>
      </InlineFieldRow>
      <Divider />
      <Field label="Query Text" description="Enter the Mongo Aggregation Pipeline"
        error={queryTextError} invalid={!!queryTextError}>
        <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language="json"
          onBlur={onQueryTextChange} value={queryText || ""} />
      </Field>
      <Button onClick={onFormatQueryText}>Format</Button>
    </>
  );
};
