import React, { SyntheticEvent, ChangeEvent, useEffect } from 'react';
import {
  Divider,
  Field,
  Input,
  RadioButtonGroup,
  SecretInput,
} from '@grafana/ui';
import { ConfigSection, DataSourceDescription } from '@grafana/plugin-ui'
import { DataSourcePluginOptionsEditorProps, SelectableValue, updateDatasourcePluginJsonDataOption } from '@grafana/data';
import {
  MongoDataSourceOptions,
  MongoDataSourceSecureJsonData,
  MongoDBAuthMethod,
  ConnectionStringScheme,
} from '../types';
import descriptions from './descriptions.json';



interface Props extends DataSourcePluginOptionsEditorProps<MongoDataSourceOptions, MongoDataSourceSecureJsonData> { }

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

  const onDSOptionChanged = (property: keyof MongoDataSourceOptions) => {
    return (event: SyntheticEvent<HTMLInputElement>) => {
      onOptionsChange({ ...options, ...{ [property]: event.currentTarget.value } });
    };
  };

  const onDSOptionChanged_ = (property: keyof MongoDataSourceOptions) => {
    return (event: SyntheticEvent<HTMLInputElement>) => {
      onOptionsChange({ ...options, ...{ [property]: event.currentTarget.value } });
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
      <ConfigSection title='Connection'>
        <Field label="Scheme" description={descriptions.scheme} required>
          <RadioButtonGroup
            options={mongoConnectionStringSchemes}
            value={jsonData.connectionStringScheme ?? ConnectionStringScheme.STANDARD}
            onChange={onDSOptionChanged('connectionStringScheme')}
          />
        </Field>

        <Field label="Host" description={descriptions.host} required>
          <Input
            id="config-editor-host"
            placeholder='localhost:27017'
            value={host}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  host: event.target.value,
                },
              });
            }}
            width={40}
          ></Input>
        </Field>

        <Field label="Database" description="The default database">
          <Input
            id="config-editor-database"
            value={databaseName}
            placeholder='Database'
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  database: event.target.value,
                },
              });
            }}
            width={40}
          ></Input>
        </Field>

        <Field label="Connection String Options" description={descriptions.connectionStringOptions}>
          <Input
            required
            id="config-editor-connection-parameters"
            value={connectionOptions}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  connectionParameters: event.target.value,
                },
              });
            }}
            width={80}
          ></Input>
        </Field>

      </ConfigSection >
      <Divider />
      <ConfigSection title='Authentication'>
        <Field label="Authentication method">
          <RadioButtonGroup
            options={mongoDBAuthMethods}
            value={authType}
            onChange={(authType: string) => {
              onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  authType: authType,
                },
              });
            }}
          />
        </Field>

        {
          authType === MongoDBAuthMethod.USERNAME_PASSWORD && (
            <>
              <Field label="Username">
                <Input
                  required
                  id="config-editor-username"
                  value={jsonData.username}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                    onOptionsChange({
                      ...options,
                      jsonData: {
                        ...jsonData,
                        username: evt.target.value,
                      },
                    });
                  }}
                  width={40}
                ></Input>
              </Field>
              <Field label="Password">
                <SecretInput
                  required
                  id="config-editor-password"
                  isConfigured={secureJsonFields.password}
                  value={secureJsonData?.password}
                  width={40}
                  onReset={() => {
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
                  }}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    onOptionsChange({
                      ...options,
                      secureJsonData: {
                        password: event.target.value,
                      },
                    });
                  }}
                />
              </Field>
            </>
          )
        }

        {
          jsonData.authType === MongoDBAuthMethod.TLS && (
            <>
              <Field label="Certificate Authority" description={descriptions.certificateAuthority}>
                <Input
                  id="config-editor-tls-ca"
                  placeholder="/path/to/ca.pem"
                  value={jsonData.caCertPath}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onOptionsChange({
                      ...options,
                      jsonData: {
                        ...jsonData,
                        caCertPath: event.target.value,
                      },
                    })
                  }
                  width={40}
                ></Input>
              </Field>
              <Field label="Client Certificate" description={descriptions.clientCertificate}>
                <Input
                  id="config-editor-tls-cc"
                  placeholder="/path/to/mongodb.crt"
                  value={jsonData.clientCertPath}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onOptionsChange({
                      ...options,
                      jsonData: {
                        ...jsonData,
                        clientCertPath: event.target.value,
                      },
                    })
                  }
                  width={40}
                ></Input>
              </Field>
              <Field label="Client Key" description={descriptions.clientKey}>
                <Input
                  id="config-editor-tls-ck"
                  placeholder="/path/to/mongodb.pem"
                  value={jsonData.clientKeyPath}
                  width={40}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onOptionsChange({
                      ...options,
                      jsonData: {
                        ...jsonData,
                        clientKeyPath: event.target.value,
                      },
                    })
                  }
                ></Input>
              </Field>
              <Field label="Client Key Password">
                <SecretInput
                  id="config-editor-client-key-password"
                  isConfigured={secureJsonFields.clientKeyPassword}
                  value={secureJsonData?.clientKeyPassword}
                  width={40}
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
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onOptionsChange({
                      ...options,
                      secureJsonData: {
                        clientKeyPassword: event.target.value,
                      },
                    })
                  }
                />
              </Field>
            </>
          )
        }

      </ConfigSection>
    </>
  );
}
