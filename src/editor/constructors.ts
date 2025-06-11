import { type MonacoEditor, type Monaco } from '@grafana/ui';
import { STAGE_OPERATOR_NAMES } from '@mongodb-js/mongodb-constants';

export function useJsConstructors() {
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

// Reference: https://www.mongodb.com/docs/manual/reference/method/js-constructor/

declare class ObjectId {
    /**
     * Returns a new ObjectId.
     * @param value Optional. A 24 character hexadecimal string value for the new ObjectId, or an integer value, in seconds, is added to the Unix epoch to create the new timestamp.
     */
    constructor(value?: string | number)
};

/**
 * Returns a new ObjectId.
 * @param value Optional. A 24 character hexadecimal string value for the new ObjectId, or an integer value, in seconds, is added to the Unix epoch to create the new timestamp.
 */
declare function ObjectId(value?: string | number): ObjectId;

/**
 * Returns a date either as a string or as a Date object. The date can contain a date and a time, known as a datetime.
 * @param value Optional. An ISO-8601 date string with a year within the inclusive range 0 through 9999. If not provided, it returns the current date.
 */
declare function ISODate(value?: string): Date;


declare class UUID {
    /**
     * Generates a BSON UUID object.
     * @param hex Optional. Specify a 36 character string to convert to a UUID BSON object. If not provided, MongoDB generates a random UUID in RFC 4122 v4 format. 
     */
    constructor(hex?: string)
};

/**
 * Generates a BSON UUID object.
 * @param hex Optional. Specify a 36 character string to convert to a UUID BSON object. If not provided, MongoDB generates a random UUID in RFC 4122 v4 format. 
 */
declare function UUID(hex?: string): UUID;
