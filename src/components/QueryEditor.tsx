import React, { ChangeEvent } from 'react';
import { Field, InlineField, Input, Stack, TextArea } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, queryText: event.target.value });
  };

  const onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, collection: event.target.value });
    // executes the query
    onRunQuery();
  };

  const { queryText, collection } = query;

  return (
    <Stack>
      <InlineField label="Collection">
        <Input
          id="query-editor-collection"
          onChange={onConstantChange}
          value={collection}
          width={8}
          required
        />
      </InlineField>
      <Field label="Query" description="Mongo aggregate query. Json format.">
        <TextArea width={40} id="query-editor-query-text" onChange={onQueryTextChange} value={queryText || ''} required></TextArea>
      </Field>
    </Stack>
  );
}
