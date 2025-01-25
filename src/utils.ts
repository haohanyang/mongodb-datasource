import { DataFrameSchema, DataQueryResponse, FieldType, MetricFindValue } from '@grafana/data';
import { JsQueryResult } from 'types';
import shadow from 'shadowrealm-api';
import { getTemplateSrv } from '@grafana/runtime';

export function validateJsonQueryText(queryText?: string): string | null {
  if (!queryText) {
    return 'Please enter the query text';
  }

  try {
    const queryJson = JSON.parse(queryText);

    if (!Array.isArray(queryJson)) {
      return 'Invalid query';
    } else {
      return null;
    }
  } catch (e) {
    return 'Invalid query';
  }
}

export function parseJsQueryLegacy(queryText: string): JsQueryResult {
  const regex = /^db\.(.+)\.aggregate\((.+)\)$/;
  const match = queryText
    .trim()
    .replace(/(;$)/g, '')
    .replace(/(\r\n|\n|\r)/gm, '')
    .match(regex);

  if (match) {
    const collection = match[1];
    const queryText = match[2];
    return {
      jsonQuery: queryText,
      collection: collection,
      error: validateJsonQueryText(queryText),
    };
  } else {
    return {
      error: 'Invalid query',
    };
  }
}

export function parseJsQuery(queryText: string): JsQueryResult {
  // use shadow realm to evaluate the JavaScript query
  const realm = new shadow();
  try {
    // replace the template variables in the query
    const script = getTemplateSrv().replace(queryText);
    // realm.evaluate will execute the JavaScript code and return the result
    const result = realm.evaluate(`
            const fn = ${script}
            const result = fn()
            JSON.stringify(result)
        `) as string;
    return {
      jsonQuery: result,
      error: null,
    };
  } catch (e: Error | any) {
    // if there is an error, return the error message
    return {
      error: e?.message,
    };
  }
}

export function datetimeToJson(datetime: string) {
  return JSON.stringify({
    $date: {
      $numberLong: datetime,
    },
  });
}

export function getBucketCount(from: string, to: string, intervalMs: number) {
  let current = parseInt(from, 10);
  const toMs = parseInt(to, 10);
  let count = 0;
  while (current < toMs) {
    current += intervalMs;
    count++;
  }

  return count;
}

export function randomId(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export function getMetricValues(response: DataQueryResponse): MetricFindValue[] {
  const dataframe = response.data[0] as DataFrameSchema;
  const field = dataframe.fields.find((f) => f.name === 'value');

  if (!field) {
    throw new Error('Field "value" not found');
  }

  if (field.type !== FieldType.string && field.type !== FieldType.number) {
    throw new Error('Each element should be string or number');
  }

  // @ts-ignore
  return field.values.map((value: string | number) => {
    return {
      text: value.toString(),
      value: value,
      expandable: true,
    };
  });
}

export function validatePositiveNumber(num: string) {
  if (!/^\d+$/.test(num.trim())) {
    return false;
  }

  const parsed = parseInt(num, 10);
  return parsed > 0;
}

export function base64UrlEncode(input: string | undefined) {
  if (!input) {
    return '';
  }
  // Encode input string to Base64
  let base64 = btoa(input);
  // Make the Base64 string URL-safe
  let base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64Url;
}

export function unixTsToMongoID(utc: string, rightPadding: string) {
  const val = Math.trunc(parseInt(utc, 10) / 1000)

  if (val < 0 || val > 0xFFFFFFFF) {
    return '';
  }

  let hexString = val.toString(16)

  while (hexString.length < 8) {
    hexString = '0' + hexString;
  }

  while (hexString.length < 24) {
    hexString = hexString + rightPadding;
  }

  return hexString;
}
