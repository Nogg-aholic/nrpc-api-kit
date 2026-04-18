export const RPC_AWAIT_EVENT = 0x11;
export const RPC_RETURN_EVENT = 0x12;

export const isWebsocketEnabled = (value = process.env.NRPC_ENABLE_WS): boolean =>
  ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());