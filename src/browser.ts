
import {isNumber, isFunction, isArray, retainAllWyrmlings, isObject} from './tools';

function makeError(name: string, message: string) {
  const err = new Error(message);
  err.name = name;
  return err;
}

export default function Browser() {
  return {
    /** 
     * This executes code sourced from the c++ side, not anything that the user would
     * generally have access to, but we'll still shut it off for security reasons.
     */
    eval(code: string): any { throw makeError("not supported", "eval not supported"); return this.eval(code); },
    getDocument() { return globalThis; },
    getWindow() { return globalThis; },
    invokeWithDelay(delay: number, obj: any, args: any[], fname?: string): void {
      const fnToCall = fname ? (obj && obj[fname]) : obj;
      if (!(isNumber(delay) && isFunction(fnToCall) && isArray(args))) {
        throw new Error("Invalid arguments: Must provide at least delay (Number), obj (Function or Object), and args (Array)");
      }
  
      var releaseWyrmlings = retainAllWyrmlings(args);
      setTimeout(function() {
          fnToCall.apply(null, args);
          releaseWyrmlings();
      }, delay);
    },
    readArray(arr: any[]) {
      if (!arr) {
        throw new Error("Invalid arguments, array does not exist");
      }
      if (!isArray(arr)) {
        throw new Error("Invalid arguments, array is not an array");
      }
      // special type that will send the object as value, but any of its top-level
      // items are subject to being sent as references -- no nesting
      return { $type: 'one-level', data: arr };
    },
    readObject(obj: Record<string | number, any>) {
      if (!obj) {
        throw new Error("Invalid arguments, object does not exist");
      }
      if (!isObject(obj)) {
        throw new Error("Invalid arguments, object is not an object");
      }
      // special type that will send the object as value, but any of its top-level
      // items are subject to being sent as references -- no nesting
      return { $type: 'one-level', data: obj };
    },
  };
}
