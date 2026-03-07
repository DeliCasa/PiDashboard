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
  // CANONICAL fetch wrapper (Feature 062/063): two intentional behaviors:
  // 1. Strips AbortSignal — jsdom's AbortSignal is incompatible with fetch spec,
  //    causing Connect RPC requests to fail in Vitest. Removing signal is safe
  //    because PiDashboard requests are short-lived (no manual abort needed).
  // 2. Late-binds to globalThis.fetch — MSW patches globalThis.fetch at runtime,
  //    so we must NOT capture fetch at module load time.
  // Do NOT add global fetch/signal patches in test setup files; this is the sole fix.
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
