import * as monaco from 'monaco-editor';
import { CompletionProvider } from './autocomplete';
import { CodeLensProvider } from './codelens';
import { HoverProvider } from './hover';
import './index.css';

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

const editor = monaco.editor.create(document.body, {
  value: '',
  language: 'javascript',
});

monaco.languages.registerCompletionItemProvider('javascript', new CompletionProvider(editor));

monaco.languages.registerCodeLensProvider('json', new CodeLensProvider(editor, ''));

monaco.languages.registerHoverProvider('json', new HoverProvider(editor));
