import { useEffect, useRef } from 'react';
import { monacoTypes, type Monaco, type MonacoEditor } from '@grafana/ui';
import stages from './stages.json';

const stageObj = Object.fromEntries(stages.map((stage) => [stage.name, [stage.description, stage.comment]]))

class HoverProvider implements monacoTypes.languages.HoverProvider {
    constructor(private readonly editor: MonacoEditor) { }
    provideHover(model: monacoTypes.editor.ITextModel, position: monacoTypes.Position, token: monacoTypes.CancellationToken): monacoTypes.languages.ProviderResult<monacoTypes.languages.Hover> {
        if (this.editor.getModel()?.id !== model.id) {
            return null;
        }

        const word = model.getWordAtPosition(position);
        if (word && Object.keys(stageObj).includes(word.word)) {
            const [description, comment] = stageObj[word.word];
            return {
                range: {
                    startLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endLineNumber: position.lineNumber,
                    endColumn: word.endColumn
                },
                contents: [
                    { value: `[${word.word}](https://www.mongodb.com/docs/manual/reference/operator/aggregation/${word.word.substring(1)})` },
                    { value: description },
                    { value: comment },
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
