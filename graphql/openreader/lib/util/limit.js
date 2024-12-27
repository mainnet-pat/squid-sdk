"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseSizeLimit = exports.Limit = void 0;
const apollo_server_core_1 = require("apollo-server-core");
const assert_1 = __importDefault(require("assert"));
class Limit {
    constructor(error, value) {
        this.error = error;
        this.value = value;
        (0, assert_1.default)(this.value > 0);
    }
    get left() {
        return Math.max(this.value, 0);
    }
    check(cb) {
        if (this.value < 0)
            throw this.error;
        let left = this.value - cb(this.value);
        if (left < 0) {
            throw this.error;
        }
        else {
            this.value = left;
        }
    }
}
exports.Limit = Limit;
const SIZE_LIMIT = new apollo_server_core_1.UserInputError('response might exceed the size limit');
SIZE_LIMIT.stack = undefined;
class ResponseSizeLimit extends Limit {
    constructor(maxNodes) {
        super(SIZE_LIMIT, maxNodes);
    }
}
exports.ResponseSizeLimit = ResponseSizeLimit;
//# sourceMappingURL=limit.js.map