import { isWebsocketEnabled } from '../constants.js';

export interface ServiceConfig {
  port: number;
  serviceName: string;
  websocketEnabled: boolean;
}

export interface LoadServiceConfigOptions {
  defaultPort: number;
  serviceName: string;
}

export const loadServiceConfig = (options: LoadServiceConfigOptions): ServiceConfig => ({
  port: Number.parseInt(process.env.PORT ?? String(options.defaultPort), 10),
  serviceName: options.serviceName,
  websocketEnabled: isWebsocketEnabled(),
});