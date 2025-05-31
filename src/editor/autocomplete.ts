import { useRef, useEffect } from 'react';
import { type Monaco, type monacoTypes, type MonacoEditor } from '@grafana/ui';
import { languages } from 'monaco-editor';
import { STAGE_OPERATORS, EXPRESSION_OPERATORS, ACCUMULATORS, CONVERSION_OPERATORS, QUERY_OPERATORS } from '@mongodb-js/mongodb-constants'

class JSONCompletionProvider implements monacoTypes.languages.CompletionItemProvider {
  constructor(private readonly editor: MonacoEditor) { }

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

    const stageSuggestions: languages.CompletionItem[] = STAGE_OPERATORS.map((stage) => {
      // Add double quotation marks
      const snippet = stage.snippet.replace(/(\s*)([_a-zA-Z]+)\s*: /g, '$1"$2": ');
      return {
        label: `"${stage.name}"`,
        kind: languages.CompletionItemKind.Function,
        insertText: `"\\${stage.name}": ${snippet}`,
        range: range,
        detail: stage.meta,
        documentation: stage.description,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      }
    });

    const expressionSuggestions: languages.CompletionItem[] = [...EXPRESSION_OPERATORS, ...ACCUMULATORS, ...CONVERSION_OPERATORS, ...QUERY_OPERATORS].map((expression) => ({
      label: `"${expression.name}"`,
      kind: languages.CompletionItemKind.Function,
      insertText: `"\\${expression.name}": \${1:expression}`,
      range: range,
      detail: expression.meta,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    }));

    return {
      suggestions: [...stageSuggestions, ...expressionSuggestions],
    };
  }
}


class JSCompletionProvider implements monacoTypes.languages.CompletionItemProvider {
  constructor(private readonly editor: MonacoEditor) { }

  provideCompletionItems(model: monacoTypes.editor.ITextModel, position: monacoTypes.Position, context: languages.CompletionContext, token: monacoTypes.CancellationToken): languages.ProviderResult<languages.CompletionList> {
    if (this.editor.getModel()?.id !== model.id) {
      return { suggestions: [] };
    }

    const word = model.getWordUntilPosition(position);
    if (!word) {
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

    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };
    return {
      suggestions: [...STAGE_OPERATORS, ...EXPRESSION_OPERATORS, ...ACCUMULATORS, ...CONVERSION_OPERATORS, ...QUERY_OPERATORS].map((op) => {
        if (op.meta === "stage") {
          return {
            label: op.name,
            kind: languages.CompletionItemKind.Function,
            insertText: `\\${op.name}: ${op.snippet}`,
            range: range,
            detail: op.meta,
            documentation: op.description,
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
          }
        } else {
          return {
            label: op.name,
            kind: languages.CompletionItemKind.Function,
            insertText: `\\${op.name}: \${1:expression}`,
            range: range,
            detail: op.meta,
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
          }
        }
      })
    }
  }
}


export function useAutocomplete() {
  const autocompleteDisposeFun = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      autocompleteDisposeFun.current?.();
    };
  }, []);

  return (editor: MonacoEditor, monaco: Monaco, language: string) => {
    const provider = language === "json" ? new JSONCompletionProvider(editor) : new JSCompletionProvider(editor);
    const { dispose } = monaco.languages.registerCompletionItemProvider(language, provider);
    autocompleteDisposeFun.current = dispose;
  };
}
