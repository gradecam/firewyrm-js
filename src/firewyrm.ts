import { Wyrmhole } from "./Wyrmhole";
import * as tools from './tools';
import { WyrmlingStore } from "./WyrmlingStore";
import { AlienWyrmlingImpl, wrapAlienWyrmling } from "./AlienWyrmling";

import browser from './browser';
import './dfd';

type FactoryFn = (args: Record<string, any>) => any;

export type FireWyrmPluginOf<T> = T & AlienWyrmlingImpl & {destroy(): Promise<void>};

export default class FireWyrmJS {
  #wyrmhole: Wyrmhole;
  get wyrmhole() { return this.#wyrmhole; }
  asVal = tools.asVal;

  supportedTypes: {[mimetype: string]: FactoryFn} = {};
  baseWyrmlingStore: WyrmlingStore;

  constructor(wyrmhole: Wyrmhole) {
    this.#wyrmhole = wyrmhole;

    this.baseWyrmlingStore = new WyrmlingStore(void 0, 0);

    this.registerObjectType("browser", browser);

    wyrmhole.onMessage(msg => 
      tools.handleMessage(wyrmhole, this.baseWyrmlingStore, this.supportedTypes, msg)
    );
  }

  async create<T extends Record<string, any>>(mimetype: string, args: Record<string, any> = {}) {
    var wyrmlingStore = this.baseWyrmlingStore;
    const {wyrmhole} = this;

    // Create and resolve the queenling
    const spawnId = await wyrmhole.sendMessage(['New', mimetype, args]);
    const queenling = await wrapAlienWyrmling(wyrmhole, wyrmlingStore, spawnId, 0);

    tools.defineProperties(queenling, {
      destroy: () => wyrmhole.sendMessage(["Destroy", queenling.spawnId]),
    });
    return queenling as any as FireWyrmPluginOf<T>;
  }

  /**
   * Returns a promise that resolves to undefined if the registration was
   * successful or rejects if invalid parameters were provided.
   *
   * @param type {String} which 'New' messages should be handled, e.g. 'application/myApp'
   * @param factoryFn {Function} Called when a matching 'New' is received over the Wyrmhole.
   *   Invoked with a parameters object; must return object.
   *
   *   The object returned may optionally specify an `_onDestroy` function, which will
   *   be called when we receive 'Destroy' from the Wyrmhole.
   */
  async registerObjectType(type: string, factoryFn: FactoryFn | Promise<FactoryFn>) {
    [factoryFn] = await Promise.all([factoryFn]);
    if (!type || typeof type !== "string") {
      throw new Error("Must provide a valid object type, e.g. application/myApp");
    } else if (!tools.isFunction(factoryFn)) {
      throw new Error("Must provide a function to invoke when a new instance is requested");
    }
    this.supportedTypes[type] = factoryFn;
  }
}
