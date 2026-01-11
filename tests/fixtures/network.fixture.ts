/**
 * Network Test Fixtures (T018)
 * Mock data for Network API transformation tests (bug v1.1.2)
 */

import type { TailscaleStatus } from '@/domain/types/entities';

// Backend Tailscale API response (uses backend_state, tailscale_ip)
export const tailscaleApiResponses = {
  connected: {
    backend_state: 'Running',
    tailscale_ip: '100.74.31.25',
    hostname: 'delicasa-pi-001',
    tailnet: 'tail1ba2bb.ts.net',
    peers: [
      {
        id: 'node123',
        hostname: 'dokku',
        tailscale_ip: '100.100.100.1',
        online: true,
        is_bridge_server: true,
      },
      {
        id: 'node456',
        hostname: 'workstation',
        tailscale_ip: '100.100.100.2',
        online: false,
        is_bridge_server: false,
      },
    ],
    funnel_status: {
      enabled: true,
      exposed_ports: { '443': 'https://dokku.tail1ba2bb.ts.net' },
    },
    needs_login: false,
  },

  disconnected: {
    backend_state: 'Stopped',
    tailscale_ip: '',
    hostname: 'delicasa-pi-001',
    needs_login: true,
  },

  needsAuth: {
    backend_state: 'NeedsLogin',
    tailscale_ip: '',
    hostname: 'delicasa-pi-001',
    needs_login: true,
  },

  noPeers: {
    backend_state: 'Running',
    tailscale_ip: '100.74.31.25',
    hostname: 'delicasa-pi-001',
    peers: [],
  },

  // Edge case: undefined fields
  partialResponse: {
    backend_state: 'Running',
    tailscale_ip: '',
    hostname: 'unknown',
  },
};

// Expected frontend TailscaleStatus transformations
export const expectedTailscaleStatus: Record<string, TailscaleStatus> = {
  connected: {
    connected: true,
    ip: '100.74.31.25',
    hostname: 'delicasa-pi-001',
    peers: [
      { name: 'dokku', ip: '100.100.100.1', online: true },
      { name: 'workstation', ip: '100.100.100.2', online: false },
    ],
  },

  disconnected: {
    connected: false,
    ip: undefined,
    hostname: 'delicasa-pi-001',
    peers: undefined,
  },

  noPeers: {
    connected: true,
    ip: '100.74.31.25',
    hostname: 'delicasa-pi-001',
    peers: [],
  },
};

// Backend BridgeServer API response
export const bridgeApiResponses = {
  connected: {
    status: {
      configured: true,
      connected: true,
      url: 'https://dokku.tail1ba2bb.ts.net/api',
    },
    success: true,
  },

  disconnected: {
    status: {
      configured: true,
      connected: false,
      url: 'https://dokku.tail1ba2bb.ts.net/api',
    },
    success: true,
  },

  notConfigured: {
    status: {
      configured: false,
      connected: false,
    },
    success: true,
  },

  // Edge case: missing status object
  emptyResponse: {
    success: false,
  },

  // Edge case: null status
  nullStatus: {
    status: null,
    success: true,
  },
};

// Backend state mapping test cases
export const backendStateCases = [
  { state: 'Running', expectedConnected: true },
  { state: 'Stopped', expectedConnected: false },
  { state: 'NeedsLogin', expectedConnected: false },
  { state: 'Starting', expectedConnected: false },
  { state: 'NoState', expectedConnected: false },
  { state: '', expectedConnected: false },
];
