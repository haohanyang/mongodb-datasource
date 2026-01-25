import React from 'react';
import { InlineField, Alert, InlineFieldRow, SegmentAsync } from '@grafana/ui';
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

export const VariableQueryEditor = ({ onChange, query, onRunQuery, datasource }: VariableQueryEditorProps) => {
  return (
    <div>
      <InlineFieldRow style={{ justifyContent: 'space-between' }}>
        <InlineField
          label="Collection"
          error="Collection is required"
          invalid={!query.collection}
          tooltip="Name of MongoDB collection to query"
          transparent
        >
          <SegmentAsync
            id="query-editor-collection"
            placeholder="Enter your collection"
            allowEmptyValue={false}
            loadOptions={() => {
              return datasource.getCollectionNames().then((names) =>
                names.map((name) => ({
                  value: name,
                  label: name,
                })),
              );
            }}
            value={{ value: query.collection, label: query.collection }}
            onChange={(e) => {
              onChange({ ...query, collection: e.value });
            }}
            noOptionMessageHandler={(s) => {
              if (s.loading) {
                return 'Loading collections...';
              } else if (s.error) {
                return 'Failed to fetch collections';
              }
              return 'No collection found';
            }}
            allowCustomValue
          />
        </InlineField>
      </InlineFieldRow>
      <QueryEditorRaw
        query={query.queryText ?? ''}
        language="json"
        onBlur={(queryText) => onChange({ ...query, queryText: queryText })}
        height={300}
        fontSize={14}
      />
      <Alert title="Query info" severity="info" style={{ marginTop: 10 }}>
        <p>
          Write the query in JSON format. The query result is expected to contain <code>value</code> field which has
          elements of type <code>string</code> or <code>number</code>.
        </p>
        <p>
          The optional
          <code>text</code> field will be used as the display text of variables if exists.
        </p>
      </Alert>
    </div>
  );
};
