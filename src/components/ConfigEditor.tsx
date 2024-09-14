import React, { ChangeEvent } from 'react';
import { Divider, Field, FieldSet, InlineField, InlineFieldRow, Input, RadioButtonGroup, SecretInput, Select } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData, MongoDBAuthMethod } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> { }

const mongoDBAuthMethods: SelectableValue[] = [
  { label: "None", value: MongoDBAuthMethod.NONE },
  { label: "Username/Password", value: MongoDBAuthMethod.USERNAME_PASSWORD }
]

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  if (!jsonData.authType) {
    jsonData.authType = MongoDBAuthMethod.NONE
  }

  if (!jsonData.port) {
    jsonData.port = 27017
  }


  const onHostChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        host: event.target.value,
      },
    });
  };

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        username: event.target.value,
      },
    });
  };


  const onPortChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        port: event.target.valueAsNumber,
      },
    });
  };


  const onDatabaseChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        database: event.target.value,
      },
    });
  };

  const onAuthTypeChange = (authType: string) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        authType: authType,
      },
    });
  };

  // Secure field (only sent to the backend)
  const onPasswordChange = (event: SelectableValue<string>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        password: event.value,
      },
    });
  };

  const onResetPassword = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        password: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        password: ''
      },
    });
  };

  return (
    <>
      <InlineFieldRow label="Connection">
        <InlineField label="Host" tooltip="MongoDB host address">
          <Input
            required
            id="config-editor-host"
            value={jsonData.host}
            onChange={onHostChange}
            width={30}
          ></Input>
        </InlineField>
        <InlineField label="Port" tooltip="MongoDB port">
          <Input
            required
            id="config-editor-port"
            value={jsonData.port}
            type="number"
            onChange={onPortChange}
            width={15}
            defaultValue={27017}
          ></Input>
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Database" tooltip="MongoDB database">
          <Input
            required
            id="config-editor-database"
            value={jsonData.database}
            onChange={onDatabaseChange}
            width={30}
          ></Input>
        </InlineField>
      </InlineFieldRow>
      <Divider />
      <FieldSet label="Authentication">
        <Field label="Authentication method">
          <RadioButtonGroup
            options={mongoDBAuthMethods}
            value={jsonData.authType || MongoDBAuthMethod.NONE}
            onChange={onAuthTypeChange}
          />
        </Field>
      </FieldSet>

      {jsonData.authType == MongoDBAuthMethod.USERNAME_PASSWORD &&
        <>
          <InlineField label="Username" tooltip="MongoDB username">
            <Input
              required
              id="config-editor-username"
              value={jsonData.username}
              onChange={onUsernameChange}
            ></Input>
          </InlineField>
          <InlineField label="Password" labelWidth={14} interactive tooltip={'Secure json field (backend only)'}>
            <SecretInput
              required
              id="config-editor-password"
              isConfigured={secureJsonFields.password}
              value={secureJsonData?.password}
              placeholder="Enter your API key"
              width={40}
              onReset={onResetPassword}
              onChange={onPasswordChange}
            />
          </InlineField></>
      }
    </>
  );
}
