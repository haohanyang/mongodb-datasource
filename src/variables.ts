import {
  CustomVariableSupport,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  FieldType,
} from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { from, Observable } from 'rxjs';
import { MongoDBDataSource } from 'datasource';
import { VariableQueryEditor } from './components/VariableQueryEditor';
import { MongoDBVariableQuery } from 'types';

// Query variable support
export class MongoDBVariableSupport extends CustomVariableSupport<MongoDBDataSource> {
  constructor(private readonly datasource: MongoDBDataSource) {
    super();
  }

  query(request: DataQueryRequest<MongoDBVariableQuery>): Observable<DataQueryResponse> {
    const [target] = request.targets;
    const interpolated = getTemplateSrv().replace(target.queryText);

    return from(
      this.datasource
        .metricFindQuery({
          refId: target.refId,
          queryText: interpolated,
          collection: target.collection,
        })
        .then((metricFindValues) => {
          const frame: DataFrame = {
            name: 'variable_query_result',
            fields: [
              {
                name: 'text',
                type: FieldType.string,
                values: metricFindValues.map((v) => v.text),
                config: {},
              },
              {
                name: 'value',
                type: FieldType.string,
                values: metricFindValues.map((v) =>
                  v.value !== undefined ? String(v.value) : String(v.text)
                ),
                config: {},
              },
            ],
            length: metricFindValues.length,
          };

          return {
            data: [frame],
          };
        })
    );
  }

  editor = VariableQueryEditor;
}
