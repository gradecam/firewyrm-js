

function ObjectFromEntries<A extends PropertyKey, B>(iter: [A, B][]) : Record<A, B> {
  const obj: Record<A, B> = {} as any;

  for (const pair of iter) {
    if (Object(pair) !== pair) {
      throw new TypeError('iterable for fromEntries should yield objects');
    }

    // Consistency with Map: contract is that entry has "0" and "1" keys, not
    // that it is an array or iterable.

    const { '0': key, '1': val } = pair;

    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: val,
    });
  }

  return obj;
}

if (!('fromEntries' in Object)) {
  (<any>Object).defineProperty(Object, 'fromEntries', {
      configurable: false,
      enumerable: true,
      writable: true,
      value: ObjectFromEntries,
  });
}

type PromiseRecord = Record<PropertyKey, Promise<any>>;
type PromiseTuple = [...Promise<any>[]];
type PromiseTupleRO = readonly [...Promise<any>[]];

type unPromise<T> = T extends Promise<infer U> ? U : T;
type unPromiseObject<T> = {
    [K in keyof T]: unPromise<T[K]>;
};
type PT = Promise<any>;
// This allows us to handle up to 14 arguments as arrays
type tupleTypes = never
    | [PT]
    | [PT, PT]
    | [PT, PT, PT]
    | [PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT]
    | [PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT, PT];

function toPromiseEntry<K, PVal>(entry: [K, PVal]) : Promise<[K, unPromise<PVal>]> {
    return Promise.resolve(entry[1]).then(res => [entry[0], res]) as any;
}

export async function PromiseObjAll<T extends PromiseRecord>(obj: T) : Promise<unPromiseObject<T>> {
    const pList = Object.entries(obj).map(toPromiseEntry);
    return Promise.all(pList).then(Object.fromEntries);
}

// Handles objects
export async function PromiseAll<T extends PromiseRecord>(object: T) : Promise<unPromiseObject<T>>;
// Handles normal arrays in a way that extracts them to tuples
export async function PromiseAll<T extends tupleTypes>(array: T) : Promise<unPromiseObject<T>>;
// Handles const arrays in a way that has no upper limit
export async function PromiseAll<T extends PromiseTupleRO>(array: T) : Promise<unPromiseObject<T>>;
// Handles any other arrays
export async function PromiseAll<T extends PromiseTuple>(array: T) : Promise<unPromiseObject<T>>;
// Handles when you pass them in as separate parameters
export async function PromiseAll<T extends PromiseTuple>(...array: T) : Promise<unPromiseObject<T>>;
// export async function PromiseAll<T extends PromiseArrayRO>(array: T) : Promise<unPromiseObject<T>>;
export async function PromiseAll(arrayOrObj: any) {
    if (Array.isArray(arrayOrObj)) {
        return Promise.all(arrayOrObj);
    } else if (arguments.length > 1) {
        return Promise.all([...arguments]);
    } else if ('then' in arrayOrObj) {
        return Promise.all([arrayOrObj]);
    } else {
        return PromiseObjAll(arrayOrObj);
    }
}
