import { useEffect, useRef } from 'react';
import { monacoTypes, type Monaco, type MonacoEditor } from '@grafana/ui';
import completionData from './completions.json';

const stages = Object.fromEntries(completionData['stages'].map((stage) => [stage.name, stage.description]))

class HoverProvider implements monacoTypes.languages.HoverProvider {
    constructor(private readonly editor: MonacoEditor) { }
    provideHover(model: monacoTypes.editor.ITextModel, position: monacoTypes.Position, token: monacoTypes.CancellationToken): monacoTypes.languages.ProviderResult<monacoTypes.languages.Hover> {
        if (this.editor.getModel()?.id !== model.id) {
            return null;
        }

        const word = model.getWordAtPosition(position);
        if (word && Object.keys(stages).includes(word.word)) {
            const lines = stages[word.word].split("\n").map((para) => ({ value: para.trim() }));
            return {
                range: {
                    startLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endLineNumber: position.lineNumber,
                    endColumn: word.endColumn
                },
                contents: [
                    { value: `[${word.word}](https://www.mongodb.com/docs/manual/reference/operator/aggregation/${word.word.substring(1)})` },
                    ...lines
                ]
            };
        }

        return null;
    }

}

export function useHover() {
    const hoverDisposeFun = useRef<(() => void) | null>(null);
    useEffect(() => {
        return () => {
            hoverDisposeFun.current?.();
        };
    }, []);

    return (editor: MonacoEditor, monaco: Monaco) => {
        const provider = new HoverProvider(editor);
        const { dispose } = monaco.languages.registerHoverProvider('json', provider);
        hoverDisposeFun.current = dispose;
    };
}