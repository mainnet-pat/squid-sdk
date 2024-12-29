import { FieldSelection } from '../interfaces/data.js';
import { DataRequest } from '../interfaces/data-request.js';
import { DataRequest as RpcDataRequest } from './rpc-data.js';
export interface MappingRequest extends RpcDataRequest {
    fields: FieldSelection;
    transactionList: boolean;
    dataRequest: DataRequest;
}
export declare function toMappingRequest(req?: DataRequest): MappingRequest;
//# sourceMappingURL=request.d.ts.map