import React, { ChangeEvent, FormEventHandler, useRef, useState } from "react";
import {
  Button,
  CodeEditor,
  Field,
  InlineField,
  InlineFieldRow,
  Input,
  Select,
  ControlledCollapse,
  InlineSwitch,
  RadioButtonGroup,
  Stack,
  FeatureBadge,
  Switch
} from "@grafana/ui";
import { CoreApp, FeatureState, QueryEditorProps, SelectableValue } from "@grafana/data";
import { DataSource } from "../datasource";
import { MongoDataSourceOptions, MongoQuery, QueryLanguage, QueryType, DEFAULT_QUERY } from "../types";
import { parseJsQuery, parseJsQueryLegacy, validateJsonQueryText, validatePositiveNumber } from "../utils";
import * as monacoType from "monaco-editor/esm/vs/editor/editor.api";

type Props = QueryEditorProps<DataSource, MongoQuery, MongoDataSourceOptions>;

const queryTypes: Array<SelectableValue<string>> = [
  {
    label: "Time series",
    value: QueryType.TIMESERIES,
    icon: "chart-line"
  },
  {
    label: "Data Table",
    value: QueryType.TABLE,
    icon: "table"
  }
];

const languageOptions: Array<SelectableValue<string>> = [
  { label: "JSON", value: QueryLanguage.JSON },
  { label: "JavaScript", value: QueryLanguage.JAVASCRIPT, description: "JavaScript Legacy" },
  { label: "JavaScript Shadow", value: QueryLanguage.JAVASCRIPT_SHADOW, description: "JavaScript with Evaluation" }
];


export function QueryEditor({ query, onChange, app }: Props) {

  const codeEditorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
  const [queryTextError, setQueryTextError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [maxTimeMSText, setMaxTimeMSText] = useState<string>(query.aggregateMaxTimeMS ? query.aggregateMaxTimeMS.toString() : "");
  const [maxAwaitTimeMSText, setMaxAwaitTimeMSText] = useState<string>(query.aggregateMaxAwaitTime ? query.aggregateMaxAwaitTime.toString() : "");
  const [batchSizeText, setBatchSizeText] = useState<string>(query.aggregateBatchSize ? query.aggregateBatchSize.toString() : "");

  const onQueryTextChange = (queryText: string) => {
    if (query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW) {
      // parse the JavaScript query
      const { error, collection } = query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW ? parseJsQuery(queryText) : parseJsQueryLegacy(queryText);
      // let the same query text as it is
      onChange({ ...query, queryText: queryText, ...(collection ? { collection } : {}) });
      setQueryTextError(error);
    } else {
      onChange({ ...query, queryText: queryText });
      const error = validateJsonQueryText(queryText);
      setQueryTextError(error);
    }
  };

  const onQueryLanguageChange = (value: SelectableValue<string>) => {
    onChange({ ...query, queryLanguage: value.value });
  };

  const onQueryTypeChange = (value: string) => {
    onChange({ ...query, queryType: value });
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
      ...query, aggregateAllowDiskUse: event.target.checked
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

  const onCodeEditorDidMount = (e: monacoType.editor.IStandaloneCodeEditor) => {
    codeEditorRef.current = e;
  };

  const onFormatQueryText = () => {
    if (codeEditorRef.current) {
      codeEditorRef.current.getAction("editor.action.formatDocument").run();
    }
  };

  const onIsStreamingChange: FormEventHandler<HTMLInputElement> = e => {
    onChange({ ...query, isStreaming: e.currentTarget.checked });
  };

  if (!query.queryLanguage) {
    query.queryLanguage = DEFAULT_QUERY.queryLanguage;
  }

  return (
    <>
      <Field label="Query Type" description="Choose to query time series or table">
        <RadioButtonGroup id="query-editor-query-type" options={queryTypes} onChange={onQueryTypeChange} value={query.queryType || QueryType.TIMESERIES} />
      </Field>
      {app !== CoreApp.Explore && <>
        <Field label={
          <Stack direction="row" gap={1} alignItems="center">
            <div>Streaming</div>
            <FeatureBadge featureState={FeatureState.experimental} />
          </Stack>
        } description="Watch MongoDB Change Streams">
          <Switch id="query-editor-collection-streaming" value={query.isStreaming === true} onChange={onIsStreamingChange} />
        </Field> </>}

      <InlineFieldRow>
        <InlineField label="Collection" error="Collection is required" invalid={query.queryLanguage !== QueryLanguage.JAVASCRIPT && !query.collection} tooltip="Name of the MongoDB collection to query">
          <Input width={25} id="query-editor-collection" onChange={onCollectionChange} value={query.collection} disabled={query.queryLanguage === QueryLanguage.JAVASCRIPT} />
        </InlineField>
        <InlineField label="Query language">
          <Select id="query-editor-query-language" onChange={onQueryLanguageChange} options={languageOptions} value={query.queryLanguage} width={25} />
        </InlineField>
      </InlineFieldRow>
      <ControlledCollapse label="Aggregate Options" isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
        <InlineFieldRow>
          <InlineField label="Max time(ms)" tooltip="The maximum amount of time that the query can run on the server. The default value is nil, meaning that there is no time limit for query execution."
            error="Invalid time" invalid={maxTimeMSText !== "" && !validatePositiveNumber(maxTimeMSText)}>
            <Input id="query-editor-max-time-ms" onChange={onMaxTimeMSChange} value={maxTimeMSText} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField label="Max Await Time(ms)" tooltip="The maximum amount of time that the server should wait for new documents to satisfy a tailable cursor query.">
            <Input id="query-editor-max-await-time-ms" onChange={onMaxAwaitTimeMSChange} value={maxAwaitTimeMSText} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField label="Comment" tooltip="A string that will be included in server logs, profiling logs, and currentOp queries to help trace the operation.">
            <Input id="query-editor-comment" onChange={onCommentChange} value={query.aggregateComment} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField label="Batch Size" tooltip="The maximum number of documents to be included in each batch returned by the server."
            error="Invalid batch size" invalid={batchSizeText !== "" && !validatePositiveNumber(batchSizeText)}>
            <Input id="query-editor-batch-size" onChange={onBatchSizeChange} value={batchSizeText} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField label="Allow Disk Use" tooltip="If true, the operation can write to temporary files in the _tmp subdirectory of the database directory path on the server. The default value is false.">
            <InlineSwitch id="query-editor-allow-disk-use" onChange={onAllowDiskUseChange} value={query.aggregateAllowDiskUse} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField label="Bypass Document Validation" tooltip="If true, writes executed as part of the operation will opt out of document-level validation on the server. This option is valid for MongoDB versions >= 3.2 and is ignored for previous server versions. The default value is false.">
            <InlineSwitch id="query-editor-bypass-document-validation" onChange={onBypassDocumentValidationChange} value={query.aggregateBypassDocumentValidation} />
          </InlineField>
        </InlineFieldRow>
      </ControlledCollapse>
      <Field label="Query Text" description={`Enter the Mongo Aggregation Pipeline (${query.queryLanguage === QueryLanguage.JSON ? "JSON" : "JavaScript"})`}
        error={queryTextError} invalid={queryTextError != null}>
        <CodeEditor onEditorDidMount={onCodeEditorDidMount} width="100%" height={300} language={query.queryLanguage === QueryLanguage.JAVASCRIPT || query.queryLanguage === QueryLanguage.JAVASCRIPT_SHADOW ? "javascript" : "json"}
          onBlur={onQueryTextChange} value={query.queryText || ""} showMiniMap={false} showLineNumbers={true} monacoOptions={{ fontSize: 14 }} />
      </Field>
      <Stack direction="row" wrap alignItems="flex-start" justifyContent="start" gap={1}>
        <Button onClick={onFormatQueryText} variant="secondary">Format</Button>
      </Stack>
    </>
  );
};
