import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { monacoLanguageRegistry } from '@grafana/data';
import { QueryEditorRaw } from '../components/QueryEditorRaw';
import { parseFilter } from 'mongodb-query-parser';
import { EJSON } from 'bson';

function setMonacoEnv() {
  self.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      const language = monacoLanguageRegistry.getIfExists(label);

      if (language) {
        return language.init();
      }

      if (label === 'json') {
        return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url));
      }

      if (label === 'typescript' || label === 'javascript') {
        return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url));
      }

      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
    },
  };
}

const initJSQuery = `
[
	{
		$match: {
			key: "value"
		}
	}
]
`;

const initJsonQuery = JSON.stringify(
  [
    {
      $match: {
        key: 'value',
      },
    },
  ],
  null,
  2,
);

function App({ language }) {
  const [query, setQuery] = useState(language === 'javascript' ? initJSQuery.trim() : initJsonQuery.trim());
  const [parseResult, setParseResult] = useState('');

  const parseFilterHandler = () => {
    try {
      const result = EJSON.stringify(parseFilter(query), null, 2);
      setParseResult(result);
    } catch (err) {
      setParseResult(err.message);
    }
  };

  return (
    <div id="editor-container">
      <QueryEditorRaw query={query} onBlur={setQuery} language={language} height={500} fontSize={14} />
      {language === 'javascript' && (
        <div style={{ marginTop: 10 }}>
          <button
            className="md-button"
            onClick={parseFilterHandler}
            disabled={language !== 'javascript'}
            style={{ marginLeft: 10 }}
          >
            Parse filter
          </button>
          {parseResult && (
            <div>
              <pre>
                <code>{parseResult}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

setMonacoEnv();

const jsEditorElement = document.getElementById('editor-js');
if (jsEditorElement) {
  const root = createRoot(jsEditorElement);
  root.render(<App language="javascript" />);
}

const jsonEditorElement = document.getElementById('editor-json');
if (jsonEditorElement) {
  const root = createRoot(jsonEditorElement);
  root.render(<App language="json" />);
}
