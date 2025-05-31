import React, { useRef, useCallback } from 'react';
import { CodeEditor, type MonacoEditor } from '@grafana/ui';
import { useAutocomplete } from '../editor/autocomplete';
import { useValidation } from '../editor/validation';
import { useHover } from '../editor/hover';
import { useCodeLens } from '../editor/codelens';

interface QueryEditorRawProps {
  query: string;
  onBlur?: (text: string) => void;
  language: string;
  children?: (props: { formatQuery: () => void }) => React.ReactNode;
  width?: number;
  height?: number;
  fontSize?: number;
}

export function QueryEditorRaw({ query, onBlur, language, width, height, fontSize, children }: QueryEditorRawProps) {
  const monacoRef = useRef<MonacoEditor | null>(null);

  const setupAutocompleteFn = useAutocomplete();
  const setupHoverFn = useHover();
  const setupValidationFn = useValidation();
  const setupCodeLensFn = useCodeLens();

  const formatQuery = useCallback(() => {
    monacoRef.current?.getAction('editor.action.formatDocument').run();
  }, []);

  return (
    <div style={{ width }}>
      <CodeEditor
        onEditorDidMount={(editor, monaco) => {
          monacoRef.current = editor;
          setupValidationFn(editor, monaco);
          setupAutocompleteFn(editor, monaco, language);
          setupHoverFn(editor, monaco);

          const updateTextCommandId = editor.addCommand(0, (_ctx, ...args) => {
            const text = args[0];
            onBlur?.(text);
          });

          setupCodeLensFn(editor, monaco, updateTextCommandId!);
        }}
        height={height || '240px'}
        width={width ? `${width - 2}px` : undefined}
        language={language}
        onBlur={onBlur}
        value={query}
        showMiniMap={false}
        showLineNumbers={true}
        monacoOptions={fontSize ? { fontSize: fontSize, codeLens: true } : undefined}
      />
      {children && children({ formatQuery })}
    </div>
  );
}
