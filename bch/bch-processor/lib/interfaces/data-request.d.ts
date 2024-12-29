import { FieldSelection } from './data.js';
export interface DataRequest {
    fields?: FieldSelection;
    includeAllBlocks?: boolean;
    transactions?: TransactionRequest[];
    sourceOutputs?: boolean;
    fee?: boolean;
}
export interface TransactionRequest {
}
//# sourceMappingURL=data-request.d.ts.map