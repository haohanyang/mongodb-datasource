import { Monaco, MonacoEditor } from '@grafana/ui';
// @ts-ignore
import mongoLibSource from './mongo-constructors.txt';
import { useEffect, useRef } from 'react';

const libUri = 'ts:filename/mongo.d.ts';

export function useMongoLibs() {
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
    const { dispose } = monaco.languages.typescript.javascriptDefaults.addExtraLib(mongoLibSource, libUri);
    mongoLibsDisposeFun.current = dispose;
  };
}
