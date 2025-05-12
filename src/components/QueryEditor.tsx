import React from 'react';
import { ChangeEvent, FormEventHandler, useState } from 'react';
import {
  Field,
  Button,
  InlineField,
  InlineFieldRow,
  Input,
  ControlledCollapse,
  InlineSwitch,
  Stack,
  FeatureBadge,
  Switch,
  Modal,
  useTheme2,
  Tooltip,
} from '@grafana/ui';
import { EditorHeader, InlineSelect, FlexItem } from '@grafana/plugin-ui';
import { CoreApp, FeatureState, QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { MongoDataSourceOptions, MongoQuery, QueryLanguage, QueryType, DEFAULT_QUERY } from '../types';
import { parseJsQuery, parseJsQueryLegacy, validateJsonQueryText, validatePositiveNumber } from '../utils';
import { QueryEditorRaw } from './QueryEditorRaw';
import { QueryToolbox } from './QueryToolbox';
import validator from 'validator';
import './QueryEditor.css';

type Props = QueryEditorProps<DataSource, MongoQuery, MongoDataSourceOptions>;

const queryTypes: Array<SelectableValue<string>> = [
  {
    label: 'Time series',
    value: QueryType.TIMESERIES,
    icon: 'chart-line',
  },
  {
    label: 'Table',
    value: QueryType.TABLE,
    icon: 'table',
  },
];

const languageOptions: Array<SelectableValue<string>> = [
  { label: 'JSON', value: QueryLanguage.JSON },
  { label: 'JavaScript', value: QueryLanguage.JAVASCRIPT, description: 'JavaScript Legacy' },
  { label: 'JavaScript Shadow', value: QueryLanguage.JAVASCRIPT_SHADOW, description: 'JavaScript with Evaluation' },
];

export function QueryEditor(props: Props) {
  const { query, onChange, app, onRunQuery } = props;

  const theme = useTheme2();

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isAggregateOptionExpanded, setIsAggregateOptionExpanded] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const addValidationError = (field: string, message: string) => {
    setValidationErrors((prev) => ({ ...prev, [field]: message }));
  };

  const removeValidationError = (field: string) => {
    setValidationErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  const renderRunButton = (isQueryRunnable: boolean) => {
    if (isQueryRunnable) {
      return (
        <Button icon="play" variant="primary" size="sm" onClick={() => onRunQuery()}>
          Run query
        </Button>
      );
    }
    return (
      <Tooltip theme="error" content={<>Your query is invalid. Check below for details.</>} placement="top">
        <Button icon="exclamation-triangle" variant="secondary" size="sm" onClick={onRunQuery}>
          Run query
        </Button>
      </Tooltip>
    );
  };

  const renderCodeEditor = (showTools: boolean, width?: number, height?: number) => {
    return (
      <>
        {!isEditorExpanded && (
          <EditorHeader>
            <InlineSelect
              label="Format"
              value={query.queryType}
              placeholder="Select format"
              menuShouldPortal
              onChange={(val) => onChange({ ...query, queryType: val.value })}
              options={queryTypes}
            />
            <InlineSelect
              id="query-editor-query-language"
              label="Language"
              placeholder="Select query language"
              options={languageOptions}
              value={query.queryLanguage}
              onChange={(val) => props.onChange({ ...query, queryLanguage: val.value })}
            />
            <FlexItem grow={1} />
            {renderRunButton(true)}
          </EditorHeader>
        )}
        <QueryEditorRaw
          query={query.queryText || ''}
          language={
            query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW
              ? 'javascript'
              : 'json'
          }
          onBlur={onQueryTextChange}
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
                error={validationErrors['query']}
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

  const onQueryTextChange = (queryText: string) => {
    if (query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW) {
      // parse the JavaScript query
      const { error, collection } =
        query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW
          ? parseJsQuery(queryText)
          : parseJsQueryLegacy(queryText);
      // let the same query text as it is
      onChange({ ...query, queryText: queryText, ...(collection ? { collection } : {}) });
      addValidationError('query', error || '');
    } else {
      onChange({ ...query, queryText: queryText });
      const error = validateJsonQueryText(queryText);
      addValidationError('query', error || '');
    }
  };

  const onCollectionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, collection: event.target.value });
  };

  const onMaxTimeMSChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMaxTimeMSText(event.target.value);

    if (!event.target.value) {
      onChange({ ...query, aggregateMaxTimeMS: undefined });
    } else if (validatePositiveNumber(event.target.value)) {
      onChange({ ...query, aggregateMaxTimeMS: parseInt(event.target.value, 10) });
    }
  };

  const onMaxAwaitTimeMSChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMaxAwaitTimeMSText(event.target.value);
    if (!event.target.value) {
      onChange({ ...query, aggregateMaxAwaitTime: undefined });
    } else if (validatePositiveNumber(event.target.value)) {
      onChange({ ...query, aggregateMaxAwaitTime: parseInt(event.target.value, 10) });
    }
  };

  const onAllowDiskUseChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...query,
      aggregateAllowDiskUse: event.target.checked,
    });
  };

  const onBatchSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBatchSizeText(event.target.value);
    if (!event.target.value) {
      onChange({ ...query, aggregateBatchSize: undefined });
    } else if (validatePositiveNumber(event.target.value)) {
      onChange({ ...query, aggregateBatchSize: parseInt(event.target.value, 10) });
    }
  };

  const onBypassDocumentValidationChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, aggregateBypassDocumentValidation: event.target.checked });
  };

  const onCommentChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, aggregateComment: event.target.value });
  };

  const onIsStreamingChange: FormEventHandler<HTMLInputElement> = (e) => {
    onChange({ ...query, isStreaming: e.currentTarget.checked });
  };

  if (!query.queryLanguage) {
    query.queryLanguage = DEFAULT_QUERY.queryLanguage;
  }

  return (
    <>
      {app !== CoreApp.Explore && (
        <div className="query-editor-collection-streaming-container">
          <Field
            className="query-editor-collection-streaming-field"
            label={
              <>
                <Stack direction="row" gap={1} alignItems="center">
                  <div className="field-label">Streaming</div>
                  <FeatureBadge featureState={FeatureState.experimental} />
                </Stack>
              </>
            }
            horizontal={true}
          >
            <Switch
              id="query-editor-collection-streaming"
              value={query.isStreaming === true}
              onChange={onIsStreamingChange}
            />
          </Field>
          <div className="field-description">Watch MongoDB Change Streams</div>
        </div>
      )}

      <InlineFieldRow>
        <InlineField
          label="Collection"
          error="Collection is required"
          invalid={query.queryLanguage !== QueryLanguage.JAVASCRIPT && !query.collection}
          tooltip="Name of the MongoDB collection to query"
        >
          <Input
            width={25}
            id="query-editor-collection"
            onChange={onCollectionChange}
            value={query.collection}
            disabled={query.queryLanguage === QueryLanguage.JAVASCRIPT}
          />
        </InlineField>
      </InlineFieldRow>
      {isEditorExpanded ? renderPlaceholder() : renderCodeEditor(true, undefined, 300)}

      <ControlledCollapse
        label="Aggregate Options"
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
              onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                if (!evt.target.value) {
                  onChange({ ...query, aggregateMaxTimeMS: undefined });
                } else if (validator.isInt(evt.target.value, { gt: 1 })) {
                  onChange({ ...query, aggregateMaxTimeMS: parseInt(evt.target.value, 10) });
                }
              }}
              value={query.aggregateMaxTimeMS}
            />
          </InlineField>
          <InlineField
            label="Max await time(ms)"
            tooltip="The maximum amount of time that the server should wait for new documents to satisfy a tailable cursor query."
          >
            <Input id="query-editor-max-await-time-ms" onChange={onMaxAwaitTimeMSChange} value={maxAwaitTimeMSText} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField
            label="Comment"
            tooltip="A string that will be included in server logs, profiling logs, and currentOp queries to help trace the operation."
          >
            <Input id="query-editor-comment" onChange={onCommentChange} value={query.aggregateComment} />
          </InlineField>
          <InlineField
            label="Batch size"
            tooltip="The maximum number of documents to be included in each batch returned by the server."
            error="Invalid batch size"
            invalid={batchSizeText !== '' && !validatePositiveNumber(batchSizeText)}
          >
            <Input id="query-editor-batch-size" onChange={onBatchSizeChange} value={batchSizeText} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField
            label="Allow disk use"
            tooltip="If true, the operation can write to temporary files in the _tmp subdirectory of the database directory path on the server. The default value is false."
          >
            <InlineSwitch
              id="query-editor-allow-disk-use"
              onChange={onAllowDiskUseChange}
              value={query.aggregateAllowDiskUse}
            />
          </InlineField>
          <InlineField
            label="Bypass document validation"
            tooltip="If true, writes executed as part of the operation will opt out of document-level validation on the server. This option is valid for MongoDB versions >= 3.2 and is ignored for previous server versions. The default value is false."
          >
            <InlineSwitch
              id="query-editor-bypass-document-validation"
              onChange={onBypassDocumentValidationChange}
              value={query.aggregateBypassDocumentValidation}
            />
          </InlineField>
        </InlineFieldRow>
      </ControlledCollapse>
      {isEditorExpanded && (
        <Modal title="Query Text" isOpen={isEditorExpanded} onDismiss={() => setIsEditorExpanded(false)}>
          {renderCodeEditor(true, undefined, 500)}
        </Modal>
      )}
    </>
  );
}
