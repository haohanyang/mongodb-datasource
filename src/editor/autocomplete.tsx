import { useRef, useEffect } from 'react';
import { type Monaco, type monacoTypes, type MonacoEditor } from '@grafana/ui';
import { languages } from 'monaco-editor';
import completionData from './completions.json';

interface CompletionState {
  name: string;
  description: string;
  fields?: string[] | string;
}

// Supports JSON only right now
class CompletionProvider implements monacoTypes.languages.CompletionItemProvider {
  constructor(private readonly editor: MonacoEditor) {}

  provideCompletionItems(
    model: monacoTypes.editor.ITextModel,
    position: monacoTypes.Position,
  ): monacoTypes.languages.ProviderResult<monacoTypes.languages.CompletionList> {
    if (this.editor.getModel()?.id !== model.id) {
      return { suggestions: [] };
    }

    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });

    // Check if the current position is inside a bracket
    const match = textUntilPosition.match(/\s*\{\s*("[^"]*"\s*:\s*"[^"]*"\s*,\s*)*([^"]*)?$/);
    if (!match) {
      return { suggestions: [] };
    }

    const word = model.getWordUntilPosition(position);
    if (!word) {
      return { suggestions: [] };
    }

    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    const suggestions: languages.CompletionItem[] = completionData['stages'].map((stage) => ({
      label: `"${stage.name}"`,
      kind: languages.CompletionItemKind.Function,
      insertText: createInsertText(stage),
      range: range,
      detail: 'stage',
      documentation: stage.description,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    }));

    return {
      suggestions: suggestions,
    };
  }
}

export function useAutocomplete() {
  const autocompleteDisposeFun = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      autocompleteDisposeFun.current?.();
    };
  }, []);

  return (editor: MonacoEditor, monaco: Monaco) => {
    const provider = new CompletionProvider(editor);
    const { dispose } = monaco.languages.registerCompletionItemProvider('json', provider);
    autocompleteDisposeFun.current = dispose;
  };
}

function createInsertText({ name, fields }: CompletionState) {
  if (fields) {
    if (Array.isArray(fields)) {
      let insertText = `"\\${name}": {\n\t`;
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        insertText += `"${field}": \${${i + 1}:${field}}`;

        if (i == 0) {
          insertText += '$0';
        }

        if (i != fields.length - 1) {
          insertText += ',\n\t';
        }
      }
      insertText += '\n}';

      return insertText;
    }
    return `"\\${name}": \${1:${fields}}`;
  }
  return `"\\${name}": {\n\t$0\n}`;
}
