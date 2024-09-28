export function validateQueryText(queryText?: string): string | null {
    if (!queryText) {
        return "Please enter the query";
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
