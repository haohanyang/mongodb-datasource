import React, { ChangeEvent } from 'react';
import {
  Divider,
  Field,
  FieldSet,
  InlineField,
  InlineFieldRow,
  Input,
  RadioButtonGroup,
  SecretInput,
  Checkbox,
} from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import {
  MongoDataSourceOptions,
  MongoDataSourceSecureJsonData,
  MongoDBAuthMethod,
  ConnectionStringScheme,
} from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MongoDataSourceOptions, MongoDataSourceSecureJsonData> { }

const mongoDBAuthMethods: SelectableValue[] = [
  { label: 'None', value: MongoDBAuthMethod.NONE },
  { label: 'Username/Password', value: MongoDBAuthMethod.USERNAME_PASSWORD },
  { label: 'TLS/SSL', value: MongoDBAuthMethod.TLS_SSL },
];

const mongoConnectionStringSchemes: SelectableValue[] = [
  { label: 'mongodb', value: ConnectionStringScheme.STANDARD, description: 'Standard Connection String Format' },
  { label: 'mongodb+srv', value: ConnectionStringScheme.DNS_SEED_LIST, description: 'DNS Seed List Connection Format' },
];

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  if (!jsonData.authType) {
    jsonData.authType = MongoDBAuthMethod.NONE;
  }

  if (!jsonData.port) {
    jsonData.port = 27017;
  }

  if (!jsonData.connectionStringScheme) {
    jsonData.connectionStringScheme = ConnectionStringScheme.STANDARD;
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

  const onConnectionParametersChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        connectionParameters: event.target.value,
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

  const onConnectionStringSchemeChange = (scheme: string) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        connectionStringScheme: scheme,
      },
    });
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        password: event.target.value,
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
        password: '',
      },
    });
  };

  return (
    <>
      <Field label="Connection string scheme">
        <RadioButtonGroup
          options={mongoConnectionStringSchemes}
          value={jsonData.connectionStringScheme || ConnectionStringScheme.STANDARD}
          onChange={onConnectionStringSchemeChange}
        />
      </Field>
      <InlineFieldRow label="Connection">
        <InlineField label="Host" tooltip="MongoDB host address">
          <Input required id="config-editor-host" value={jsonData.host} onChange={onHostChange} width={30}></Input>
        </InlineField>
        {jsonData.connectionStringScheme === ConnectionStringScheme.STANDARD && (
          <InlineField label="Port" tooltip="MongoDB port">
            <Input
              id="config-editor-port"
              value={jsonData.port}
              type="number"
              onChange={onPortChange}
              width={15}
              defaultValue={27017}
            ></Input>
          </InlineField>
        )}
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
      <InlineField
        label="Connection parameters"
        tooltip="(Optional) Connection parameters appended to the connection string. For example retryWrites=true&w=majority&appName=default-cluster"
      >
        <Input
          required
          id="config-editor-connection-parameters"
          value={jsonData.connectionParameters}
          onChange={onConnectionParametersChange}
          width={35}
        ></Input>
      </InlineField>
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

      {jsonData.authType === MongoDBAuthMethod.USERNAME_PASSWORD && (
        <>
          <InlineField label="Username" tooltip="MongoDB username">
            <Input
              required
              id="config-editor-username"
              value={jsonData.username}
              onChange={onUsernameChange}
              width={35}
            ></Input>
          </InlineField>
          <InlineField label="Password" tooltip="MongoDB password">
            <SecretInput
              required
              id="config-editor-password"
              isConfigured={secureJsonFields.password}
              value={secureJsonData?.password || ''}
              width={35}
              onReset={onResetPassword}
              onChange={onPasswordChange}
            />
          </InlineField>
        </>
      )}

      {jsonData.authType === MongoDBAuthMethod.TLS_SSL && (
        <>
          <Field label="Certificate Authority">
            <Input
              required
              id="config-editor-tls-ca"
              value={jsonData.caCertPath}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  caCertPath: evt.target.value,
                },
              })}

            ></Input>
          </Field>
          <Field label="Client Certificate" description="Path to public client certificate (.pem)">
            <Input
              required
              id="config-editor-tls-cc"
              value={jsonData.clientCertPath}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  clientCertPath: evt.target.value,
                },
              })}

            ></Input>
          </Field>
          <Field label="Client Key" description="Path to private client key (.pem)">
            <Input
              required
              id="config-editor-tls-ck"
              value={jsonData.clientKeyPath}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  clientKeyPath: evt.target.value,
                },
              })}
            ></Input>
          </Field>
          <Field label="Client Key Password">
            <SecretInput
              required
              id="config-editor-client-key-password"
              isConfigured={secureJsonFields.clientKeyPassword}
              value={secureJsonData?.clientKeyPassword ?? ''}
              width={35}
              onReset={() =>
                onOptionsChange({
                  ...options,
                  secureJsonFields: {
                    ...options.secureJsonFields,
                    clientKeyPassword: false,
                  },
                  secureJsonData: {
                    ...options.secureJsonData,
                    clientKeyPassword: '',
                  },
                })
              }
              onChange={(evt: ChangeEvent<HTMLInputElement>) =>
                onOptionsChange({
                  ...options,
                  secureJsonData: {
                    password: evt.target.value,
                  },
                })
              }
            />
          </Field>
          <Checkbox
            value={false}
            label="tlsInsecure"
            description="This includes tlsAllowInvalidHostnames and tlsAllowInvalidCertificates."
          />
          <Checkbox
            value={false}
            label="tlsAllowInvalidHostnames"
            description="Disable the validation of the hostnames in the certificate presented by the mongod/mongos instance."
          />
          <Checkbox
            value={false}
            label="tlsAllowInvalidCertificates"
            description="This includes tlsAllowInvalidHostnames and tlsAllowInvalidCertificates."
          />
          <Checkbox
            value={false}
            label="tlsInsecure"
            description="Disable the validation of the server certificates."
          />
        </>
      )
      }
    </>
  );
}
