import { type MonacoEditor, type Monaco } from "@grafana/ui";
import completionData from './completions.json';

export function useValidation() {
    return (_editor: MonacoEditor, monaco: Monaco) => {
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: [
                {
                    uri: '#mongo-aggregate-schema',
                    fileMatch: ['*'],
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            minProperties: 1,
                            maxProperties: 1,
                            properties: Object.fromEntries(
                                completionData['stages'].map((stage) => [
                                    stage["name"], {}])),
                            additionalProperties: false
                        }
                    }
                }
            ]
        })
    };
}
