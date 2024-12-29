import { formatId } from '@subsquid/util-internal-processor-tools';
export class Block {
    header;
    transactions = [];
    constructor(header) {
        this.header = header;
    }
}
export class BlockHeader {
    id;
    height;
    hash;
    parentHash;
    nonce;
    difficulty;
    size;
    timestamp;
    constructor(height, hash, parentHash) {
        this.id = formatId({ height, hash });
        this.height = height;
        this.hash = hash;
        this.parentHash = parentHash;
    }
}
export class Transaction {
    id;
    transactionIndex;
    hash;
    size;
    sourceOutputs;
    inputs;
    locktime;
    outputs;
    version;
    #block;
    constructor(block, transactionIndex) {
        this.id = formatId(block, transactionIndex);
        this.transactionIndex = transactionIndex;
        this.#block = block;
    }
    get block() {
        return this.#block;
    }
}
//# sourceMappingURL=entities.js.map