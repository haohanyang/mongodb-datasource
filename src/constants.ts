import { SelectableValue } from '@grafana/data';
import descriptions from './config-descriptions.json';

export const MongoDBAuthMethod = {
  NONE: '',
  USERNAME_PASSWORD: 'username-password',
  X509: 'x509',
};

export const ConnectionStringScheme = {
  MONGODB: 'mongodb',
  MONGODBSRV: 'mongodb+srv',
};

export const TlsOption = {
  DEFAULT: '',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
};

export const authOptions: SelectableValue[] = [
  { label: 'None', value: MongoDBAuthMethod.NONE },
  { label: 'Username/Password', value: MongoDBAuthMethod.USERNAME_PASSWORD },
  { label: 'X.509', value: MongoDBAuthMethod.X509 },
];

export const connectionStringSchemeOptions: SelectableValue[] = [
  {
    label: ConnectionStringScheme.MONGODB,
    value: ConnectionStringScheme.MONGODB,
    description: descriptions.mongodb,
  },
  {
    label: ConnectionStringScheme.MONGODBSRV,
    value: ConnectionStringScheme.MONGODBSRV,
    description: descriptions.mongodbSrv,
  },
];

export const tlsOptions: SelectableValue[] = [
  { label: 'Default', value: TlsOption.DEFAULT },
  { label: 'On', value: TlsOption.ENABLED },
  { label: 'Off', value: TlsOption.DISABLED },
];
