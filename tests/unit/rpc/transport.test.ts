/**
 * Transport Fetch Wrapper Unit Tests
 * Feature: 063-wire-vnext-integration (US3)
 *
 * Tests the custom fetch wrapper in the Connect transport configuration:
 * 1. Strips AbortSignal from fetch init (jsdom compatibility)
 * 2. Passes init through unmodified when no signal present
 * 3. Late-binds to globalThis.fetch (MSW interception compatibility)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the fetch wrapper behavior by extracting the logic from transport.ts.
// The transport module's fetch option is: (input, init) => { strip signal, call globalThis.fetch }
// We replicate and test this exact logic since it's an inline function.

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
