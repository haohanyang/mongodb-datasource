import { useRef, useEffect } from 'react';
import { type Monaco, type monacoTypes, type MonacoEditor } from '@grafana/ui';
import { languages } from 'monaco-editor';
import {
  STAGE_OPERATORS,
  EXPRESSION_OPERATORS,
  ACCUMULATORS,
  CONVERSION_OPERATORS,
  QUERY_OPERATORS,
} from '@mongodb-js/mongodb-constants';

export class CompletionProvider implements monacoTypes.languages.CompletionItemProvider {
  constructor(private readonly editor: MonacoEditor) {}

  triggerCharacters = ['$'];

  provideCompletionItems(
    model: monacoTypes.editor.ITextModel,
    position: monacoTypes.Position,
  ): monacoTypes.languages.ProviderResult<monacoTypes.languages.CompletionList> {
    console.log('provideCompletionItems');
    if (this.editor.getModel()?.id !== model.id) {
      return { suggestions: [] };
    }

    // Check if the current position is inside a bracket
    const allText = model.getValue();
    const currentOffset = model.getOffsetAt({ lineNumber: position.lineNumber, column: position.column }) - 1;

    for (let i = currentOffset - 1; i >= 0; i--) {
      if (allText[i].trim()) {
        if (allText[i] !== '{') {
          console.log(`not in bracket ${allText[i]}`);
          return { suggestions: [] };
        }
        break;
      }
    }

    for (let i = currentOffset + 1; i < allText.length; i++) {
      if (allText[i].trim()) {
        if (allText[i] !== '}') {
          console.log(`not in bracket ${allText[i]}`);
          return { suggestions: [] };
        }
        break;
      }
    }

    const word = model.getWordUntilPosition(position);

    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    const language = model.getLanguageId();
    const suggestions = [
      ...STAGE_OPERATORS,
      ...EXPRESSION_OPERATORS,
      ...ACCUMULATORS,
      ...CONVERSION_OPERATORS,
      ...QUERY_OPERATORS,
    ].map((op) => {
      if (op.meta === 'stage') {
        const snippet = op.snippet.replace(/(\s*)([_a-zA-Z]+)\s*: /g, '$1"$2": ');
        return {
          label: language === 'json' ? `"${op.name}"` : op.name,
          kind: languages.CompletionItemKind.Function,
          insertText: language === 'json' ? `"\\${op.name}": ${snippet}` : `\\${op.name}: ${op.snippet}`,
          range: range,
          detail: op.meta,
          documentation: op.description,
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        };
      } else {
        return {
          label: language === 'json' ? `"${op.name}"` : op.name,
          kind: languages.CompletionItemKind.Function,
          insertText: language === 'json' ? `"\\${op.name}": \${1:expression}` : `\\${op.name}: \${1:expression}`,
          range: range,
          detail: op.meta,
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        };
      }
    });

    return {
      suggestions,
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
