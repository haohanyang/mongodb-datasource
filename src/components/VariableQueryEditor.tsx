import React, { useState } from 'react';
import { VariableQuery } from '../types';
import { CodeEditor, Field, InlineField, Input, Button, Alert } from '@grafana/ui';

interface VariableQueryProps {
  query: VariableQuery;
  onChange: (query: VariableQuery, definition: string) => void;
}

export const VariableQueryEditor = ({ onChange, query }: VariableQueryProps) => {
  const [state, setState] = useState(query);

  const saveQuery = () => {
    onChange(state, `${state.collection} (${state.queryText})`);
  };

  const handleCollectionChange = (event: React.FormEvent<HTMLInputElement>) =>
    setState({
      ...state,
      collection: event.currentTarget.value,
    });

  const handleQueryTextChange = (text: string) =>
    setState({
      ...state,
      queryText: text,
    });

  return (
    <>
      <InlineField
        label="Collection"
        tooltip="Enter the MongoDB collection"
        error="Please enter the collection"
        invalid={!query.collection}
      >
        <Input name="collection" onChange={handleCollectionChange} value={state.collection}></Input>
      </InlineField>
      <Field label="Query Text" description="MongoDB aggregate (JSON)">
        <CodeEditor
          width="100%"
          height={300}
          language="json"
          onBlur={saveQuery}
          value={query.queryText || ''}
          showMiniMap={false}
          showLineNumbers={true}
          onChange={handleQueryTextChange}
          monacoOptions={{ fontSize: 14 }}
        />
      </Field>
      <Alert title="Query info" severity="info">
        The query result is expected to contain <code>value</code> field which has elements of type <code>string</code>{' '}
        or <code>number</code>
      </Alert>
      <Button onClick={saveQuery} variant="primary">
        Query
      </Button>
    </>
  );
};
