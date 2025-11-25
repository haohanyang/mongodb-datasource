import React, { SyntheticEvent } from 'react';
import { Divider, Field, Input, RadioButtonGroup, SecretInput, Switch } from '@grafana/ui';
import { ConfigSection, DataSourceDescription } from '@grafana/plugin-ui';
import {
  DataSourcePluginOptionsEditorProps,
  SelectableValue,
  updateDatasourcePluginJsonDataOption,
  onUpdateDatasourceSecureJsonDataOption,
  updateDatasourcePluginResetOption,
} from '@grafana/data';
import {
  MongoDataSourceOptions,
  MongoDataSourceSecureJsonData,
  MongoDBAuthMethod,
  ConnectionStringScheme,
} from '../types';
import descriptions from './descriptions.json';

interface Props extends DataSourcePluginOptionsEditorProps<MongoDataSourceOptions, MongoDataSourceSecureJsonData> {}

const mongoDBAuthMethods: SelectableValue[] = [
  { label: 'None', value: MongoDBAuthMethod.NONE },
  { label: 'Username/Password', value: MongoDBAuthMethod.USERNAME_PASSWORD },
  { label: 'TLS/SSL', value: MongoDBAuthMethod.TLS },
];

const mongoConnectionStringSchemes: SelectableValue[] = [
  { label: 'mongodb', value: ConnectionStringScheme.STANDARD, description: 'Standard Connection String Format' },
  { label: 'mongodb+srv', value: ConnectionStringScheme.DNS_SEED_LIST, description: 'DNS Seed List Connection Format' },
];

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const onDataSourceOptionChanged = (property: keyof MongoDataSourceOptions) => {
    return (event: SyntheticEvent<HTMLInputElement>) => {
      onOptionsChange({ ...options, ...{ [property]: event.currentTarget.value } });
    };
  };

  const onInputChanged = (property: keyof MongoDataSourceOptions) => {
    return (value: string) => {
      onOptionsChange({ ...options, ...{ [property]: value } });
    };
  };

  const onSwitchChanged = (property: keyof MongoDataSourceOptions) => {
    return (event: SyntheticEvent<HTMLInputElement>) => {
      updateDatasourcePluginJsonDataOption(props, property, event.currentTarget.checked);
    };
  };

  return (
    <>
      <DataSourceDescription
        dataSourceName="MongoDB"
        docsLink="https://github.com/haohanyang/mongodb-datasource"
        hasRequiredFields={true}
      />
      <Divider />
      <ConfigSection title="Connection">
        <Field label="Scheme" description={descriptions.scheme} required>
          <RadioButtonGroup
            options={mongoConnectionStringSchemes}
            value={jsonData.connectionStringScheme || ConnectionStringScheme.STANDARD}
            onChange={onInputChanged('connectionStringScheme')}
          />
        </Field>

        <Field label="Host" description={descriptions.host} required>
          <Input
            id="config-editor-host"
            placeholder="localhost:27017"
            value={jsonData.host}
            onChange={onDataSourceOptionChanged('host')}
            width={40}
          ></Input>
        </Field>

        <Field label="Database" description="The default database">
          <Input
            id="config-editor-database"
            value={jsonData.database}
            placeholder="Database"
            onChange={onDataSourceOptionChanged('database')}
            width={40}
          ></Input>
        </Field>

        <Field label="Connection String Options" description={descriptions.connectionStringOptions}>
          <Input
            required
            id="config-editor-connection-parameters"
            value={jsonData.connectionParameters}
            onChange={onDataSourceOptionChanged('connectionParameters')}
            width={80}
          ></Input>
        </Field>
      </ConfigSection>
      <Divider />
      <ConfigSection title="Authentication">
        <Field label="Authentication method">
          <RadioButtonGroup
            options={mongoDBAuthMethods}
            value={jsonData.authType || MongoDBAuthMethod.NONE}
            onChange={onInputChanged('authType')}
          />
        </Field>

        {jsonData.authType === MongoDBAuthMethod.USERNAME_PASSWORD && (
          <>
            <Field label="Username">
              <Input
                required
                id="config-editor-username"
                value={jsonData.username}
                onChange={onDataSourceOptionChanged('username')}
                width={40}
              ></Input>
            </Field>
            <Field label="Password">
              <SecretInput
                required
                id="config-editor-password"
                isConfigured={secureJsonFields?.password}
                value={secureJsonData?.password}
                width={40}
                onReset={() => updateDatasourcePluginResetOption(props, 'password')}
                onBlur={onUpdateDatasourceSecureJsonDataOption(props, 'password')}
              />
            </Field>
          </>
        )}

        {jsonData.authType === MongoDBAuthMethod.TLS && (
          <>
            <Field label="Certificate Authority" description={descriptions.certificateAuthority}>
              <Input
                id="config-editor-tls-ca"
                placeholder="/path/to/ca.pem"
                value={jsonData.caCertPath}
                onChange={onDataSourceOptionChanged('caCertPath')}
                width={40}
              ></Input>
            </Field>
            <Field label="Client Certificate" description={descriptions.clientCertificate}>
              <Input
                id="config-editor-tls-cc"
                placeholder="/path/to/mongodb.crt"
                value={jsonData.clientCertPath}
                onChange={onDataSourceOptionChanged('clientCertPath')}
                width={40}
              ></Input>
            </Field>
            <Field label="Client Key" description={descriptions.clientKey}>
              <Input
                id="config-editor-tls-ck"
                placeholder="/path/to/mongodb.pem"
                value={jsonData.clientKeyPath}
                width={40}
                onChange={onDataSourceOptionChanged('clientKeyPath')}
              ></Input>
            </Field>
            <Field label="Client Key Password">
              <SecretInput
                id="config-editor-client-key-password"
                isConfigured={secureJsonFields?.clientKeyPassword}
                value={secureJsonData?.clientKeyPassword}
                width={40}
                onReset={() => updateDatasourcePluginResetOption(props, 'clientKeyPassword')}
                onBlur={onUpdateDatasourceSecureJsonDataOption(props, 'clientKeyPassword')}
              />
            </Field>

            <Field label="tlsInsecure" description={descriptions.tlsInsecure}>
              <Switch onChange={onSwitchChanged('tlsInsecure')} value={jsonData.tlsInsecure} />
            </Field>

            <Field label="tlsInsecure" description={descriptions.tlsInsecure}>
              <Switch onChange={onSwitchChanged('tlsInsecure')} value={jsonData.tlsInsecure} />
            </Field>

            <Field label="tlsAllowInvalidHostnames" description={descriptions.tlsAllowInvalidHostnames}>
              <Switch
                onChange={onSwitchChanged('tlsAllowInvalidHostnames')}
                value={jsonData.tlsAllowInvalidHostnames}
              />
            </Field>

            <Field label="tlsAllowInvalidCertificates" description={descriptions.tlsAllowInvalidCertificates}>
              <Switch
                onChange={onSwitchChanged('tlsAllowInvalidCertificates')}
                value={jsonData.tlsAllowInvalidCertificates}
              />
            </Field>
          </>
        )}
      </ConfigSection>
    </>
  );
}
