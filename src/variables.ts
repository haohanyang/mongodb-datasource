import { CustomVariableSupport, DataFrameSchema, DataQueryRequest, DataQueryResponse, FieldType } from '@grafana/data';
import { MongoDBDataSource } from 'datasource';
import { map, Observable } from 'rxjs';
import { VariableQueryEditor } from './components/VariableQueryEditor';
import { MongoDBVariableQuery } from 'types';


export class MongoDBVariableSupport extends CustomVariableSupport<MongoDBDataSource> {
  constructor(
    private readonly datasource: MongoDBDataSource
  ) {
    super();
  }

  query(request: DataQueryRequest<MongoDBVariableQuery>): Observable<DataQueryResponse> {
    return this.datasource.query(request).pipe(
      map((response) => {
        if (response.errors?.length && response.errors.length > 0) {
          throw new Error(response.errors.map(e => e.message ?? 'Unknown error').join('\n'));
        }

        const dataframe = response.data[0] as DataFrameSchema;
        console.log(dataframe);
        const field = dataframe.fields.find((f) => f.name === 'value');

        if (!field) {
          throw new Error('Field "value" not found');
        }

        if (field.type !== FieldType.string && field.type !== FieldType.number) {
          throw new Error('Each element should be string or number');
        }

        // @ts-ignore
        const metricFindValues: MetricFindValue[] = field.values.map((value: string | number) => ({
          text: value.toString(),
          value: value,
          expandable: true,
        }));

        return metricFindValues;
      })).pipe(map((results) => ({ data: results })))

  }

  editor = VariableQueryEditor
}
