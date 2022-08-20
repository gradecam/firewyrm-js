/* global toString */

import * as base64 from "base64-arraybuffer";
import { NodeTypes, prepInboundValue, prepOutboundValue, Primitive, WyrmlingValue } from "./transform";
import { DestroyMessage, NewMessage, Wyrmhole, WyrmholeValidCommand, WyrmlingInstanceMessage } from "./Wyrmhole";
import { WyrmlingStore } from "./WyrmlingStore";

const validMessages = {
  New: true,
  Destroy: true,
  RelObj: true,
  Enum: true,
  DelP: true,
  GetP: true,
  SetP: true,
  Invoke: true,
} as const;
type validMessageTypes = keyof typeof validMessages;



export interface WyrmlingBase {
  retain(): void;
  release(): void;

  spawnId: number;
  objectId: number;
  getProperty(name: string): Promise<any> | (() => Promise<any>);
  setProperty(name: string, value: any): Promise<void>;
  invoke(name: string, ...args: any[]): Promise<any>;
}
export interface Wyrmling extends WyrmlingBase {
  (...args: any[]): Promise<any>;
}

export const LocalRelObjDelay = 1000;
export const AutoReleaseWindow = 5000;

export {
  asVal,
  defineProperties,
  handleMessage,
  isArray,
  isFunction,
  isNumber,
  isObject,
  isWyrmling,
  isPrimitive,
  retainAllWyrmlings,
  createProperty,
};

// type WyrmlingStore = Record<number, Wyrmling>;

function asVal(obj: NodeTypes) {
  if (isPrimitive(obj)) {
    return obj;
  }
  if (obj instanceof ArrayBuffer) {
    return { $type: "binary", data: base64.encode(obj) };
  }
  return { $type: "json", data: obj };
}

// defines provided properties as non-configurable, non-enumerable, non-writable values
function defineProperties(obj: Wyrmling, props: Record<string, NodeTypes>) {
  for (const prop of Object.keys(props)) {
    Object.defineProperty(obj, prop, { value: props[prop] });
  }
}

function createProperty(wyrmling: Wyrmling, prop: string) {
  Object.defineProperty(wyrmling, prop, {
    enumerable: true,
    configurable: false, // don't allow it to be deleted (it isn't ours)
    get: function () {
      return wyrmling.getProperty(prop);
    },
    set: function (val) {
      return wyrmling.setProperty(prop, val);
    },
  });
}

function isValidMessage<T extends WyrmholeValidCommand>(msg: T): boolean {
  if (!isArray(msg) || !validMessages[msg[0]]) {
    return false;
  }
  const type = msg[0];
  switch (type) {
    case "Destroy":
      return msg.length === 2 && isNumber(msg[1]);
    case "New":
      return msg.length === 3 && msg[1] && isString(msg[1]);
    case "Enum":
    case "RelObj":
      return msg.length === 3 && isNumber(msg[1]) && isNumber(msg[2]);
    case "DelP":
    case "GetP":
      return (
        msg.length === 4 &&
        isNumber(msg[1]) &&
        isNumber(msg[2]) &&
        isString(msg[3])
      );
    case "SetP":
      return (
        msg.length === 5 &&
        isNumber(msg[1]) &&
        isNumber(msg[2]) &&
        isString(msg[3])
      );
    case "Invoke":
      return (
        msg.length === 5 &&
        isNumber(msg[1]) &&
        isNumber(msg[2]) &&
        isString(msg[3]) &&
        isArray(msg[4])
      );
  }
}

function getWyrmlingStoreForMessage(
  baseWyrmlingStore: WyrmlingStore,
  msg: WyrmlingInstanceMessage
) {
  const [, spawnId] = msg;
  return baseWyrmlingStore.getSpawn(spawnId);
}
function getObject(wyrmlingStore: WyrmlingStore, msg: WyrmlingInstanceMessage) {
  const [, , objectId] = msg;
  const obj = wyrmlingStore.getObject(objectId);
  return obj || null;
}

async function handleMessage(
  wyrmhole: Wyrmhole,
  baseWyrmlingStore: WyrmlingStore,
  supportedTypes: Record<string, any>,
  msg: WyrmholeValidCommand,
) {
  if (!isValidMessage(msg)) {
    throw new Error("Invalid message: Message was malformed");
  }
  if (msg[0] === "New") {
    return await handleNew(baseWyrmlingStore, supportedTypes, msg);
  } else if (msg[0] === "Destroy") {
    return await handleDestroy(baseWyrmlingStore, supportedTypes, msg);
  }

  var store = getWyrmlingStoreForMessage(baseWyrmlingStore, msg);
  var obj = getObject(store, msg);
  if (obj === null) {
    throw new Error(`Invalid object: The object does not exist (${JSON.stringify(msg)})`);
  }
  switch (msg[0]) {
    case "Enum":
      return await handleEnum(obj);
    case "DelP":
      return await handleDelP(store, obj, msg[3]);
    case "GetP":
      return await handleGetP(store, obj, msg[3]);
    case "SetP":
      return await handleSetP(wyrmhole, store, obj, msg[2], msg[3], msg[4]);
    case "RelObj":
      return await handleRelObj(store, msg[2]);
    case "Invoke":
      return await handleInvoke(wyrmhole, store, obj, msg[3], msg[4]);
  }
}


function handleNew(
  baseWyrmlingStore: WyrmlingStore,
  supportedTypes: Record<string, any>,
  msg: NewMessage,
) {
  const [, mimeType, arg] = msg;
  if (!(mimeType in supportedTypes)) {
    throw new Error(`Invalid type: ${mimeType} is not a supported type`);
  }
  try {
    const princessling = supportedTypes[mimeType](arg || {});
    const spawnling = baseWyrmlingStore.newSpawn(princessling);
    const spawnId = spawnling.spawnId;
    return spawnId;
  } catch (error: any) {
    throw new Error(`Could not create object: ${error?.message ?? 'Unknown error'}`);
  }
}

function handleDestroy(
  baseWyrmlingStore: WyrmlingStore,
  supportedTypes: Record<string, any>,
  msg: DestroyMessage,
) {
  const [,spawnId] = msg;
  const wyrmlingStore = baseWyrmlingStore.getSpawn(spawnId);
  const princessling = wyrmlingStore?.getObject(0);
  if (!princessling) {
    throw new Error(`Could not destroy object: The object does not exist (${JSON.stringify(msg)})`);
  }
  try {
    wyrmlingStore.destroy();
    if (isFunction(princessling._onDestroy)) {
      princessling._onDestroy();
    }
    return spawnId;
  } catch (error: any) {
    throw new Error(`Could not destroy object: ${error?.message ?? 'Unknown error'}`);
  }
}

async function handleEnum(obj: Record<string, any>) {
  const props = Object.keys(obj).filter(k => !k.startsWith('_'));
  // add special "length" property for arrays and functions
  if (isArray(obj) || isFunction(obj)) {
    props.push("length");
  }
  return props;
}

async function handleDelP(wyrmlingStore: WyrmlingStore, obj: Record<string, any>, prop: string) {
  if (!obj.hasOwnProperty(prop)) {
    throw new Error("Invalid property: The property does not exist");
  }
  try {
    delete obj[prop];
  } catch (error: any) {
    throw new Error("Invalid property: The property could not be deleted:" + error.message);
  }
}

async function handleGetP(wyrmlingStore: WyrmlingStore, obj: Record<string, any>, prop: string) {
  if (
    !obj.hasOwnProperty(prop) &&
    !(prop === "length" && (isArray(obj) || isFunction(obj)))
  ) {
    throw new Error("Invalid property: The property does not exist");
  }
  const outVal = await prepOutboundValue(wyrmlingStore, obj[prop]);
  return outVal;
}

async function handleSetP(
  wyrmhole: Wyrmhole, wyrmlingStore: WyrmlingStore,
  obj: Record<string, any>, objectId: number,
  prop: string, val: any,
) {
  if (!obj.hasOwnProperty(prop)) {
    throw new Error("Invalid property: The property does not exist");
  }
  const v = await prepInboundValue(wyrmhole, wyrmlingStore, val);
  
  await wyrmlingStore.setObjectProperty(objectId, prop, v);
}

async function handleRelObj(wyrmlingStore: WyrmlingStore, objectId: number) {
  if (objectId === 0) {
    return;
  } // root objects cannot be released, they must be destroyed
  
  // In order to make sure that async timing issues don't cause this to be released
  // before an object which is returned from the browser, add a short delay before this completes
  setTimeout(function () {
    wyrmlingStore.releaseObject(objectId);
  }, LocalRelObjDelay);
}

async function handleInvoke(
  wyrmhole: Wyrmhole,
  wyrmlingStore: WyrmlingStore,
  obj: Record<string, any>,
  prop: string,
  args: any[],
) {

  const handleError = (v: Primitive | WyrmlingValue) => {
    if (!isPrimitive(v) && v?.$type === 'error') {
      throw new Error("Invoke error: " + v.data);
    } else {
      return v;
    }
  };

  if (prop) {
    if (!obj.hasOwnProperty(prop)) {
      throw new Error("Invalid property: The property does not exist");
    } else if (!isFunction(obj[prop])) {
      throw new Error("Invalid property: The property is not callable");
    }
    const inArgsDfd = args.map(arg => prepInboundValue(wyrmhole, wyrmlingStore, arg));
    const inArgs = await Promise.all(inArgsDfd);
    const retVal = obj[prop](...inArgs);
    return await prepOutboundValue(wyrmlingStore, retVal).then(handleError);
  } else {
    if (!isFunction(obj)) {
      throw new Error("Invalid object: The object is not callable");
    }
    const inArgsDfd = args.map(arg => prepInboundValue(wyrmhole, wyrmlingStore, arg));
    const inArgs = await Promise.all(inArgsDfd);
    const retVal = obj(...inArgs);
    return await prepOutboundValue(wyrmlingStore, retVal);
  }
}

function findWyrmlings(thing: any) {
  const wyrmlings: Wyrmling[] = [];
  if (isWyrmling(thing)) {
    return [thing];
  } else if (isArray(thing) || isObject(thing)) {
    for (var prop in thing) {
      if (thing.hasOwnProperty(prop)) {
        wyrmlings.push(...wyrmlings.concat(findWyrmlings((<any>thing)[prop])));
      }
    }
  }
  return wyrmlings;
}
function retainAllWyrmlings(thing: any) {
  var wyrmlings = findWyrmlings(thing);
  for (const wyrmling of wyrmlings) {
    wyrmling.retain();
  }
  
  return function () {
    for (const wyrmling of wyrmlings) {
      wyrmling.release();
    }
  };
}

function isPrimitive(
  val: any
): val is boolean | string | number | null | undefined {
  if (val === null) {
    return true;
  } // to avoid false positive on typeof 'object' test below
  switch (typeof val) {
    case "object":
    case "function":
    case "symbol":
      return false;
    default:
      return true;
  }
}

// adapted from underscore.js
var nativeIsArray = Array.isArray;
function isArray<T>(obj: any): obj is T[] {
  return nativeIsArray
    ? Array.isArray(obj)
    : toString.call(obj) === "[object Array]";
}

// Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
// IE 11 (#1621), and in Safari 8 (#1929).
var optimizeIsFunction =
  typeof /./ !== "function" && typeof Int8Array !== "object";
function isFunction(obj: any): obj is Function {
  if (optimizeIsFunction) {
    return typeof obj === "function" || false;
  } else {
    return toString.call(obj) === "[object Function]";
  }
}

function isNumber(val: any): val is number {
  return toString.call(val) === "[object Number]" && !isNaN(val);
}
// match plain objects, not special things like null or ArrayBuffer
function isObject(val: any): val is object {
  return val && toString.call(val) === "[object Object]";
}
function isString(val: any): val is string {
  return typeof val === "string";
}
function isWyrmling(val: any): val is Wyrmling {
  return (
    isFunction(val) &&
    ( "spawnId" in val ) &&
    ( "objectId" in val ) &&
    ( "getProperty" in val ) &&
    ( "setProperty" in val ) &&
    ( "invoke" in val )
  );
}
