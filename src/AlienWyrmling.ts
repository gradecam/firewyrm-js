
import { Wyrmhole, WyrmlingInstanceMessage } from './Wyrmhole';
import { WyrmlingStore } from './WyrmlingStore';
import { prepInboundValue, prepOutboundValue, prepOutboundArguments } from './transform';
import { createProperty, isWyrmling, WyrmlingBase } from './tools';


function releasedError() {
  const err = new Error('The object has been released');
  err.name = 'ReleasedError';
  return err;
}

export class AlienWyrmlingImpl implements WyrmlingBase {
  _timer: any;

  //////  These are all read-only, so make them private fields with getters
  private _refCount = 0;
  get refCount() { return this._refCount; }
  private _released = false;
  get released() { return this._released; }
  private _wyrmhole: Wyrmhole;
  get wyrmhole() { return this._wyrmhole; }
  private _store: WyrmlingStore;
  get store() { return this._store; }
  private _spawnId: number;
  get spawnId() { return this._spawnId; }
  private _objectId: number;
  get objectId() { return this._objectId; }
  
  constructor(wyrmhole: Wyrmhole, wyrmlingStore: WyrmlingStore, spawnId: number, objectId: number) {
    this._wyrmhole = wyrmhole;
    this._store = wyrmlingStore;
    this._objectId = objectId;
    this._spawnId = spawnId;
    this._send = async (args) => {
      this._errOnRelease();
      this.retain();
      const resp = await wyrmhole.sendMessage(args);
      setTimeout(() => this.release(), 500)

      return resp;
    };
    this._errOnRelease = () => { if (this._released) throw releasedError(); };
  }
  private _send: (args: WyrmlingInstanceMessage) => Promise<any>;
  private _errOnRelease: () => void;

  async getProperties() {
    const {spawnId, objectId} = this;
    const props = await this._send(['Enum', spawnId, objectId]);
    return props;
  }

  retain() {
    this._errOnRelease();
    this._refCount++;
  }
  release() {
    this._refCount--;
    const {objectId, spawnId} = this;
    if (this.objectId === 0) { return; } // queenlings must be manually destroyed
    const doRelease = () => {
      if (this._released) return;
      if (this._refCount < 1 && !this._released) {
        this._send(['RelObj', spawnId, objectId]).catch(err => {});
        this._released = true;
      }
    };
    setTimeout(doRelease, 5000);
  }

  getProperty(prop: string): () => Promise<any> | Promise<any> {
    this._errOnRelease();
    let propValue: any;
    const {spawnId, objectId, wyrmhole, store} = this;

    const getPromise = this._send(['GetP', spawnId, objectId, prop]).then(function(val) {
        return prepInboundValue(wyrmhole, store, val);
    }).then(function(val) {
        propValue = val;
        return val;
    });
    async function magicalFn(...args: any[]) {
      await getPromise;

      if (isWyrmling(propValue)) {
        propValue.retain();
        const invokePromise = propValue(...args);
        const relFn = () => propValue.release();
        invokePromise.then(relFn, relFn);
        return invokePromise;
      } else {
        return Promise.reject(new Error('The object is not invokable'));
      }
    }
    magicalFn.then = getPromise.then.bind(getPromise);
    return magicalFn;
  }

  async setProperty(prop: string, val: any) {
    const {spawnId, objectId, store} = this;
    const v = await prepOutboundValue(store, val);
    return await this._send(['SetP', spawnId, objectId, prop, v]);
  }

  async invoke(prop: string, ...args: any[]) {
    this._errOnRelease();
    const {released, spawnId, objectId, wyrmhole, store} = this;
    if (released) { return releasedError(); }
    const preppedArgs = await prepOutboundArguments(store, args);

    const retVal = await this._send(['Invoke', spawnId, objectId, prop, preppedArgs]);
    
    return prepInboundValue(wyrmhole, store, retVal);
  }
}

interface AlienWyrmling extends AlienWyrmlingImpl {
  (...args: any[]): Promise<any>;
}

// performs Enum and creates the getters / setters / etc.
export async function wrapAlienWyrmling(wyrmhole: Wyrmhole, wyrmlingStore: WyrmlingStore, spawnId: number, objectId: number) {
  
  // This is a bit of a weird hack, but it should work well enough!
  // We instantiate the AlienWyrmling class, then we create a callable function
  // and set its prototype fo be the instance of the AlienWyrmling. This way it's callable
  // but still has all the capabilities of the class and should have access to private members.
  const alienSpawnling = new AlienWyrmlingImpl(wyrmhole, wyrmlingStore, spawnId, objectId);
  const alienWyrmling: AlienWyrmling = function WyrmlingObject(...args: any[]): Promise<any> {
    return alienWyrmling.invoke('', ...args);
  } as any;
  Object.setPrototypeOf(alienWyrmling, alienSpawnling);

  const props = await alienWyrmling.getProperties();
  for (const p of props) {
    createProperty(alienWyrmling, p);
  }

  return alienWyrmling;
}