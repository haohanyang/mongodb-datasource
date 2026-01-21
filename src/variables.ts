import { CustomVariableSupport, DataFrameSchema, DataQueryRequest, DataQueryResponse, FieldType } from '@grafana/data';
import { MongoDBDataSource } from 'datasource';
import { map, Observable } from 'rxjs';
import { VariableQueryEditor } from './components/VariableQueryEditor';
import { MongoDBVariableQuery } from 'types';

export class MongoDBVariableSupport extends CustomVariableSupport<MongoDBDataSource> {
  constructor(private readonly datasource: MongoDBDataSource) {
    super();
  }

  query(request: DataQueryRequest<MongoDBVariableQuery>): Observable<DataQueryResponse> {
    return this.datasource
      .query(request)
      .pipe(
        map((response) => {
          if (response.errors?.length && response.errors.length > 0) {
            throw new Error(response.errors.map((e) => e.message ?? 'Unknown error').join('\n'));
          }

          const dataframe = response.data[0] as DataFrameSchema;
          const valueField = dataframe.fields.find((f) => f.name === 'value');
          const textField = dataframe.fields.find((f) => f.name === 'text');

          if (!valueField) {
            throw new Error('Field "value" not found');
          }

          if (valueField.type !== FieldType.string && valueField.type !== FieldType.number) {
            throw new Error('Each element of "value" should be string or number');
          }

          if (textField && textField.type !== FieldType.string && textField.type !== FieldType.number) {
            throw new Error('Each element of "text" should be string or number');
          }

          // @ts-ignore
          const valueFieldValues: Array<number | string> = valueField.values;
          // @ts-ignore
          const textFieldValues: Array<number | string> | undefined = textField?.values;

          // @ts-ignore
          const metricFindValues: MetricFindValue[] = valueFieldValues.map((value: string | number, idx: number) => ({
            text: textFieldValues ? textFieldValues[idx].toString() : value.toString(),
            value: value,
            expandable: true,
          }));

          return metricFindValues;
        }),
      )
      .pipe(map((results) => ({ data: results })));
  }

  editor = VariableQueryEditor;
}
