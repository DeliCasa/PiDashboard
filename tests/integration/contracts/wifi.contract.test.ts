/**
 * WiFi API Contract Tests
 * Feature: 005-testing-research-and-hardening (T028)
 *
 * Validates that mock data matches the Zod schemas defined for WiFi API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  WifiNetworkApiSchema,
  WifiScanResponseSchema,
  WifiStatusResponseSchema,
  WifiConnectRequestSchema,
  WifiConnectResponseSchema,
} from '@/infrastructure/api/schemas';

/**
 * Valid mock data matching actual PiOrchestrator responses
 * NOTE: V1 envelope is unwrapped by proxy, so success is not included
 */
const validWifiScanResponse = {
  count: 3,
  networks: [
    {
      ssid: 'HomeNetwork-5G',
      bssid: '00:11:22:33:44:55',
      frequency: 5180,
      signal: -45,
      security: 'WPA2',
      channel: 36,
      quality: 85,
    },
    {
      ssid: 'HomeNetwork-2G',
      bssid: '00:11:22:33:44:56',
      frequency: 2437,
      signal: -55,
      security: 'WPA2',
      channel: 6,
      quality: 70,
    },
    {
      ssid: 'GuestNetwork',
      signal: -75,
      security: 'Open',
    },
  ],
};

const validWifiStatusResponse = {
  status: {
    connected: true,
    ssid: 'HomeNetwork-5G',
    ip_address: '192.168.1.100',
    signal_strength: -45,
    mode: 'client' as const,
  },
};

const validWifiConnectRequest = {
  ssid: 'HomeNetwork-5G',
  password: 'securepassword123',
};

const validWifiConnectResponse = {
  success: true,
  message: 'Connected successfully',
};

/**
 * Mock data variants for different scenarios
 * NOTE: V1 envelope is unwrapped by proxy, so success is not included
 */
const scanVariants = {
  manyNetworks: validWifiScanResponse,
  emptyNetworks: { count: 0, networks: [] },
  singleNetwork: {
    count: 1,
    networks: [{ ssid: 'SingleNet', signal: -50, security: 'WPA3' }],
  },
  hiddenNetwork: {
    count: 1,
    networks: [{ ssid: '', signal: -60, security: 'WPA2' }],
  },
  weakSignal: {
    count: 1,
    networks: [{ ssid: 'WeakNet', signal: -90, security: 'WPA2' }],
  },
};

const statusVariants = {
  connected: validWifiStatusResponse,
  disconnected: {
    status: {
      connected: false,
      mode: 'disconnected' as const,
    },
  },
  apMode: {
    status: {
      connected: true,
      ssid: 'PiOrchestrator-AP',
      ip_address: '192.168.4.1',
      mode: 'ap' as const,
    },
  },
};

describe('WiFi API Contracts', () => {
  describe('WifiNetworkApiSchema', () => {
    it('validates complete network data', () => {
      const result = WifiNetworkApiSchema.safeParse(validWifiScanResponse.networks[0]);
      expect(result.success).toBe(true);
    });

    it('validates minimal network data (only required fields)', () => {
      const minimal = { ssid: 'MinimalNet', signal: -50, security: 'WPA2' };
      const result = WifiNetworkApiSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('accepts empty SSID (hidden networks)', () => {
      const hidden = { ssid: '', signal: -60, security: 'WPA2' };
      const result = WifiNetworkApiSchema.safeParse(hidden);
      expect(result.success).toBe(true);
    });

    it('accepts various security types', () => {
      const securityTypes = ['WPA2', 'WPA3', 'WPA', 'WEP', 'Open', 'None'];
      for (const security of securityTypes) {
        const network = { ssid: 'TestNet', signal: -50, security };
        const result = WifiNetworkApiSchema.safeParse(network);
        expect(result.success, `Security type "${security}" should be valid`).toBe(true);
      }
    });

    it('rejects missing required fields', () => {
      const invalid = { ssid: 'TestNet', signal: -50 }; // missing security
      const result = WifiNetworkApiSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('WifiScanResponseSchema', () => {
    it('validates complete scan response', () => {
      const result = WifiScanResponseSchema.safeParse(validWifiScanResponse);
      expect(result.success).toBe(true);
    });

    it('validates all scan variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(scanVariants)) {
        const result = WifiScanResponseSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('rejects negative count', () => {
      const invalid = { ...validWifiScanResponse, count: -1 };
      const result = WifiScanResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects non-integer count', () => {
      const invalid = { ...validWifiScanResponse, count: 2.5 };
      const result = WifiScanResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires networks field', () => {
      // V1 envelope unwrapped - success not required, but networks is required
      const invalid = { count: 0 };
      const result = WifiScanResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('WifiStatusResponseSchema', () => {
    it('validates connected status', () => {
      const result = WifiStatusResponseSchema.safeParse(validWifiStatusResponse);
      expect(result.success).toBe(true);
    });

    it('validates all status variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(statusVariants)) {
        const result = WifiStatusResponseSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('requires connected field in status', () => {
      const invalid = { status: { ssid: 'TestNet' } };
      const result = WifiStatusResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates mode enum values', () => {
      const validModes = ['client', 'ap', 'disconnected'];
      for (const mode of validModes) {
        const data = { status: { connected: true, mode } };
        const result = WifiStatusResponseSchema.safeParse(data);
        expect(result.success, `Mode "${mode}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid mode values', () => {
      const invalid = { status: { connected: true, mode: 'invalid_mode' } };
      const result = WifiStatusResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('WifiConnectRequestSchema', () => {
    it('validates request with password', () => {
      const result = WifiConnectRequestSchema.safeParse(validWifiConnectRequest);
      expect(result.success).toBe(true);
    });

    it('validates request without password (open network)', () => {
      const openNetwork = { ssid: 'OpenNetwork' };
      const result = WifiConnectRequestSchema.safeParse(openNetwork);
      expect(result.success).toBe(true);
    });

    it('rejects empty SSID', () => {
      const invalid = { ssid: '', password: 'test' };
      const result = WifiConnectRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires SSID field', () => {
      const invalid = { password: 'test' };
      const result = WifiConnectRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('WifiConnectResponseSchema', () => {
    it('validates success response', () => {
      const result = WifiConnectResponseSchema.safeParse(validWifiConnectResponse);
      expect(result.success).toBe(true);
    });

    it('validates error response', () => {
      const errorResponse = {
        success: false,
        error: 'Invalid password',
      };
      const result = WifiConnectResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('validates response with both message and error', () => {
      const mixed = {
        success: false,
        message: 'Connection attempt made',
        error: 'Authentication failed',
      };
      const result = WifiConnectResponseSchema.safeParse(mixed);
      expect(result.success).toBe(true);
    });

    it('requires success field', () => {
      const invalid = { message: 'Connected' };
      const result = WifiConnectResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
