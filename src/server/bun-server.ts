import type { RpcMethodInvoker } from '@nogg-aholic/nrpc/web-runtime';

import type { ServiceConfig } from '../config/env.js';
import { handleRpcWebSocketMessage } from './ws-dispatcher.js';

export interface StartBunRpcServerOptions {
  config: ServiceConfig;
  fetchHandler: (request: Request) => Promise<Response>;
  invokeRpcMethod: RpcMethodInvoker;
  rpcPath?: string;
  websocketPath?: string;
}

export const startBunRpcServer = (options: StartBunRpcServerOptions): void => {
  const rpcPath = options.rpcPath ?? '/rpc';
  const websocketPath = options.websocketPath ?? `${rpcPath}/ws`;

  Bun.serve({
    port: options.config.port,
    fetch(request, server) {
      if (options.config.websocketEnabled && new URL(request.url).pathname === websocketPath) {
        const upgraded = server.upgrade(request);
        if (upgraded) {
          return;
        }

        return new Response('websocket upgrade required', { status: 426 });
      }

      return options.fetchHandler(request);
    },
    websocket: {
      async message(ws, message) {
        if (!options.config.websocketEnabled) {
          ws.close(1008, 'websocket mode disabled');
          return;
        }

        await handleRpcWebSocketMessage(ws, message, options.invokeRpcMethod);
      },
    },
  });

  console.log(`${options.config.serviceName} listening on http://127.0.0.1:${String(options.config.port)}`);
  console.log(`RPC endpoint: http://127.0.0.1:${String(options.config.port)}${rpcPath}`);
  if (options.config.websocketEnabled) {
    console.log(`RPC websocket endpoint: ws://127.0.0.1:${String(options.config.port)}${websocketPath}`);
  }
};