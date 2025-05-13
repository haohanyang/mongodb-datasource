import { CustomVariableSupport, DataQueryRequest, DataQueryResponse, QueryEditorProps, StandardVariableQuery, StandardVariableSupport } from '@grafana/data';
import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { MongoDBDataSource } from 'datasource';
import { Observable } from 'rxjs';
import { VariableQueryEditor } from './components/VariableQueryEditor';


export class MongoDBVariableSupport extends CustomVariableSupport<MongoDBDataSource> {
  constructor(
    private readonly datasource: MongoDBDataSource,
    private readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super();
  }
  query(request: DataQueryRequest<any>): Observable<DataQueryResponse> {
    throw new Error('Method not implemented.');
  }

  editor = VariableQueryEditor
}
