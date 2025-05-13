import React, { useState } from 'react';
import { VariableQuery } from '../types';
import { InlineField, Input, Alert, InlineFieldRow, Button } from '@grafana/ui';
import { QueryEditorRaw } from './QueryEditorRaw';

interface VariableQueryProps {
  query: VariableQuery;
  onChange: (query: VariableQuery, definition: string) => void;
}

export const VariableQueryEditor = ({ onChange, query }: VariableQueryProps) => {
  const [state, setState] = useState(query);
  return (
    <>
      <InlineFieldRow>
        <InlineField
          label="Collection"
          tooltip="Name of MongoDB collection to query"
          error="Collection is required"
          invalid={!state.collection}
        >
          <Input
            name="collection"
            onChange={(evt) => setState({ ...state, collection: evt.currentTarget.value })}
            value={state.collection}
          ></Input>
        </InlineField>
        <Button
          onClick={() => {
            onChange(
              { queryText: state.queryText, collection: state.collection },
              `${state.collection} (${state.queryText})`,
            );
          }}
        >
          Save and Query
        </Button>
      </InlineFieldRow>

      <QueryEditorRaw
        query={query.queryText ?? ''}
        language="json"
        onBlur={(queryText) => setState({ ...query, queryText: queryText })}
        height={300}
        fontSize={14}
      />
      <Alert title="Query info" severity="info" style={{ marginTop: 2 }}>
        The query result is expected to contain <code>value</code> field which has elements of type <code>string</code>{' '}
        or <code>number</code>
      </Alert>
    </>
  );
};
