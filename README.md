# nRPC API Kit

`@nogg-aholic/nrpc-api-kit` provides reusable server-side helpers for building nRPC services.

It packages the common pieces used across services in this repo:

- fetch handler wiring for nRPC POST endpoints
- optional health endpoint and custom HTTP routes
- websocket dispatcher for method calls
- Bun server bootstrap
- artifact generation wrapper for contract/docs output

## Install

With Bun:

```bash
bun add @nogg-aholic/nrpc-api-kit @nogg-aholic/nrpc
```

With npm:

```bash
npm install @nogg-aholic/nrpc-api-kit @nogg-aholic/nrpc
```

## Quick Start (HTTP RPC)

```ts
import { createRpcMethodInvoker } from '@nogg-aholic/nrpc/web-runtime';
import { createServiceFetchHandler } from '@nogg-aholic/nrpc-api-kit';

import { createMyService } from './rpc-service.js';
import { myApiCodecRegistry } from './generated/my-api.contract.js';

const service = createMyService();
const invokeMethod = createRpcMethodInvoker(service);

export const createFetchHandler = () =>
  createServiceFetchHandler({
    service,
    codecResolver: myApiCodecRegistry,
    rpcPath: '/rpc',
    healthPath: '/health',
  });

export const createRpcInvoker = () => invokeMethod;
```

The fetch handler behavior is:

- `POST /rpc` (or your `rpcPath`) is routed to the nRPC request handler
- `GET /health` (or your `healthPath`) returns `service.health.status()` when available
- unmatched routes return a JSON 404 response

## Add Custom HTTP Routes

```ts
import { createServiceFetchHandler, RpcServiceError, jsonError } from '@nogg-aholic/nrpc-api-kit';

const fetchHandler = createServiceFetchHandler({
  service,
  codecResolver: myApiCodecRegistry,
  routes: [
    {
      method: 'GET',
      path: '/v1/models',
      handler: async ({ service }) => Response.json(await service.models.list()),
    },
    {
      method: 'GET',
      path: '/v1/active-credential',
      handler: async ({ service, url }) => {
        const accountId = url.searchParams.get('account_id') ?? undefined;

        try {
          return Response.json(await service.accounts.activeCredential({ accountId }));
        } catch (error) {
          if (error instanceof RpcServiceError) {
            return jsonError(error.status, error.message, 'invalid_request_error');
          }
          throw error;
        }
      },
    },
  ],
});
```

## Start a Bun Server

```ts
import { startBunRpcServer } from '@nogg-aholic/nrpc-api-kit';

startBunRpcServer({
  config: {
    port: 4000,
    serviceName: 'my-nrpc-service',
    websocketEnabled: true,
  },
  fetchHandler: createFetchHandler(),
  invokeRpcMethod: createRpcInvoker(),
});
```

`startBunRpcServer` exposes:

- HTTP RPC endpoint at `/rpc` by default
- websocket endpoint at `/rpc/ws` when `websocketEnabled` is true

Override paths with `rpcPath` and `websocketPath` in `startBunRpcServer` options.

## Config Helper

```ts
import { loadServiceConfig } from '@nogg-aholic/nrpc-api-kit';

const config = loadServiceConfig({
  defaultPort: 4000,
  serviceName: 'my-nrpc-service',
});
```

Environment variables:

- `PORT`: server port (falls back to `defaultPort`)
- `NRPC_ENABLE_WS`: enables websocket mode when set to `1`, `true`, `yes`, or `on`

## Generate Service Artifacts

Use the build export to generate contract and docs artifacts.

```ts
import { fileURLToPath } from 'node:url';
import { generateServiceArtifacts } from '@nogg-aholic/nrpc-api-kit/build';

await generateServiceArtifacts({
  entryFile: fileURLToPath(new URL('../src/rpc-service.ts', import.meta.url)),
  rootType: 'MyServiceContract',
  outFile: fileURLToPath(new URL('../src/generated/my-api.surface.ts', import.meta.url)),
  rootPath: [],
  globalName: 'myApi',
  docsInfo: {
    title: 'My Service nRPC API',
    version: '0.1.0',
    description: 'Generated nRPC contract artifacts for My Service.',
  },
});
```

## Exports

Main export (`@nogg-aholic/nrpc-api-kit`):

- constants: `RPC_AWAIT_EVENT`, `RPC_RETURN_EVENT`, `isWebsocketEnabled`
- errors: `RpcServiceError`, `isRpcServiceError`, `defaultTransformError`
- config: `loadServiceConfig`, `ServiceConfig`
- responses: `jsonError`, `notFoundJson`, `createRpcBinaryErrorResponse`
- server: `createServiceFetchHandler`, `handleRpcWebSocketMessage`, `startBunRpcServer`
- build: `generateServiceArtifacts`

Build export (`@nogg-aholic/nrpc-api-kit/build`):

- `generateServiceArtifacts`

## Runtime Notes

- `startBunRpcServer` and `generateServiceArtifacts` rely on Bun APIs.
- `createServiceFetchHandler` is runtime-agnostic and returns a standard `(request: Request) => Promise<Response>` handler.
