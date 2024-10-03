import { JsQueryResult } from "types";

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

export function parseJsQuery(queryText: string): JsQueryResult {
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

export function validateJsQueryText(queryText?: string): string | null {
    if (!queryText) {
        return "Please enter the query";
    }
    const { error } = parseJsQuery(queryText);
    return error;
}
