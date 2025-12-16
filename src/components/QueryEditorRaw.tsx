import React, { useRef, useCallback } from 'react';
import { CodeEditor, type MonacoEditor, type monacoTypes } from '@grafana/ui';
import { useAutocomplete } from '../editor/autocomplete';
import { useValidation } from '../editor/validation';
import { useHover } from '../editor/hover';
import { useCodeLens } from '../editor/codelens';
import { useJsLibs } from '../editor/jslibs';
import { useSemanticTokens } from '../editor/semantic-tokens';

interface QueryEditorRawProps {
  query: string;
  onBlur?: (text: string) => void;
  language: string;
  children?: (props: { formatQuery: () => void }) => React.ReactNode;
  width?: number;
  height?: number;
  fontSize: number;
}

export function QueryEditorRaw({ query, onBlur, language, width, height, fontSize, children }: QueryEditorRawProps) {
  const monacoRef = useRef<MonacoEditor | null>(null);

  const setupAutocompleteFn = useAutocomplete();
  const setupHoverFn = useHover();
  const setupValidationFn = useValidation();
  const setupCodeLensFn = useCodeLens();
  const setupMongoLibsFn = useJsLibs();
  const setupSemanticTokensFn = useSemanticTokens();

  const formatQuery = useCallback(() => {
    if (monacoRef.current) {
      monacoRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  return (
    <div style={{ width }}>
      <CodeEditor
        onEditorDidMount={(editor, monaco) => {
          // @ts-ignore
          const themeData: monacoTypes.editor.IStandaloneThemeData = editor._themeService._theme.themeData;
          monaco.editor.defineTheme('code-editor-theme', {
            ...themeData,
            rules: [
              ...themeData.rules,
              { token: 'identifier.op', foreground: '#00ab41', fontStyle: 'bold' },
              { token: 'string.op', foreground: '#00ab41', fontStyle: 'bold' },
            ],
          });

          monacoRef.current = editor;
          setupValidationFn(editor, monaco);
          setupAutocompleteFn(editor, monaco);
          setupHoverFn(editor, monaco);
          setupMongoLibsFn(editor, monaco);
          setupSemanticTokensFn(editor, monaco);

          const updateTextCommandId = editor.addCommand(0, (_ctx, ...args) => {
            const text = args[0];
            onBlur?.(text);
          });

          setupCodeLensFn(editor, monaco, updateTextCommandId!);

          monaco.editor.setTheme('code-editor-theme');
        }}
        height={height || '240px'}
        width={width ? `${width - 2}px` : undefined}
        language={language}
        onBlur={onBlur}
        value={query}
        showMiniMap={false}
        showLineNumbers={true}
        monacoOptions={{
          fontSize: fontSize,
          codeLens: true,
          'semanticHighlighting.enabled': true,
        }}
      />
      {children && children({ formatQuery })}
    </div>
  );
}
