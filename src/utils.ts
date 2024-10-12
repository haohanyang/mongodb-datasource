import { DateTime } from "@grafana/data";
import { JsQueryResult } from "types";
import shadow from "shadowrealm-api";
import {getTemplateSrv} from "@grafana/runtime";

export function validateJsonQueryText(queryText?: string): string | null {
    if (!queryText) {
        return "Please enter the query text";
    }

    try {
        const queryJson = JSON.parse(queryText);

        if (!Array.isArray(queryJson)) {
            return "Invalid query";
        } else {
            return null;
        }
    } catch (e) {
        return "Invalid query";
    }
}

export function parseJsQueryLegacy(queryText: string): JsQueryResult {
    const regex = /^db\.(.+)\.aggregate\((.+)\)$/;
    const match = queryText.trim().replace(/(;$)/g, "").replace(/(\r\n|\n|\r)/gm, "")
        .match(regex);

    if (match) {
        const collection = match[1];
        const queryText = match[2];
        return {
            jsonQuery: queryText,
            collection: collection,
            error: validateJsonQueryText(queryText)
        };
    } else {
        return {
            error: "Invalid query"
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
            error: null
        };
    }catch (e: Error | any) {
        // if there is an error, return the error message
        return {
            error: e?.message
        };
    }
}



export function datetimeToJson(datetime: DateTime) {
    return JSON.stringify({
        $date: {
            $numberLong: datetime.toDate().getTime().toString()
        }
    });
}

export function getBucketCount(from: DateTime, to: DateTime, intervalMs: number) {
    let current = from.toDate().getTime();
    const toMs = to.toDate().getTime();
    let count = 0;
    while (current < toMs) {
        current += intervalMs;
        count++;
    }

    return count;
}
