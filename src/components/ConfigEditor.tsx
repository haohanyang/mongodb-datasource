import React, { SyntheticEvent } from 'react';
import { Divider, Field, Input, RadioButtonGroup, SecretInput, Switch, Alert } from '@grafana/ui';
import { ConfigSection, DataSourceDescription } from '@grafana/plugin-ui';
import {
  DataSourcePluginOptionsEditorProps,
  updateDatasourcePluginJsonDataOption,
  onUpdateDatasourceSecureJsonDataOption,
  updateDatasourcePluginResetOption,
} from '@grafana/data';
import { MongoDataSourceOptions, MongoDataSourceSecureJsonData } from '../types';
import descriptions from '../config-descriptions.json';
import {
  authOptions,
  connectionStringSchemeOptions,
  MongoDBAuthMethod,
  ConnectionStringScheme,
  tlsOptions,
  TlsOption,
} from '../constants';

interface Props extends DataSourcePluginOptionsEditorProps<MongoDataSourceOptions, MongoDataSourceSecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const onDataSourceOptionChanged = (property: keyof MongoDataSourceOptions) => {
    return (event: SyntheticEvent<HTMLInputElement>) => {
      updateDatasourcePluginJsonDataOption(props, property, event.currentTarget.value);
    };
  };

  const onInputChanged = (property: keyof MongoDataSourceOptions) => {
    return (value: string) => {
      updateDatasourcePluginJsonDataOption(props, property, value);
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
            id="config-editor-connection-scheme"
            options={connectionStringSchemeOptions}
            value={
              jsonData.connectionStringScheme === ConnectionStringScheme.MONGODBSRV
                ? ConnectionStringScheme.MONGODBSRV
                : ConnectionStringScheme.MONGODB
            }
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
            id="config-editor-connection-options"
            value={jsonData.connectionOptions}
            onChange={onDataSourceOptionChanged('connectionOptions')}
            width={80}
          ></Input>
        </Field>
      </ConfigSection>
      <Divider />
      <ConfigSection title="Authentication">
        <Field label="Authentication method">
          <RadioButtonGroup
            id="config-editor-auth-type"
            options={authOptions}
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
                onChange={onUpdateDatasourceSecureJsonDataOption(props, 'password')}
              />
            </Field>
            <Field label="Authentication Database">
              <Input
                required
                id="config-editor-auth-db"
                value={jsonData.authDb}
                onChange={onDataSourceOptionChanged('authDb')}
                width={40}
              ></Input>
            </Field>
          </>
        )}

        {jsonData.authType === MongoDBAuthMethod.X509 && (
          <Alert severity="info" title="Enable TLS">
            {descriptions.x509}{' '}
          </Alert>
        )}
      </ConfigSection>
      <Divider />
      <ConfigSection title="TLS/SSL">
        <Field label="SSL/TLS Connection">
          <RadioButtonGroup
            id="config-editor-tls-option"
            options={tlsOptions}
            value={jsonData.tlsOption || TlsOption.DEFAULT}
            onChange={onInputChanged('tlsOption')}
          />
        </Field>

        <Field label="Certificate Authority (.pem)" description={'Optional'}>
          <Input
            id="config-editor-tls-ca"
            placeholder="/path/to/ca.pem"
            value={jsonData.caCertPath}
            onChange={onDataSourceOptionChanged('caCertPath')}
            disabled={jsonData.tlsOption === TlsOption.DISABLED}
            width={40}
          ></Input>
        </Field>

        <Field label="Client Certificate and Key (.pem)" description={'Optional (required with X.509 auth)'}>
          <Input
            id="config-editor-tls-cc"
            placeholder="/path/to/client.pem"
            value={jsonData.clientCertAndKeyPath}
            onChange={onDataSourceOptionChanged('clientCertAndKeyPath')}
            disabled={jsonData.tlsOption === TlsOption.DISABLED}
            width={40}
          ></Input>
        </Field>

        <Field label="Client Key Password">
          <SecretInput
            id="config-editor-client-key-password"
            isConfigured={secureJsonFields?.clientKeyPassword}
            value={secureJsonData?.clientKeyPassword}
            width={40}
            onReset={() => updateDatasourcePluginResetOption(props, 'clientKeyPassword')}
            onChange={onUpdateDatasourceSecureJsonDataOption(props, 'clientKeyPassword')}
            disabled={jsonData.tlsOption === TlsOption.DISABLED}
          />
        </Field>

        <Field label="tlsInsecure" description={descriptions.tlsInsecure}>
          <Switch
            onChange={onSwitchChanged('tlsInsecure')}
            value={jsonData.tlsInsecure}
            disabled={jsonData.tlsOption === TlsOption.DISABLED}
          />
        </Field>

        <Field label="tlsAllowInvalidHostnames" description={descriptions.tlsAllowInvalidHostnames}>
          <Switch
            onChange={onSwitchChanged('tlsAllowInvalidHostnames')}
            value={jsonData.tlsAllowInvalidHostnames}
            disabled={jsonData.tlsOption === TlsOption.DISABLED}
          />
        </Field>

        <Field label="tlsAllowInvalidCertificates" description={descriptions.tlsAllowInvalidCertificates}>
          <Switch
            onChange={onSwitchChanged('tlsAllowInvalidCertificates')}
            value={jsonData.tlsAllowInvalidCertificates}
            disabled={jsonData.tlsOption === TlsOption.DISABLED}
          />
        </Field>
      </ConfigSection>
    </>
  );
}
