import { Monaco, MonacoEditor } from '@grafana/ui';
// @ts-ignore
import libSource from './lib-source.txt';
import { useEffect, useRef } from 'react';

const libUri = 'ts:filename/mongodb-datasource.d.ts';

export function useJsLibs() {
  const mongoLibsDisposeFun = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      mongoLibsDisposeFun.current?.();
    };
  }, []);

  return (editor: MonacoEditor, monaco: Monaco) => {
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
      lib: ['es5'],
      allowUnusedLabels: true,
    });

    const { dispose } = monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUri);
    mongoLibsDisposeFun.current = dispose;
  };
}
