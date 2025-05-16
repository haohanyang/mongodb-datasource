import { monacoTypes, type MonacoEditor, type Monaco } from '@grafana/ui';
import { JSONPath, ParseErrorCode, type JSONVisitor, visit } from 'jsonc-parser';
import { useEffect, useRef } from 'react';

interface ParsedAggregateStages {
  name: string;
  startLine: number;
  startCharacter: number;
  length: number;
}

class CodeLensVisitor implements JSONVisitor {
  private _currentLevel: number;
  private _stages: ParsedAggregateStages[];
  private _hasError: boolean;

  constructor() {
    this._hasError = false;
    this._currentLevel = 0;
    this._stages = [];
  }

  onObjectBegin = (
    offset: number,
    length: number,
    startLine: number,
    startCharacter: number,
    pathSupplier: () => JSONPath,
  ) => {
    if (this._hasError) {
      return false;
    }
    this._currentLevel += 1;
  };

  onObjectProperty = (
    property: string,
    offset: number,
    length: number,
    startLine: number,
    startCharacter: number,
    pathSupplier: () => JSONPath,
  ) => {
    if (this._currentLevel === 1) {
      this._stages.push({
        name: property,
        startLine: startLine,
        startCharacter: startCharacter,
        length: length,
      });
    }
  };

  onObjectEnd = (offset: number, length: number, startLine: number, startCharacter: number) => {
    this._currentLevel -= 1;
  };

  onError = (error: ParseErrorCode, offset: number, length: number, startLine: number, startCharacter: number) => {
    this._hasError = true;
  };

  public get stages(): ParsedAggregateStages[] {
    return this._stages;
  }

  public get hasError(): boolean {
    return this._hasError;
  }
}

class CodeLensProvider implements monacoTypes.languages.CodeLensProvider {
  constructor(private readonly editor: MonacoEditor) {}

  provideCodeLenses(
    model: monacoTypes.editor.ITextModel,
    _token: monacoTypes.CancellationToken,
  ): monacoTypes.languages.ProviderResult<monacoTypes.languages.CodeLensList> {
    if (this.editor.getModel()?.id !== model.id) {
      return null;
    }

    const text = model.getValue();
    const visitor = new CodeLensVisitor();
    visit(text, visitor);

    if (visitor.hasError) {
      return null;
    }

    const stages = visitor.stages;
    return {
      lenses: stages.map((stage) => ({
        range: {
          startLineNumber: stage.startLine,
          startColumn: stage.startCharacter,
          endLineNumber: stage.startLine,
          endColumn: stage.startCharacter + stage.length,
        },
        command: {
          id: 'mongodb.aggregate.stage',
          title: `Stage: ${stage.name}`,
        },
      })),
      dispose: () => {},
    };
  }

  resolveCodeLens(
    _model: monacoTypes.editor.ITextModel,
    codeLens: monacoTypes.languages.CodeLens,
    _token: monacoTypes.CancellationToken,
  ): monacoTypes.languages.ProviderResult<monacoTypes.languages.CodeLens> {
    return codeLens;
  }
}

export function useCodeLens() {
  const codeLensDisposeFun = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      codeLensDisposeFun.current?.();
    };
  }, []);

  return (editor: MonacoEditor, monaco: Monaco) => {
    const provider = new CodeLensProvider(editor);
    const { dispose } = monaco.languages.registerCodeLensProvider('json', provider);
    codeLensDisposeFun.current = dispose;
  };
}
