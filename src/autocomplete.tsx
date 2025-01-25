import { useRef, useEffect } from 'react';
import { type Monaco, type monacoTypes } from '@grafana/ui';
import { languages } from 'monaco-editor';
import aggregationData from './aggregation.json';

// Supports JSON only right now
class CompletionProvider implements monacoTypes.languages.CompletionItemProvider {
  constructor(private readonly editor: monacoTypes.editor.IStandaloneCodeEditor) {}

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

    const suggestions: languages.CompletionItem[] = aggregationData['stages'].map((s) => ({
      label: `"${s['name']}"`,
      kind: languages.CompletionItemKind.Function,
      insertText: s['insertText'] ? s['insertText'] : `"\\${s['name']}": {\n\t$0\n}`,
      range: range,
      detail: 'stage',
      documentation: s['description'],
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

  return (editor: monacoTypes.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    const provider = new CompletionProvider(editor);
    const { dispose } = monaco.languages.registerCompletionItemProvider('json', provider);
    autocompleteDisposeFun.current = dispose;
  };
}
