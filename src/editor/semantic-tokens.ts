import { useEffect, useRef } from 'react';
import { type Monaco, type monacoTypes, type MonacoEditor } from '@grafana/ui';
import { STAGE_OPERATORS } from '@mongodb-js/mongodb-constants';

const legend = {
  tokenTypes: ['identifier', 'string'],
  tokenModifiers: ['op'],
};

function getType(type: string) {
  return legend.tokenTypes.indexOf(type);
}

function getModifier(modifiers: string[] | string) {
  if (typeof modifiers === 'string') {
    modifiers = [modifiers];
  }
  if (Array.isArray(modifiers)) {
    let nModifiers = 0;
    for (let modifier of modifiers) {
      const nModifier = legend.tokenModifiers.indexOf(modifier);
      if (nModifier > -1) {
        nModifiers |= (1 << nModifier) >>> 0;
      }
    }
    return nModifiers;
  } else {
    return 0;
  }
}
const ops = Array.from(new Set(STAGE_OPERATORS.map((op) => op.value)));
const opsJS = ops.map((op) => `\\${op}`);
const opsJSON = ops.map((op) => `\\"\\${op}\\"`);

const tokenPatternJS = new RegExp(`(${opsJS.join('|')}):`, 'g');
const tokenPatternJSON = new RegExp(`(${opsJSON.join('|')}):`, 'g');

export class SemanticTokensProvider implements monacoTypes.languages.DocumentSemanticTokensProvider {
  constructor(private readonly editor: MonacoEditor) { }

  getLegend(): monacoTypes.languages.SemanticTokensLegend {
    return legend;
  }
  provideDocumentSemanticTokens(
    model: monacoTypes.editor.ITextModel,
    lastResultId: string | null,
    token: monacoTypes.CancellationToken,
  ): monacoTypes.languages.ProviderResult<monacoTypes.languages.SemanticTokens> {
    const data: number[] = [];

    if (this.editor.getModel()?.id !== model.id) {
      return {
        data: new Uint32Array(data),
      };
    }

    const language = model.getLanguageId();
    const lines = model.getLinesContent();

    const tokenPattern = language === 'javascript' ? tokenPatternJS : tokenPatternJSON;

    let prevLine = 0;
    let prevChar = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (let match = null; (match = tokenPattern.exec(line));) {
        const type = language === 'javascript' ? getType('identifier') : getType('string');
        const modifier = getModifier('op');

        data.push(
          i - prevLine,
          prevLine === i ? match.index - prevChar : match.index,
          match[0].length - 1,
          type,
          modifier,
        );

        prevLine = i;
        prevChar = match.index;
      }
    }
    return {
      data: new Uint32Array(data),
    };
  }
  releaseDocumentSemanticTokens(resultId?: string): void { }
}

export function useSemanticTokens() {
  const semanticTokensDisposeFun = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      semanticTokensDisposeFun.current?.();
    };
  }, []);

  return (editor: MonacoEditor, monaco: Monaco) => {
    const provider = new SemanticTokensProvider(editor);
    const { dispose } = monaco.languages.registerDocumentSemanticTokensProvider(['javascript', 'json'], provider);

    semanticTokensDisposeFun.current = dispose;
  };
}
