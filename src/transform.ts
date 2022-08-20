import { Wyrmhole } from "./Wyrmhole";
import { WyrmlingStore } from "./WyrmlingStore";
import { isArray, isPrimitive, isWyrmling, Wyrmling } from './tools';

export type Primitive = string | number | boolean;

export type NodeTypes = Primitive | ArrayBuffer | object;

import * as base64 from 'base64-arraybuffer';
import { PromiseAll } from "./PromiseAll";
import { wrapAlienWyrmling } from "./AlienWyrmling";

interface WyrmlingValueOneLevel {
  $type: 'one-level';
  data: any[];
}
interface WyrmlingValueRef {
  $type: 'local-ref' | 'ref';
  /** spawnId, objectId */
  data: [number, number];
}
interface WyrmlingValueJson {
  $type: 'json';
  /** spawnId, objectId */
  data: any;
}
interface WyrmlingValueBinary {
  $type: 'binary';
  /** spawnId, objectId */
  data: string;
}
interface WyrmlingValueError {
  $type: 'error';
  /** spawnId, objectId */
  data: string;
}
export type WyrmlingValue = WyrmlingValueOneLevel | WyrmlingValueBinary | WyrmlingValueRef | WyrmlingValueJson | WyrmlingValueError;


export async function prepInboundValue(wyrmhole: Wyrmhole, wyrmlingStore: WyrmlingStore, inVal: Primitive | WyrmlingValue) {
  const [val] = await Promise.all([inVal]);
  if (isPrimitive(val)) { return val; }
  if (val.$type === 'local-ref') {
    // Data should be [spawnId, objectId]
    const [spawnId, objectId] = val.data;

    // Get the sub-store from the base store
    var store = wyrmlingStore.getSpawn(spawnId);

    if (store) {
      // Get the object from the sub-store
      return store.getObject(objectId);
    } else 
      return (void 0); // bad local-ref, receiver has to just deal with it
  } else if (val.$type === 'ref') {
    const [spawnId, objectId] = val.data;
    return wrapAlienWyrmling(wyrmhole, wyrmlingStore, spawnId, objectId);
  } else if (val.$type === 'json') {
      return val.data;
  } else if (val.$type === 'binary') {
      return base64.decode(val.data);
  }

  // This must be an object, so recursively make it magical. Since any property could
  // be a wyrmling, retain them until everything is ready so autorelease doesn't kick
  // in if another wyrmling happens to take a long time to get back from Enum, etc.
  var wyrmlings: Wyrmling[] = [];
  function retainIfWyrmling(v: any) {
    if (isWyrmling(v)) {
      v.retain();
      wyrmlings.push(v);
    }
    return v;
  }
  for (const prop of Object.keys(val)) {
    (<any>val)[prop] = prepInboundValue(wyrmhole, wyrmlingStore, (<any>val)[prop]).then(retainIfWyrmling);
  }
  try {
    // TODO: recursively await all properties
    var allFinishedPromise = await PromiseAll(val as any);
    return allFinishedPromise;
  } catch (err: any) {
    throw err;
  } finally {
    wyrmlings.forEach(function(ling) { ling.release(); });
  }
}

function isPrimitiveArray(val: any): val is any[] {
  return isArray(val) && val.every(isPrimitive);
}

// stores this as a localWyrmling, if necessary
export async function prepOutboundValue(wyrmlingStore: WyrmlingStore, inVal: Primitive | WyrmlingValue): Promise<Primitive | WyrmlingValue> {
  const [v] = await Promise.all([inVal]);
  if (isPrimitive(v) || v.$type === 'json' || v.$type === 'binary' || v.$type === 'error') {
    return v;
  }
  if (v.$type === 'one-level') {
    v.data = v.data.map(val => prepOutboundValue(wyrmlingStore, val));
    return await Promise.all(v.data) as any;
  }
  // this is an object we need to send by reference; store and send
  const objectId = wyrmlingStore.putObject(v);
  return { $type: 'ref', data: [wyrmlingStore.spawnId, objectId] };
}
// returns after prepOutboundValue has resolved for each arg
export async function prepOutboundArguments(wyrmlingStore: WyrmlingStore, inArgs: Array<Primitive | WyrmlingValue>) {
  const args = await Promise.all(inArgs);
  if (!isArray(args) || !args.length) { return []; }
  var xlateArgs = args.map(async val => await prepOutboundValue(wyrmlingStore, val));
  return await Promise.all(xlateArgs);
}
