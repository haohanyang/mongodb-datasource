import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CodeEditor } from '@grafana/ui';
import { parseFilter } from 'mongodb-query-parser';
import { EJSON } from 'bson';
import { useAutocomplete } from './autocomplete';
import { useHover } from './hover';
import { useValidation } from './validation';
import { useCodeLens } from './codelens';
import { useMongoLibs } from './mongolibs';

self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return './json.worker.bundle.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return './ts.worker.bundle.js';
    }
    return './editor.worker.bundle.js';
  },
};

function App() {
  const monacoRef = useRef(null);
  const [text, setText] = useState('');
  const [language, setLanguage] = useState(0);
  const [parseResult, setParseResult] = useState('');

  const setupAutocompleteFn = useAutocomplete();
  const setupHoverFn = useHover();
  const setupValidationFn = useValidation();
  const setupCodeLensFn = useCodeLens();
  const setupMongoLibsFn = useMongoLibs();

  const parseFilterHandler = () => {
    try {
      const result = EJSON.stringify(parseFilter(text));
      setParseResult(result);
    } catch (err) {
      setParseResult(err.message);
    }
  };

  return (
    <main>
      <CodeEditor
        onEditorDidMount={(editor, monaco) => {
          monacoRef.current = editor;
          setupValidationFn(editor, monaco);
          setupAutocompleteFn(editor, monaco);
          setupHoverFn(editor, monaco);
          setupMongoLibsFn(editor, monaco);

          const updateTextCommandId = editor.addCommand(0, (_ctx, ...args) => {
            const text = args[0];
            setText(text);
          });

          setupCodeLensFn(editor, monaco, updateTextCommandId);
        }}
        height="600px"
        width="800px"
        language={language === 0 ? 'json' : 'javascript'}
        onBlur={(val) => setText(val)}
        value={text}
        showMiniMap={false}
        showLineNumbers={true}
        monacoOptions={{ codeLens: true, showUnused: false }}
      />
      <div>
        <label htmlFor="language-select">Language:</label>
        <select id="language-select" value={language} onChange={(e) => setLanguage(Number(e.target.value))}>
          <option value={0}>JSON</option>
          <option value={1}>JavaScript</option>
        </select>
      </div>
      {language == 1 && (
        <>
          <div>
            <button onClick={parseFilterHandler}>Parse filter</button>
          </div>
          <code>{parseResult}</code>
        </>
      )}
    </main>
  );
}

const root = createRoot(document.getElementById('root'));

root.render(<App />);
