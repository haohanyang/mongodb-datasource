import { JsQueryResult } from 'types';
import shadow from 'shadowrealm-api';
import { getTemplateSrv } from '@grafana/runtime';
import validator from 'validator';

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
      error: validator.isJSON(queryText) ? null : 'Invalid JSON',
    };
  } else {
    return {
      error: 'Invalid query',
    };
  }
}

export function parseJsShadowQuery(queryText: string): JsQueryResult {
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

export function unixTsToMongoID(utc_ms: number, rightPadding: string) {
  const val = Math.trunc(utc_ms / 1000);

  if (val < 0 || val > 0xffffffff) {
    return '';
  }

  let hexString = val.toString(16);

  while (hexString.length < 8) {
    hexString = '0' + hexString;
  }

  while (hexString.length < 24) {
    hexString = hexString + rightPadding;
  }

  return hexString;
}
