import React, { ChangeEvent, FormEvent, useRef } from 'react';
import { Button, CodeEditor, Divider, Field, InlineField, InlineFieldRow, InlineSwitch, Input, Stack, Switch, TextArea } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import * as monacoType from 'monaco-editor/esm/vs/editor/editor.api';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {

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
        <InlineField label="Collection" tooltip="Name of the collection" required invalid={collection == ""}>
          <Input id="query-editor-collection" onChange={onCollectionChange} value={collection} />
        </InlineField>
        <InlineField label="Apply time range" tooltip="Apply time range">
          <InlineSwitch id="query-editor-apply-time-range" value={applyTimeRange} onChange={onApplyTimeRangeChange} />
        </InlineField>
      </InlineFieldRow>
      <Divider />
      <Field label="Query text" description="MongoDB aggregation pipeline in JSON format." required invalid={queryText == ""}>
        <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language="json" onChange={onQueryTextChange} value={queryText} />
      </Field>
      <Stack>
        <Button onClick={onFormatQueryText}>Format</Button>
        <Button onClick={onRunQuery} disabled={collection == "" || queryText == ""}>Query</Button>
      </Stack>
    </>
  );
}
