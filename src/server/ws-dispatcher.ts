import type { ServerWebSocket } from 'bun';
import type { RpcMethodInvoker } from '@nogg-aholic/nrpc/web-runtime';

interface WsRpcRequest {
  id?: string | number;
  method: string;
  args?: unknown[];
}

const decodeWebSocketMessage = (message: string | BufferSource): string =>
  typeof message === 'string'
    ? message
    : new TextDecoder().decode(message instanceof ArrayBuffer ? new Uint8Array(message) : message);

export const handleRpcWebSocketMessage = async (
  ws: ServerWebSocket<unknown>,
  message: string | BufferSource,
  invokeMethod: RpcMethodInvoker,
): Promise<void> => {
  const text = decodeWebSocketMessage(message);

  let payload: WsRpcRequest;
  try {
    payload = JSON.parse(text) as WsRpcRequest;
  } catch {
    ws.send(JSON.stringify({ ok: false, error: { message: 'invalid JSON' } }));
    return;
  }

  if (!payload || typeof payload.method !== 'string') {
    ws.send(JSON.stringify({ id: payload?.id, ok: false, error: { message: 'method is required' } }));
    return;
  }

  try {
    const args = Array.isArray(payload.args) ? payload.args : [];
    const result = await invokeMethod(payload.method, args);
    ws.send(JSON.stringify({ id: payload.id, ok: true, result }));
  } catch (error) {
    ws.send(
      JSON.stringify({
        id: payload.id,
        ok: false,
        error: {
          message: error instanceof Error ? error.message : 'rpc_error',
        },
      }),
    );
  }
};