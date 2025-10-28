import { type Monaco } from '@grafana/ui';

export function setupTheme(monaco: Monaco, isDark: boolean) {
  monaco.editor.defineTheme('code-editor-theme', {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'identifier.op', foreground: '#00ab41', fontStyle: 'bold' },
      { token: 'string.op', foreground: '#00ab41', fontStyle: 'bold' },
    ],
    colors: {},
  });
}
