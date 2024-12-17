import React from "react";
import { QueryEditorHelpProps } from "@grafana/data";
import { Divider, Text } from "@grafana/ui";

export function QueryHelper(_props: QueryEditorHelpProps) {
  return (
    <div>
      <Text element="h1" color="primary">
        Query Language Types and Differences
      </Text>

      <Divider></Divider>
      <div>
        <p>
          <Text element="span" weight="bold" color="info">
            JSON
          </Text>
          : JSON aggregate of mongodb query.
        </p>
        <p>
          <Text element="span" weight="bold" color="info">
            JavaScript
          </Text>
          :JavaScript aggregate of mongodb query for the legacy support
        </p>
        <p>
          <Text element="span" weight="bold" color="info">
            JavaScript Shadow
          </Text>
          : JavaScript function that return aggregate of mongodb query with evaluation
          support.
        </p>
      </div>
    </div>
  );
}
