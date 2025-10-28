import React, { useRef, useCallback } from 'react';
import { CodeEditor, type MonacoEditor, useTheme2 } from '@grafana/ui';
import { useAutocomplete } from '../editor/autocomplete';
import { useValidation } from '../editor/validation';
import { useHover } from '../editor/hover';
import { useCodeLens } from '../editor/codelens';
import { useMongoLibs } from 'editor/mongolibs';

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
  const theme = useTheme2();

  const monacoRef = useRef<MonacoEditor | null>(null);

  const setupAutocompleteFn = useAutocomplete();
  const setupHoverFn = useHover();
  const setupValidationFn = useValidation();
  const setupCodeLensFn = useCodeLens();
  const setupMongoLibsFn = useMongoLibs();

  const formatQuery = useCallback(() => {
    if (monacoRef.current) {
      monacoRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  return (
    <div style={{ width }}>
      <CodeEditor
        onBeforeEditorMount={(monaco) => {
          monaco.editor.defineTheme('code-editor-theme', {
            base: theme.isDark ? 'vs-dark' : 'vs',
            inherit: true,
            rules: [{ token: 'identifier.js', foreground: theme.isDark ? '#00c04b' : '#00ab41' }],
            colors: {},
          });
        }}
        onEditorDidMount={(editor, monaco) => {
          monacoRef.current = editor;
          setupValidationFn(editor, monaco);
          setupAutocompleteFn(editor, monaco);
          setupHoverFn(editor, monaco);
          setupMongoLibsFn(editor, monaco);

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
        monacoOptions={fontSize ? { fontSize: fontSize, codeLens: true, theme: 'code-editor-theme' } : undefined}
      />
      {children && children({ formatQuery })}
    </div>
  );
}
