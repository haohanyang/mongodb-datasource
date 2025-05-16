import { monacoTypes, type MonacoEditor, type Monaco } from '@grafana/ui';
import { JSONPath, ParseErrorCode, type JSONVisitor, visit } from 'jsonc-parser';
import { useEffect, useRef } from 'react';

interface ParsedAggregateStages {
  name: string;
  startLine: number;
  startColumn: number;
  startOffset: number;
  endOffset: number;
}

class CodeLensVisitor implements JSONVisitor {
  private _currentLevel: number;
  private _stages: ParsedAggregateStages[];
  private _seperators: number[];
  private _hasError: boolean;
  private _startLine: number;
  private _startColumn: number;
  private _startOffset: number;
  private _stageName?: string;

  constructor() {
    this._hasError = false;
    this._currentLevel = 0;
    this._stages = [];
    this._seperators = [];
    this._startLine = 0;
    this._startOffset = 0;
    this._startColumn = 0;
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

    if (this._currentLevel === 1) {
      this._startLine = startLine;
      this._startOffset = offset;
      this._startColumn = startCharacter;
    }
    return;
  };

  onObjectProperty = (
    property: string,
    offset: number,
    length: number,
    startLine: number,
    startCharacter: number,
    _pathSupplier: () => JSONPath,
  ) => {
    if (this._currentLevel === 1) {
      this._stageName = property;
    }
  };

  onObjectEnd = (offset: number, _length: number, _startLine: number, _startCharacter: number) => {
    if (!this._stageName) {
      this._hasError = true;
    } else {
      if (this._currentLevel === 1) {
        this._stages.push({
          name: this._stageName,
          startLine: this._startLine,
          startOffset: this._startOffset,
          startColumn: this._startColumn,
          endOffset: offset,
        });
      }
    }
    this._currentLevel -= 1;
  };

  onSeparator = (character: string, offset: number, _length: number, _startLine: number, _startCharacter: number) => {
    if (character === ',' && this._currentLevel === 0) {
      this._seperators.push(offset)
    }
  }

  onError = (_error: ParseErrorCode, _offset: number, _length: number, _startLine: number, _startCharacter: number) => {
    this._hasError = true;
  };

  public get stages(): ParsedAggregateStages[] {
    return this._stages;
  }

  public get seperators(): number[] {
    return this._seperators;
  }

  public get hasError(): boolean {
    return this._hasError;
  }
}

class CodeLensProvider implements monacoTypes.languages.CodeLensProvider {
  constructor(private readonly editor: MonacoEditor, private readonly updateTextCommandId: string) { }

  provideCodeLenses(
    model: monacoTypes.editor.ITextModel,
    _token: monacoTypes.CancellationToken,
  ): monacoTypes.languages.ProviderResult<monacoTypes.languages.CodeLensList> {
    if (this.editor.getModel()?.id !== model.id) {
      return null;
    }

    const lenses: monacoTypes.languages.CodeLens[] = []

    const text = model.getValue();
    const visitor = new CodeLensVisitor();
    visit(text, visitor);

    if (visitor.hasError) {
      return null;
    }

    const stages = visitor.stages;
    const seperators = visitor.seperators;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      const range = {
        startLineNumber: stage.startLine + 1,
        startColumn: stage.startColumn,
        endLineNumber: stage.startLine + 2,
        endColumn: stage.startColumn
      }

      lenses.push({
        range,
        // @ts-ignore
        command: {
          title: `Stage ${stage.name}`
        },
      });

      // Remove text from start - end
      let start, end;

      if (i == 0) {
        start = stage.startOffset;
        end = seperators.length > 0 ? seperators[0] + 1 : stage.endOffset + 1;
      } else if (i == stages.length - 1) {
        start = seperators[seperators.length - 1];
        end = stage.endOffset + 1;
      } else {
        start = stage.startOffset;
        end = seperators.length > 0 ? seperators[i] + 1 : stage.endOffset + 1;
      }

      lenses.push({
        range,
        command: {
          id: this.updateTextCommandId,
          title: "Delete",
          arguments: [text.slice(0, start) + text.slice(end)]
        },
      });
    }

    return {
      lenses: lenses,
      dispose: () => { },
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

  return (editor: MonacoEditor, monaco: Monaco, updateTextCommandId: string) => {
    const provider = new CodeLensProvider(editor, updateTextCommandId);
    const { dispose } = monaco.languages.registerCodeLensProvider('json', provider);
    codeLensDisposeFun.current = dispose;
  };
}
