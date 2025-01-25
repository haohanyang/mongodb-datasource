import { useRef, useEffect } from 'react';
import { type Monaco, type monacoTypes } from '@grafana/ui';
import { languages } from 'monaco-editor';

// Supports JSON only right now
class CompletionProvider implements monacoTypes.languages.CompletionItemProvider {
  constructor(
    private readonly monaco: Monaco,
    private readonly editor: monacoTypes.editor.IStandaloneCodeEditor,
  ) {}

  provideCompletionItems(
    model: monacoTypes.editor.ITextModel,
    position: monacoTypes.Position,
    context: monacoTypes.languages.CompletionContext,
    token: monacoTypes.CancellationToken,
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

    return {
      suggestions: [
        {
          label: '"$match"',
          kind: languages.CompletionItemKind.Function,
          insertText: '"\\$match": {\n\t${1:query}$0\n}',
          range: range,
          detail: 'stage',
          documentation: 'Filters documents based on a specified query predicate.',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: '"$project"',
          kind: languages.CompletionItemKind.Function,
          insertText: '"\\$project": {\n\t${1:specification(s)}$0\n}',
          range: range,
          detail: 'stage',
          documentation: 'Passes along the documents with the requested fields to the next stage in the pipeline.',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: '"$limit"',
          kind: languages.CompletionItemKind.Function,
          insertText: '"\\$match": ${1:number}',
          range: range,
          detail: 'stage',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: '"$lookup"',
          kind: languages.CompletionItemKind.Function,
          insertText:
            '"\\$lookup": {\n\t"from": ${1:collection}$0,\n\t"localField": ${2:field},\n\t"foreignField": ${3:field},\n\t"as": ${4:result}\n}',
          range: range,
          detail: 'stage',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: '"$sort"',
          kind: languages.CompletionItemKind.Function,
          insertText: '"\\$sort": {\n\t${1:field1}$0: ${2:sortOrder}\n}',
          range: range,
          detail: 'stage',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: '"$facet"',
          kind: languages.CompletionItemKind.Function,
          insertText: '"\\$facet": {\n\t${1:outputFieldN}$0: [ ${2:stageN}, ${3:...} ]\n}',
          range: range,
          detail: 'stage',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: '"$addFields"',
          kind: languages.CompletionItemKind.Function,
          insertText: '"\\$addFields": {\n\t${1:newField}: ${2:expression}$0, ${3:...}\n}',
          range: range,
          detail: 'stage',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: '"$count"',
          kind: languages.CompletionItemKind.Function,
          insertText: '"\\$count": "${1:string}"',
          range: range,
          detail: 'stage',
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ],
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
    const provider = new CompletionProvider(monaco, editor);
    const { dispose } = monaco.languages.registerCompletionItemProvider('json', provider);
    autocompleteDisposeFun.current = dispose;
  };
}
