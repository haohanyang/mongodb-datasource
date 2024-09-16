import React, { ChangeEvent, FormEvent, useRef } from 'react';
import { Button, CodeEditor, Divider, Field, InlineField, InlineFieldRow, InlineSwitch, Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MongoDataSourceOptions, MongoQuery } from '../types';
import * as monacoType from 'monaco-editor/esm/vs/editor/editor.api';

type Props = QueryEditorProps<DataSource, MongoQuery, MongoDataSourceOptions>;

export function QueryEditor({ query, onChange }: Props) {

  const codeEditorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null)

  const onQueryTextChange = (queryText: string) => {
    onChange({ ...query, queryText: queryText });
  };

  const onApplyTimeRangeChange = (event: FormEvent<HTMLInputElement>) => {
    console.log("haha", event.currentTarget.checked)
    onChange({ ...query, applyTimeRange: event.currentTarget.checked });
  };

  const onCollectionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, collection: event.target.value });
  };

  const onCodeEditorDidMount = (e: monacoType.editor.IStandaloneCodeEditor) => {
    codeEditorRef.current = e
  }

  const onFormatQueryText = () => {
    if (codeEditorRef.current) {
      codeEditorRef.current.getAction('editor.action.formatDocument').run()
    }
  }

  const { queryText, collection, applyTimeRange } = query;

  return (
    <>
      <InlineFieldRow>
        <InlineField label="Collection" tooltip="Name of the collection">
          <Input id="query-editor-collection" onChange={onCollectionChange} value={collection} required />
        </InlineField>
        <InlineField label="Apply time range" tooltip="Apply time range">
          <InlineSwitch id="query-editor-apply-time-range" value={applyTimeRange} onChange={onApplyTimeRangeChange} />
        </InlineField>
      </InlineFieldRow>
      <Divider />
      <Field label="Query Text" description="MongoDB aggregation pipeline in JSON format.">
        <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language="json"
          onChange={onQueryTextChange} value={queryText || ""} />
      </Field>
      <Button onClick={onFormatQueryText}>Format</Button>
    </>
  );
}
