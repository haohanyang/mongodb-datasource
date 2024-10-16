import React, { useState } from "react";
import { DEFAULT_QUERY, VariableQuery } from "../types";
import { CodeEditor, Field, InlineField, Input } from "@grafana/ui";

interface VariableQueryProps {
    query: VariableQuery;
    onChange: (query: VariableQuery, definition: string) => void;
}

export const VariableQueryEditor = ({ onChange, query }: VariableQueryProps) => {
    const [state, setState] = useState(query);

    const saveQuery = () => {
        onChange(state, `${state.collection} (${state.queryText})`);
    };

    const handleCollectionChange = (event: React.FormEvent<HTMLInputElement>) =>
        setState({
            ...state,
            collection: event.currentTarget.value,
        });

    const handleQueryTextChange = (text: string) =>
        setState({
            ...state,
            queryText: text,
        });

    return (
        <>
            <InlineField label="Collection" tooltip="Enter the MongoDB collection"
                error="Please enter the collection" invalid={!query.collection}>
                <Input
                    name="collection"
                    onBlur={saveQuery}
                    onChange={handleCollectionChange}
                    value={state.collection}>
                </Input>
            </InlineField>
            <Field label="Query Text" description="MongoDB aggregate (JSON)">
                <CodeEditor width="100%" height={300} language="json" onBlur={saveQuery}
                    value={query.queryText || DEFAULT_QUERY.queryText!} showMiniMap={false} showLineNumbers={true}
                    onChange={handleQueryTextChange}
                />
            </Field>
        </>
    );
};
