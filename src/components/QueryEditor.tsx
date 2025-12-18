import React, { ChangeEvent, useState } from 'react';
import {
  Button,
  InlineField,
  InlineFieldRow,
  Input,
  ControlledCollapse,
  InlineSwitch,
  Modal,
  useTheme2,
  SegmentAsync,
} from '@grafana/ui';
import { EditorHeader, InlineSelect, FlexItem } from '@grafana/plugin-ui';
import { QueryEditorProps, SelectableValue, LoadingState } from '@grafana/data';
import { EJSON } from 'bson';
import { parseFilter } from 'mongodb-query-parser';
import { MongoDBDataSource } from '../datasource';
import { MongoDataSourceOptions, MongoDBQuery, QueryLanguage } from '../types';
import { QueryEditorRaw } from './QueryEditorRaw';
import { QueryToolbox } from './QueryToolbox';
import validator from 'validator';

type Props = QueryEditorProps<MongoDBDataSource, MongoDBQuery, MongoDataSourceOptions>;

const languageOptions: Array<SelectableValue<string>> = [
  { label: 'JSON', value: QueryLanguage.JSON },
  { label: 'JavaScript', value: QueryLanguage.JAVASCRIPT },
];

export function QueryEditor(props: Props) {
  const { query, data, onRunQuery } = props;

  const theme = useTheme2();

  const [queryTextError, setQueryTextError] = useState<string | undefined>(undefined);
  const [parsedQuery, setParsedQuery] = useState<string>('');
  const [isAggregateOptionExpanded, setIsAggregateOptionExpanded] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const renderCodeEditor = (showTools: boolean, width?: number, height?: number) => {
    return (
      <>
        {!isEditorExpanded && (
          <EditorHeader>
            <InlineSelect
              id="query-editor-query-language"
              label="Language"
              placeholder="Select query language"
              options={languageOptions}
              value={query.queryLanguage === QueryLanguage.JAVASCRIPT ? QueryLanguage.JAVASCRIPT : QueryLanguage.JSON}
              onChange={(val) => props.onChange({ ...query, queryLanguage: val.value })}
            />
            <FlexItem grow={1} />
            {
              <Button
                icon="play"
                variant="primary"
                size="sm"
                onClick={onRunQuery}
                disabled={data?.state === LoadingState.Loading}
              >
                Run query
              </Button>
            }
          </EditorHeader>
        )}
        <QueryEditorRaw
          query={query.queryText ?? ''}
          language={query.queryLanguage === QueryLanguage.JAVASCRIPT ? QueryLanguage.JAVASCRIPT : QueryLanguage.JSON}
          onBlur={(queryText: string) => {
            props.onChange({ ...query, queryText });
            if (query.queryLanguage === QueryLanguage.JSON) {
              if (!validator.isJSON(queryText)) {
                setQueryTextError('Query should be a valid JSON');
              } else {
                setQueryTextError(undefined);
              }
            } else {
              try {
                const parsed = EJSON.stringify(parseFilter(queryText));
                setParsedQuery(parsed);
                setQueryTextError(undefined);
              } catch (e) {
                setParsedQuery((e as Error).toString());
                setQueryTextError(`Query should be a valid JavaScript: ${(e as Error).message}`);
              }
            }
          }}
          width={width}
          height={height}
          fontSize={14}
        >
          {({ formatQuery }) => {
            return (
              <QueryToolbox
                isExpanded={isEditorExpanded}
                onExpand={setIsEditorExpanded}
                onFormatCode={formatQuery}
                showTools={showTools}
                error={queryTextError}
              />
            );
          }}
        </QueryEditorRaw>
      </>
    );
  };

  const renderPlaceholder = () => {
    return (
      <div
        style={{
          background: theme.colors.background.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Editing in expanded code editor
      </div>
    );
  };

  return (
    <>
      <InlineFieldRow>
        <InlineField
          label="Collection"
          error="Collection is required"
          invalid={!query.collection}
          tooltip="Name of MongoDB collection to query"
        >
          <SegmentAsync
            id="query-editor-collection"
            placeholder="Enter your collection"
            allowEmptyValue={false}
            loadOptions={() => {
              return props.datasource.getCollectionNames().then((names) => {
                return names.map((name) => ({
                  value: name,
                  label: name,
                }));
              });
            }}
            value={{ value: query.collection, label: query.collection }}
            onChange={(e) => {
              props.onChange({ ...query, collection: e.value });
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
      {isEditorExpanded ? renderPlaceholder() : renderCodeEditor(true, undefined, 300)}

      <ControlledCollapse
        label="Aggregate options"
        isOpen={isAggregateOptionExpanded}
        onToggle={() => setIsAggregateOptionExpanded(!isAggregateOptionExpanded)}
      >
        <InlineFieldRow>
          <InlineField
            label="Max time(ms)"
            tooltip="The maximum amount of time that the query can run on the server. The default value is nil, meaning that there is no time limit for query execution."
          >
            <Input
              id="query-editor-max-time-ms"
              value={query.aggregateMaxTimeMS}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                if (!evt.target.value) {
                  props.onChange({ ...query, aggregateMaxTimeMS: undefined });
                } else if (validator.isInt(evt.target.value, { gt: 0 })) {
                  props.onChange({ ...query, aggregateMaxTimeMS: parseInt(evt.target.value, 10) });
                }
              }}
            />
          </InlineField>
          <InlineField
            label="Max await time(ms)"
            tooltip="The maximum amount of time that the server should wait for new documents to satisfy a tailable cursor query."
          >
            <Input
              id="query-editor-max-await-time-ms"
              value={query.aggregateMaxAwaitTime}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                if (!evt.target.value) {
                  props.onChange({ ...query, aggregateMaxAwaitTime: undefined });
                } else if (validator.isInt(evt.target.value, { gt: 0 })) {
                  props.onChange({ ...query, aggregateMaxAwaitTime: parseInt(evt.target.value, 10) });
                }
              }}
            />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField
            label="Comment"
            tooltip="A string that will be included in server logs, profiling logs, and currentOp queries to help trace the operation."
          >
            <Input
              id="query-editor-comment"
              value={query.aggregateComment}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                if (evt.target.value) {
                  props.onChange({ ...query, aggregateComment: evt.target.value });
                }
              }}
            />
          </InlineField>
          <InlineField
            label="Batch size"
            tooltip="The maximum number of documents to be included in each batch returned by the server."
          >
            <Input
              id="query-editor-batch-size"
              value={query.aggregateBatchSize}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                if (validator.isInt(evt.target.value, { gt: 0 })) {
                  props.onChange({ ...query, aggregateBatchSize: parseInt(evt.target.value, 10) });
                }
              }}
            />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField
            label="Allow disk use"
            tooltip="If true, the operation can write to temporary files in the _tmp subdirectory of the database directory path on the server. The default value is false."
          >
            <InlineSwitch
              id="query-editor-allow-disk-use"
              value={query.aggregateAllowDiskUse}
              onChange={(evt: ChangeEvent<HTMLInputElement>) =>
                props.onChange({ ...query, aggregateAllowDiskUse: evt.target.checked })
              }
            />
          </InlineField>
          <InlineField
            label="Bypass document validation"
            tooltip="If true, writes executed as part of the operation will opt out of document-level validation on the server. This option is valid for MongoDB versions >= 3.2 and is ignored for previous server versions. The default value is false."
          >
            <InlineSwitch
              id="query-editor-bypass-document-validation"
              value={query.aggregateBypassDocumentValidation}
              onChange={(evt: ChangeEvent<HTMLInputElement>) =>
                props.onChange({ ...query, aggregateBypassDocumentValidation: evt.target.checked })
              }
            />
          </InlineField>
        </InlineFieldRow>
      </ControlledCollapse>
      {process.env.NODE_ENV === 'development' && query.queryLanguage === QueryLanguage.JAVASCRIPT && (
        <code>{parsedQuery}</code>
      )}
      {isEditorExpanded && (
        <Modal title="Query Text" isOpen={isEditorExpanded} onDismiss={() => setIsEditorExpanded(false)}>
          {renderCodeEditor(true, undefined, 500)}
        </Modal>
      )}
    </>
  );
}
