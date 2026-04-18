import { createRpcFetchRequestHandler, createRpcMethodInvoker } from '@nogg-aholic/nrpc/web-runtime';
import type { RpcCodecResolver } from '@nogg-aholic/nrpc/http-route-runtime';

import { RPC_AWAIT_EVENT, RPC_RETURN_EVENT } from '../constants.js';
import { defaultTransformError } from '../errors.js';
import { createRpcBinaryErrorResponse, notFoundJson } from './responses.js';

export interface RouteContext<TService> {
  request: Request;
  url: URL;
  service: TService;
}

export interface ServiceRoute<TService> {
  method: string;
  path: string;
  handler: (context: RouteContext<TService>) => Promise<Response> | Response;
}

export interface CreateServiceFetchHandlerOptions<TService> {
  service: TService;
  codecResolver: RpcCodecResolver;
  routes?: Array<ServiceRoute<TService>>;
  rpcPath?: string;
  healthPath?: string;
  notFoundResponse?: () => Response;
  transformError?: (error: unknown) => unknown;
}

const hasHealthStatus = (service: unknown): service is { health: { status: () => Promise<unknown> } } => {
  if (typeof service !== 'object' || service == null) {
    return false;
  }

  const health = (service as { health?: unknown }).health;
  if (typeof health !== 'object' || health == null) {
    return false;
  }

  return typeof (health as { status?: unknown }).status === 'function';
};

export const createServiceFetchHandler = <TService>(
  options: CreateServiceFetchHandlerOptions<TService>,
): ((request: Request) => Promise<Response>) => {
  const invokeMethod = createRpcMethodInvoker(options.service);
  const rpcPath = options.rpcPath ?? '/rpc';
  const healthPath = options.healthPath ?? '/health';
  const routes = options.routes ?? [];
  const notFoundResponse = options.notFoundResponse ?? notFoundJson;

  const rpcHandler = createRpcFetchRequestHandler({
    codecResolver: options.codecResolver,
    invokeMethod,
    awaitEventCode: RPC_AWAIT_EVENT,
    returnEventCode: RPC_RETURN_EVENT,
    transformError: options.transformError ?? defaultTransformError,
    errorResponseFactory: createRpcBinaryErrorResponse,
  });

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === rpcPath) {
      return rpcHandler(request);
    }

    if (request.method === 'GET' && url.pathname === healthPath && hasHealthStatus(options.service)) {
      return Response.json(await options.service.health.status());
    }

    const route = routes.find((entry) => entry.method === request.method && entry.path === url.pathname);
    if (route) {
      return route.handler({ request, url, service: options.service });
    }

    return notFoundResponse();
  };
};