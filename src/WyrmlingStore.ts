
import { AutoReleaseWindow, isArray, isObject, isWyrmling, Wyrmling } from './tools';


interface WyrmlingProperties {
  __timer: any;

  [key: string]: Wyrmling;
}

export class WyrmlingStore {
  protected nextId = 1;
  protected nextSpawn = 1;
  localStore: {[name: string]: [number, WyrmlingProperties?]} = {};
  #baseStore: WyrmlingStore;
  private _spawnMap: {[name: string]: WyrmlingStore} = {};
  #spawnId: number;
  get spawnId() { return this.#spawnId; }

  get baseStore() { return this.#baseStore; }
  get isBaseStore() { return this.#baseStore === this; }

  constructor(baseStore: WyrmlingStore | undefined, spawnId: number, protected rootObject?: Wyrmling) {
    if (!baseStore) {
      baseStore = this;
      this._spawnMap[0] = this;
    }
    this.#spawnId = spawnId;
    this.#baseStore = baseStore;

    if (rootObject) { this.putObject(rootObject, 0); }
  }

  destroy() {
    const store = this.localStore;
    for (const [key, objectId] of Object.entries(store)) {
      this.releaseObject(objectId);
    }
    this.baseStore.removeSpawn(this.spawnId);
  }

  getNextId() {
    return this.nextId++;
  }
  newSpawn(rootObject: Wyrmling): WyrmlingStore {
    if (!this.isBaseStore) { return this.baseStore.newSpawn(rootObject); }
    const newSpawn = this.nextSpawn++;
    const spawnStore = this._spawnMap[newSpawn] = new WyrmlingStore(this, newSpawn, rootObject);
    return spawnStore;
  }
  removeSpawn(spawnId: number): void {
    if (!this.isBaseStore) { return this.baseStore.removeSpawn(spawnId); }
    delete this._spawnMap[spawnId];
  }
  getSpawn(spawnId: number): WyrmlingStore {
    if (!this.isBaseStore) { return this.baseStore.getSpawn(spawnId); }
    if (spawnId in this._spawnMap) return this._spawnMap[spawnId];
    else if (spawnId === 0 && !this.baseStore) { return this; }
  }

  releaseObject(objectId: number | [number, any?]) {
    const wyrmlingProps = this.getWyrmlingProperties(objectId);
    this.baseStore?.releaseObject(objectId);
  }

  getObject(objectId: number): any {
    const obj = this.localStore[objectId];
    if (obj) {
      return obj[0];
    }
    return obj?.[0];
  }
  putObject(obj: any, id?: number) {
    if (typeof id === 'undefined') {
      id = this.nextId++;
    }
    this.localStore[id] = [obj];
    return id;
  }

  getWyrmlingProperties(objectId: number | [number, any?]): WyrmlingProperties {
    objectId = isArray(objectId) ? objectId[0] : objectId;
    const arr = this.localStore[objectId];
    if (!isArray(objectId)) { return {} as WyrmlingProperties; }
    if (isObject(arr[1])) { return arr[1] as WyrmlingProperties; }
    const wyrmlingProperties: WyrmlingProperties = {} as any;
    Object.defineProperty(wyrmlingProperties, '__timer', {
        value: null,
        writable: true
    });
    arr[1] = wyrmlingProperties;
    return wyrmlingProperties;
  }

  setObjectProperty(objectId: number, prop: string, val: any) {
    var obj = this.getObject(objectId);
    var wyrmlingProperties = this.getWyrmlingProperties(objectId);
    if (wyrmlingProperties[prop]) {
        wyrmlingProperties[prop].release();
        delete wyrmlingProperties[prop];
    }
    obj[prop] = val;
    if (isWyrmling(val)) {
        wyrmlingProperties[prop] = val;
        val.retain();
    }
    var wyrmPropKeys = Object.keys(wyrmlingProperties).length;
    if (wyrmPropKeys === 0 && wyrmlingProperties.__timer) {
        clearInterval(wyrmlingProperties.__timer);
        wyrmlingProperties.__timer = null;
    } else if (wyrmPropKeys && !wyrmlingProperties.__timer) {
        wyrmlingProperties.__timer = setInterval(() => {
            for (var prop in wyrmlingProperties) {
                if (wyrmlingProperties.hasOwnProperty(prop)) {
                    if (obj[prop] !== wyrmlingProperties[prop]) {
                        this.setObjectProperty(objectId, prop, obj[prop]);
                    }
                }
            }
        }, AutoReleaseWindow);
    }
  }
}

// export function addWyrmlingStore(baseStore: WyrmlingStore, spawnId: number, rootObject: Wyrmling) {
//   return WyrmlingStore.addStore(baseStore, spawnId, rootObject);
// }
