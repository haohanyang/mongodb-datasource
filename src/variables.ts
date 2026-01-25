import { CustomVariableSupport, DataQueryRequest, DataQueryResponse } from '@grafana/data';
import { MongoDBDataSource } from 'datasource';
import { getTemplateSrv } from '@grafana/runtime';
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

    const interpolated = getTemplateSrv().replace(target.queryText);

    const result = this.datasource.metricFindQuery({
      refId: target.refId,
      queryText: interpolated,
      collection: target.collection,
    });
    return from(result).pipe(map((data) => ({ data })));
  }

  editor = VariableQueryEditor;
}
