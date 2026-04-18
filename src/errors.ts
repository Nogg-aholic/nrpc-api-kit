export class RpcServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RpcServiceError';
  }
}

export const isRpcServiceError = (error: unknown): error is RpcServiceError =>
  error instanceof RpcServiceError;

export const defaultTransformError = (error: unknown) => ({
  message: error instanceof Error ? error.message : 'rpc_error',
});