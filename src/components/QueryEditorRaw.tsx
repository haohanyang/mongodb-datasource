import React, { useRef, useCallback } from 'react';
import { CodeEditor, type MonacoEditor } from '@grafana/ui';
import { useAutocomplete } from 'autocomplete';

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

  const formatQuery = useCallback(() => {
    if (monacoRef.current) {
      monacoRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  return (
    <div style={{ width }}>
      <CodeEditor
        onEditorDidMount={(editor, monaco) => {
          monacoRef.current = editor;
          setupAutocompleteFn(editor, monaco);
        }}
        height={height || '240px'}
        width={width ? `${width - 2}px` : undefined}
        language={language}
        onBlur={onBlur}
        value={query}
        showMiniMap={false}
        showLineNumbers={true}
        monacoOptions={fontSize ? { fontSize: fontSize } : undefined}
      />
      {children && children({ formatQuery })}
    </div>
  );
}
