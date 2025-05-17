import { type MonacoEditor, type Monaco } from '@grafana/ui';
import { STAGE_OPERATOR_NAMES } from '@mongodb-js/mongodb-constants';

export function useValidation() {
  return (_editor: MonacoEditor, monaco: Monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: '#mongo-aggregate-schema',
          fileMatch: ['*'],
          schema: {
            type: 'array',
            items: {
              type: 'object',
              minProperties: 1,
              maxProperties: 1,
              properties: Object.fromEntries(STAGE_OPERATOR_NAMES.map((stage) => [stage, {}])),
              additionalProperties: false,
            },
          },
        },
      ],
    });
  };
}
