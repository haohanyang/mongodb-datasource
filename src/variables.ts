import {
  CustomVariableSupport,
  DataQueryRequest,
  DataQueryResponse,
  FieldType,
  MutableDataFrame,
} from '@grafana/data';
import { MongoDBDataSource } from 'datasource';
import { getTemplateSrv } from '@grafana/runtime';
import { VariableQueryEditor } from './components/VariableQueryEditor';
import { MongoDBVariableQuery } from 'types';

// Query variable support
export class MongoDBVariableSupport extends CustomVariableSupport<MongoDBDataSource> {
  constructor(private readonly datasource: MongoDBDataSource) {
    super();
  }

  query(request: DataQueryRequest<MongoDBVariableQuery>): Promise<DataQueryResponse> {
    const [target] = request.targets;

    const interpolated = getTemplateSrv().replace(target.queryText);

    return this.datasource.metricFindQuery({
      refId: target.refId,
      queryText: interpolated,
      collection: target.collection,
    }).then((metricFindValues) => {
      const frame = new MutableDataFrame({
        name: 'variable_query_result',
        fields: [
          {
            name: '__text',
            type: FieldType.string,
            values: metricFindValues.map((v) => v.text),
          },
          {
            name: '__value',
            type: FieldType.string,
            values: metricFindValues.map((v) =>
              v.value !== undefined ? String(v.value) : String(v.text)
            ),
          },
        ],
      });

      return {
        data: [frame],
      };
    });
  }

  editor = VariableQueryEditor;
}
