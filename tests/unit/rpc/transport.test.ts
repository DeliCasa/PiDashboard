/**
 * Transport Fetch Wrapper Unit Tests
 * Feature: 063-wire-vnext-integration (US3), 064-post-deploy-validation (US2)
 *
 * Tests the custom fetch wrapper in the Connect transport configuration:
 * 1. Strips AbortSignal from fetch init (jsdom compatibility)
 * 2. Passes init through unmodified when no signal present
 * 3. Late-binds to globalThis.fetch (MSW interception compatibility)
 * 4. Verifies JSON format configuration (useBinaryFormat: false)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The fetch wrapper is an inline closure inside createConnectTransport() in
// src/infrastructure/rpc/transport.ts. It cannot be extracted as a named export
// without restructuring the production code (the closure is passed directly as
// the `fetch` option). We replicate the exact logic here for unit testing.
// If the source implementation changes, this replica must be updated to match.

/** Replicates the fetch wrapper from src/infrastructure/rpc/transport.ts */
function transportFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (init?.signal) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signal, ...rest } = init;
    return globalThis.fetch(input, rest);
  }
  return globalThis.fetch(input, init);
}

describe('Transport fetch wrapper', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('strips AbortSignal from fetch init when present', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    globalThis.fetch = mockFetch;

    const controller = new AbortController();
    const headers = { 'Content-Type': 'application/json' };

    await transportFetch('http://localhost/rpc', {
      signal: controller.signal,
      headers,
      method: 'POST',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledInput, calledInit] = mockFetch.mock.calls[0];
    expect(calledInput).toBe('http://localhost/rpc');
    expect(calledInit).not.toHaveProperty('signal');
    expect(calledInit).toHaveProperty('headers', headers);
    expect(calledInit).toHaveProperty('method', 'POST');
  });

  it('passes init through unmodified when no signal', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    globalThis.fetch = mockFetch;

    const init: RequestInit = {
      headers: { 'X-API-Key': 'test-key' },
      method: 'POST',
      body: '{}',
    };

    await transportFetch('http://localhost/rpc', init);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, calledInit] = mockFetch.mock.calls[0];
    // Should be the exact same object reference — no modification
    expect(calledInit).toBe(init);
  });

  it('late-binds to globalThis.fetch for MSW interception', async () => {
    // Simulate MSW's behavior: replace globalThis.fetch AFTER module load
    const earlyFetch = vi.fn().mockResolvedValue(new Response('early'));
    const lateFetch = vi.fn().mockResolvedValue(new Response('late'));

    // Set initial fetch
    globalThis.fetch = earlyFetch;

    // Now replace fetch (simulating MSW setup)
    globalThis.fetch = lateFetch;

    await transportFetch('http://localhost/rpc', { method: 'POST' });

    // The late-bound fetch should be called, not the early one
    expect(earlyFetch).not.toHaveBeenCalled();
    expect(lateFetch).toHaveBeenCalledOnce();
  });

  it('handles undefined init gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    globalThis.fetch = mockFetch;

    await transportFetch('http://localhost/rpc');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, calledInit] = mockFetch.mock.calls[0];
    expect(calledInit).toBeUndefined();
  });
});

describe('Transport configuration', () => {
  // The transport is created at module load time with createConnectTransport(),
  // making it difficult to mock and inspect the config object directly.
  // Instead we verify the source code contains the expected configuration.
  // This catches regressions if someone changes useBinaryFormat to true.
  it('uses JSON format (useBinaryFormat: false), not gRPC binary', () => {
    const transportSource = readFileSync(
      resolve(__dirname, '../../../src/infrastructure/rpc/transport.ts'),
      'utf-8',
    );

    expect(transportSource).toContain('useBinaryFormat: false');
    expect(transportSource).not.toContain('useBinaryFormat: true');
  });
});
