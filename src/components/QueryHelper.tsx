import React from 'react';
import { QueryEditorHelpProps } from '@grafana/data';
import { Text, TextLink } from '@grafana/ui';
import packageJson from '../../package.json';

export function QueryHelper(_props: QueryEditorHelpProps) {
  return (
    <Text element="p">
      Check details in <span> </span>
      <TextLink href={`https://github.com/haohanyang/mongodb-datasource/tree/v${packageJson.version}`} external inline>
        repository
      </TextLink>
    </Text>
  );
}
