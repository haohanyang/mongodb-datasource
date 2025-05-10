import React from 'react';
import { css } from '@emotion/css';
import { useMemo, useState } from 'react';
import { Stack, IconButton, useTheme2 } from '@grafana/ui';

interface QueryToolboxProps {
  showTools?: boolean;
  isExpanded?: boolean;
  onFormatCode?: () => void;
  onExpand?: (expand: boolean) => void;
  onValidate?: (isValid: boolean) => void;
  error?: string;
}

interface QueryErrorProps {
  error?: string;
}

export function QueryToolbox({ showTools, onFormatCode, onExpand, isExpanded, error }: QueryToolboxProps) {
  const theme = useTheme2();
  const [validationResult, _] = useState<boolean>();

  const styles = useMemo(() => {
    return {
      container: css`
        border: 1px solid ${theme.colors.border.medium};
        border-top: none;
        padding: ${theme.spacing(0.5, 0.5, 0.5, 0.5)};
        display: flex;
        flex-grow: 1;
        justify-content: space-between;
        font-size: ${theme.typography.bodySmall.fontSize};
      `,
      error: css`
        color: ${theme.colors.error.text};
        font-size: ${theme.typography.bodySmall.fontSize};
        font-family: ${theme.typography.fontFamilyMonospace};
      `,
      valid: css`
        color: ${theme.colors.success.text};
      `,
      info: css`
        color: ${theme.colors.text.secondary};
      `,
      hint: css`
        color: ${theme.colors.text.disabled};
        white-space: nowrap;
        cursor: help;
      `,
    };
  }, [theme]);

  let style = {};

  if (!showTools && validationResult === undefined) {
    style = { height: 0, padding: 0, visibility: 'hidden' };
  }

  return (
    <div className={styles.container} style={style}>
      <div>
        <QueryError error={error} />
      </div>
      {showTools && (
        <Stack direction="row" wrap alignItems="flex-end" justifyContent="end">
          {onFormatCode && <IconButton onClick={onFormatCode} name="brackets-curly" size="xs" tooltip="Format query" />}
          {onExpand && (
            <IconButton
              onClick={() => onExpand(!isExpanded)}
              name={isExpanded ? 'angle-up' : 'angle-down'}
              size="xs"
              tooltip={isExpanded ? 'Collapse editor' : 'Expand editor'}
            />
          )}
        </Stack>
      )}
    </div>
  );
}

function QueryError({ error }: QueryErrorProps) {
  const theme = useTheme2();

  const styles = useMemo(() => {
    return {
      error: css({
        color: theme.colors.error.text,
        fontSize: theme.typography.bodySmall.fontSize,
        fontFamily: theme.typography.fontFamilyMonospace,
      }),
      valid: css({
        color: theme.colors.success.text,
      }),
      info: css({
        color: theme.colors.text.secondary,
      }),
    };
  }, [theme]);

  return <>{error && <div className={styles.error}>{error}</div>}</>;
}
