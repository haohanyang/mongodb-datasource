import React from 'react';
import { InlineField, Input, Alert, Button, InlineFieldRow } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { MongoDataSourceOptions, MongoDBQuery, MongoDBVariableQuery } from '../types';
import { QueryEditorRaw } from './QueryEditorRaw';
import { MongoDBDataSource } from 'datasource';

export type VariableQueryEditorProps = QueryEditorProps<
  MongoDBDataSource,
  MongoDBQuery,
  MongoDataSourceOptions,
  MongoDBVariableQuery
>;

export const VariableQueryEditor = ({ onChange, query, onRunQuery }: VariableQueryEditorProps) => {
  return (
    <div>
      <InlineFieldRow style={{ justifyContent: 'space-between' }}>
        <InlineField
          label="Collection"
          tooltip="Name of MongoDB collection to query"
          error="Collection is required"
          invalid={!query.collection}
        >
          <Input
            name="collection"
            onChange={(evt) => onChange({ ...query, collection: evt.currentTarget.value })}
            value={query.collection}
          ></Input>
        </InlineField>
        <Button icon="play" variant="primary" size="sm" onClick={onRunQuery}>
          Save and Query
        </Button>
      </InlineFieldRow>
      <QueryEditorRaw
        query={query.queryText ?? ''}
        language="json"
        onBlur={(queryText) => onChange({ ...query, queryText })}
        height={300}
        fontSize={14}
      />
      <Alert title="Query info" severity="info" style={{ marginTop: 2 }}>
        The query result is expected to contain <code>value</code> field which has elements of type <code>string</code>{' '}
        or <code>number</code>
      </Alert>
    </div>
  );
};
