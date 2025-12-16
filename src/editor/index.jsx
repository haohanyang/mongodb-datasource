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

const initQuery = `
[
	{
		$match: {
			key: "value"
		}
	}
]
`;

function App() {
  const [query, setQuery] = useState(initQuery.trim());
  const [language, setLanguage] = useState('javascript');
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
    <main
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
      }}
    >
      <QueryEditorRaw query={query} onBlur={setQuery} language={language} width={500} height={500} fontSize={14} />

      <div style={{ marginTop: 10 }}>
        <label htmlFor="language-select">Language:</label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setParseResult('');
          }}
        >
          <option value="json">JSON</option>
          <option value="javascript">JavaScript</option>
        </select>
        <button onClick={parseFilterHandler} disabled={language !== 'javascript'} style={{ marginLeft: 10 }}>
          Parse filter
        </button>
      </div>
      {language === 'javascript' && <code>{parseResult}</code>}
    </main>
  );
}

setMonacoEnv();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
