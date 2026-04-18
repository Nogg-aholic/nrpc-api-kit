import type { RpcFetchErrorContext } from '@nogg-aholic/nrpc/web-runtime';

import { isRpcServiceError } from '../errors.js';

const hasErrorStatus = (error: unknown): error is { status: number } =>
  typeof error === 'object' && error != null && typeof (error as { status?: unknown }).status === 'number';

export const jsonError = (status: number, message: string, type = 'server_error'): Response =>
  Response.json(
    {
      error: {
        message,
        type,
      },
    },
    { status },
  );

export const notFoundJson = (): Response => jsonError(404, 'Route not found', 'not_found');

export const createRpcBinaryErrorResponse = (context: RpcFetchErrorContext): Response => {
  const status = isRpcServiceError(context.error)
    ? context.error.status
    : hasErrorStatus(context.error)
      ? context.error.status
      : context.status;
  const payload = Uint8Array.from(context.payload).buffer;

  return new Response(payload, {
    status,
    headers: {
      'content-type': 'application/octet-stream',
    },
  });
};