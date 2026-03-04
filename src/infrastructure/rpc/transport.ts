/**
 * Connect RPC Transport
 * Feature: 062-piorch-grpc-client
 *
 * Creates the Connect transport used by all RPC service clients.
 * Uses Connect protocol (JSON over HTTP/1.1 POST) — not gRPC binary.
 */

import { createConnectTransport } from '@connectrpc/connect-web';
import { getApiKey } from '@/infrastructure/api/auth';
import type { Interceptor } from '@connectrpc/connect';

const RPC_BASE_URL = import.meta.env.VITE_PI_RPC_URL || '/rpc';

/**
 * Interceptor: adds X-API-Key header for protected RPCs.
 * API key is sourced from the existing auth module.
 */
const authInterceptor: Interceptor = (next) => async (req) => {
  const apiKey = getApiKey();
  if (apiKey) {
    req.header.set('X-API-Key', apiKey);
  }
  return next(req);
};

/**
 * Interceptor: adds X-Correlation-ID header for request tracing.
 */
const correlationInterceptor: Interceptor = (next) => async (req) => {
  req.header.set('X-Correlation-ID', crypto.randomUUID());
  return next(req);
};

/**
 * Shared Connect transport for all PiOrchestrator RPC clients.
 * Uses Connect protocol (not gRPC-Web) for HTTP/1.1 compatibility.
 */
export const transport = createConnectTransport({
  baseUrl: RPC_BASE_URL,
  useBinaryFormat: false,
  // Custom fetch wrapper: strips AbortSignal to avoid jsdom incompatibility in tests.
  // Also late-binds to globalThis.fetch so MSW interception works.
  fetch: (input, init) => {
    if (init?.signal) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { signal, ...rest } = init;
      return globalThis.fetch(input, rest);
    }
    return globalThis.fetch(input, init);
  },
  interceptors: [authInterceptor, correlationInterceptor],
});
