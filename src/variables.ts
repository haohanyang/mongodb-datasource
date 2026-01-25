import { CustomVariableSupport, DataQueryRequest, DataQueryResponse } from '@grafana/data';
import { MongoDBDataSource } from 'datasource';
import { from, map, Observable } from 'rxjs';
import { VariableQueryEditor } from './components/VariableQueryEditor';
import { MongoDBVariableQuery } from 'types';

// Query variable support
export class MongoDBVariableSupport extends CustomVariableSupport<MongoDBDataSource> {
  constructor(private readonly datasource: MongoDBDataSource) {
    super();
  }

  query(request: DataQueryRequest<MongoDBVariableQuery>): Observable<DataQueryResponse> {
    const [target] = request.targets;
    const result = this.datasource.metricFindQuery({
      refId: target.refId,
      query: target.query,
      collection: target.collection,
    });
    return from(result).pipe(map((data) => ({ data })));
  }

  editor = VariableQueryEditor;
}
