
export type DisconnectFunction = (errmsg: string) => void;

export type FireWyrmPlugin<T> = FireWyrmObjectBase & T;
export interface FireWyrmObjectBase {
    invoke(method: string, args: any[]): Promise<any>;
    destroy(): Promise<void>;
}

export interface FireWyrmPluginItem {
  name: string;
  description: string;
  product: string;
  vendor: string;
  version: string;
  mimetypes: string[];
}

export type NewMessage = ["New", string, any | undefined];
export type DestroyMessage = ["Destroy", number];
export type EnumMessage = ["Enum", number, number];
export type RelObjMessage = ["RelObj", number, number];
export type DelPMessage = ["DelP", number, number, string];
export type GetPMessage = ["GetP", number, number, string];
export type SetPMessage = ["SetP", number, number, string, any];
export type InvokeMessage = ["Invoke", number, number, string, any[]];

export type ResponseErrorMessage = ["error", {error: string, message: string}];
export type ResponseNewDestroyMessage = ["success", number];
export type ResponseEnumMessage = ["success", string[]];
export type ResponseValue = ["success", any];
export type ResponseNoValue = ["success", null];

export type WyrmholeValidResponse = ResponseErrorMessage | ResponseNewDestroyMessage | ResponseEnumMessage | ResponseValue | ResponseNoValue;

export type WyrmholeValidCommand =
  | DestroyMessage
  | NewMessage
  | EnumMessage
  | RelObjMessage
  | DelPMessage
  | GetPMessage
  | SetPMessage
  | InvokeMessage;

export type WyrmlingInstanceMessage =
  | EnumMessage
  | RelObjMessage
  | DelPMessage
  | GetPMessage
  | SetPMessage
  | InvokeMessage;

export interface Wyrmhole {
  sendMessage(msg: WyrmholeValidCommand): Promise<WyrmholeValidResponse[1]>;
  onDisconnect(disconnectCb: DisconnectFunction): void;
  onMessage(commandCb: (response: WyrmholeValidCommand) => Promise<WyrmholeValidResponse[1]>): void;

  loadPlugin<P>(mimetype: string): Promise<string>;
  destroy(): void;

  listPlugins(): Promise<FireWyrmPluginItem[]>;
}