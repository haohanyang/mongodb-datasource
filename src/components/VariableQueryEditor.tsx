import React, { useEffect, useState } from 'react';
import { InlineField, Input, Alert, Button, InlineFieldRow } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { MongoDataSourceOptions, MongoDBQuery, MongoDBVariableQuery, QueryType } from '../types';
import { QueryEditorRaw } from './QueryEditorRaw';
import { MongoDBDataSource } from 'datasource';

const refId = 'MongoDBVariableQueryEditor-VariableQuery';

export type VariableQueryEditorProps = QueryEditorProps<
  MongoDBDataSource,
  MongoDBQuery,
  MongoDataSourceOptions,
  MongoDBVariableQuery
>;

export const VariableQueryEditor = ({ onChange, query }: VariableQueryEditorProps) => {
  const [collection, setCollection] = useState('');
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    setCollection(query.collection ?? '');
    setQueryText(query.queryText ?? '');
  }, [query]);

  return (
    <div>
      <InlineFieldRow style={{ justifyContent: 'space-between' }}>
        <InlineField
          label="Collection"
          tooltip="Name of MongoDB collection to query"
          error="Collection is required"
          invalid={!collection}
        >
          <Input
            name="collection"
            onChange={(evt) => {
              setCollection(evt.currentTarget.value);
            }}
            value={collection}
          ></Input>
        </InlineField>
        <Button
          icon="play"
          variant="primary"
          size="sm"
          onClick={() =>
            onChange({ queryText: queryText, queryType: QueryType.TABLE, refId: refId, collection: collection })
          }
        >
          Save and Query
        </Button>
      </InlineFieldRow>
      <QueryEditorRaw
        query={queryText}
        language="json"
        onBlur={(queryText) => setQueryText(queryText)}
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
