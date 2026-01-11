/**
 * Provisioning Test Fixtures
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Mock data for batch provisioning contract and integration tests.
 */

import type {
  BatchProvisioningSession,
  ProvisioningCandidate,
  DeviceAllowlistEntry,
  NetworkStatus,
  SessionConfig,
  StartSessionData,
  SessionData,
  AllowlistData,
  RecoverableSessionsData,
  DeviceOperationData,
  ProvisionAllData,
  StopSessionData,
} from '@/domain/types/provisioning';

import type {
  V1SuccessResponse,
  V1ErrorResponse,
  V1Error,
} from '@/domain/types/v1-api';

import type {
  SSEEventEnvelope,
  ConnectionEstablishedPayload,
  SessionStatusPayload,
  DeviceStateChangedPayload,
  DeviceDiscoveredPayload,
  NetworkStatusChangedPayload,
  SSEErrorPayload,
} from '@/domain/types/sse';

// ============================================================================
// Session Fixtures
// ============================================================================

export const mockSessionConfig: SessionConfig = {
  discovery_timeout_seconds: 60,
  provisioning_timeout_seconds: 120,
  verification_timeout_seconds: 90,
};

export const mockBatchSession: BatchProvisioningSession = {
  id: 'sess_test123abc',
  state: 'discovering',
  target_ssid: 'TestNetwork',
  created_at: '2026-01-11T10:00:00Z',
  updated_at: '2026-01-11T10:01:00Z',
  expires_at: '2026-01-11T11:00:00Z',
  device_count: 3,
  provisioned_count: 0,
  verified_count: 0,
  failed_count: 0,
  config: mockSessionConfig,
};

export const mockActiveSession: BatchProvisioningSession = {
  ...mockBatchSession,
  id: 'sess_active456',
  state: 'active',
  device_count: 5,
  provisioned_count: 2,
  verified_count: 1,
  failed_count: 0,
};

export const mockClosedSession: BatchProvisioningSession = {
  ...mockBatchSession,
  id: 'sess_closed789',
  state: 'closed',
  device_count: 5,
  provisioned_count: 4,
  verified_count: 4,
  failed_count: 1,
};

// ============================================================================
// Candidate Fixtures
// ============================================================================

export const mockDiscoveredCandidate: ProvisioningCandidate = {
  mac: 'AA:BB:CC:DD:EE:01',
  ip: '192.168.4.101',
  state: 'discovered',
  rssi: -55,
  firmware_version: '1.2.3',
  discovered_at: '2026-01-11T10:00:30Z',
  retry_count: 0,
  in_allowlist: true,
};

export const mockProvisioningCandidate: ProvisioningCandidate = {
  mac: 'AA:BB:CC:DD:EE:02',
  ip: '192.168.4.102',
  state: 'provisioning',
  rssi: -60,
  firmware_version: '1.2.3',
  discovered_at: '2026-01-11T10:00:35Z',
  retry_count: 0,
  in_allowlist: true,
};

export const mockProvisionedCandidate: ProvisioningCandidate = {
  mac: 'AA:BB:CC:DD:EE:03',
  ip: '192.168.4.103',
  state: 'provisioned',
  rssi: -50,
  firmware_version: '1.2.3',
  discovered_at: '2026-01-11T10:00:40Z',
  provisioned_at: '2026-01-11T10:02:00Z',
  retry_count: 0,
  in_allowlist: true,
};

export const mockVerifiedCandidate: ProvisioningCandidate = {
  mac: 'AA:BB:CC:DD:EE:04',
  ip: '192.168.4.104',
  state: 'verified',
  rssi: -45,
  firmware_version: '1.2.3',
  discovered_at: '2026-01-11T10:00:45Z',
  provisioned_at: '2026-01-11T10:02:30Z',
  verified_at: '2026-01-11T10:03:30Z',
  retry_count: 0,
  container_id: 'container-001',
  in_allowlist: true,
};

export const mockFailedCandidate: ProvisioningCandidate = {
  mac: 'AA:BB:CC:DD:EE:05',
  ip: '192.168.4.105',
  state: 'failed',
  rssi: -75,
  firmware_version: '1.2.3',
  discovered_at: '2026-01-11T10:00:50Z',
  error_message: 'Device unreachable after 3 attempts',
  retry_count: 3,
  in_allowlist: true,
};

export const mockNotInAllowlistCandidate: ProvisioningCandidate = {
  mac: 'FF:FF:FF:00:00:01',
  ip: '192.168.4.200',
  state: 'discovered',
  rssi: -65,
  firmware_version: '1.0.0',
  discovered_at: '2026-01-11T10:01:00Z',
  retry_count: 0,
  in_allowlist: false,
};

export const mockCandidates: ProvisioningCandidate[] = [
  mockDiscoveredCandidate,
  mockProvisioningCandidate,
  mockProvisionedCandidate,
  mockVerifiedCandidate,
  mockFailedCandidate,
];

// ============================================================================
// Allowlist Fixtures
// ============================================================================

export const mockAllowlistEntry: DeviceAllowlistEntry = {
  mac: 'AA:BB:CC:DD:EE:01',
  description: 'Container sensor #1',
  container_id: 'container-001',
  added_at: '2026-01-10T09:00:00Z',
  used: false,
};

export const mockUsedAllowlistEntry: DeviceAllowlistEntry = {
  mac: 'AA:BB:CC:DD:EE:04',
  description: 'Container sensor #4',
  container_id: 'container-004',
  added_at: '2026-01-09T09:00:00Z',
  used: true,
  used_at: '2026-01-11T10:03:30Z',
};

export const mockAllowlistEntries: DeviceAllowlistEntry[] = [
  mockAllowlistEntry,
  {
    mac: 'AA:BB:CC:DD:EE:02',
    description: 'Container sensor #2',
    added_at: '2026-01-10T09:00:00Z',
    used: false,
  },
  {
    mac: 'AA:BB:CC:DD:EE:03',
    description: 'Container sensor #3',
    added_at: '2026-01-10T09:00:00Z',
    used: false,
  },
  mockUsedAllowlistEntry,
];

// ============================================================================
// Network Status Fixtures
// ============================================================================

export const mockNetworkStatus: NetworkStatus = {
  ssid: 'DelicasaOnboard',
  is_active: true,
  connected_devices: 5,
};

export const mockNetworkStatusInactive: NetworkStatus = {
  ssid: 'DelicasaOnboard',
  is_active: false,
  connected_devices: 0,
};

// ============================================================================
// V1 Response Fixtures
// ============================================================================

export const mockCorrelationId = 'corr-12345-abcde-67890';
export const mockTimestamp = '2026-01-11T10:00:00Z';

export const mockStartSessionResponse: V1SuccessResponse<StartSessionData> = {
  success: true,
  data: {
    session: mockBatchSession,
    message: 'Batch provisioning session started',
  },
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

export const mockSessionDataResponse: V1SuccessResponse<SessionData> = {
  success: true,
  data: {
    session: mockActiveSession,
    devices: mockCandidates,
    timeout_remaining: '00:45:00',
    network_status: mockNetworkStatus,
  },
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

export const mockAllowlistResponse: V1SuccessResponse<AllowlistData> = {
  success: true,
  data: {
    entries: mockAllowlistEntries,
  },
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

export const mockRecoverableSessionsResponse: V1SuccessResponse<RecoverableSessionsData> =
  {
    success: true,
    data: {
      sessions: [mockActiveSession],
    },
    correlation_id: mockCorrelationId,
    timestamp: mockTimestamp,
  };

export const mockDeviceOperationResponse: V1SuccessResponse<DeviceOperationData> =
  {
    success: true,
    data: {
      mac: 'AA:BB:CC:DD:EE:01',
      state: 'provisioning',
      message: 'Provisioning initiated',
    },
    correlation_id: mockCorrelationId,
    timestamp: mockTimestamp,
  };

export const mockProvisionAllResponse: V1SuccessResponse<ProvisionAllData> = {
  success: true,
  data: {
    initiated_count: 3,
    skipped_count: 1,
    message: 'Provisioning initiated for 3 devices, 1 skipped (not in allowlist)',
  },
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

export const mockStopSessionResponse: V1SuccessResponse<StopSessionData> = {
  success: true,
  data: {
    session: mockClosedSession,
    message: 'Session closed successfully',
  },
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

// ============================================================================
// V1 Error Response Fixtures
// ============================================================================

export const mockV1Error: V1Error = {
  code: 'SESSION_NOT_FOUND',
  message: 'The requested session does not exist',
  retryable: false,
};

export const mockV1RetryableError: V1Error = {
  code: 'RATE_LIMITED',
  message: 'Too many requests',
  retryable: true,
  retry_after_seconds: 30,
};

export const mockV1ErrorResponse: V1ErrorResponse = {
  success: false,
  error: mockV1Error,
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

export const mockV1RetryableErrorResponse: V1ErrorResponse = {
  success: false,
  error: mockV1RetryableError,
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

export const mockUnauthorizedErrorResponse: V1ErrorResponse = {
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'API key required for this endpoint',
    retryable: false,
  },
  correlation_id: mockCorrelationId,
  timestamp: mockTimestamp,
};

// ============================================================================
// SSE Event Fixtures
// ============================================================================

export const mockConnectionEstablishedEvent: SSEEventEnvelope<ConnectionEstablishedPayload> =
  {
    version: '1.0',
    type: 'connection.established',
    timestamp: mockTimestamp,
    session_id: 'sess_test123abc',
    payload: {
      message: 'Connected to provisioning event stream',
      session_id: 'sess_test123abc',
    },
  };

export const mockHeartbeatEvent: SSEEventEnvelope<null> = {
  version: '1.0',
  type: 'connection.heartbeat',
  timestamp: mockTimestamp,
  payload: null,
};

export const mockSessionStatusEvent: SSEEventEnvelope<SessionStatusPayload> = {
  version: '1.0',
  type: 'session.status',
  timestamp: mockTimestamp,
  session_id: 'sess_test123abc',
  payload: {
    session: mockActiveSession,
  },
};

export const mockDeviceStateChangedEvent: SSEEventEnvelope<DeviceStateChangedPayload> =
  {
    version: '1.0',
    type: 'device.state_changed',
    timestamp: mockTimestamp,
    session_id: 'sess_test123abc',
    payload: {
      mac: 'AA:BB:CC:DD:EE:01',
      previous_state: 'discovered',
      new_state: 'provisioning',
      progress: 25,
    },
  };

export const mockDeviceDiscoveredEvent: SSEEventEnvelope<DeviceDiscoveredPayload> =
  {
    version: '1.0',
    type: 'device.discovered',
    timestamp: mockTimestamp,
    session_id: 'sess_test123abc',
    payload: {
      mac: 'AA:BB:CC:DD:EE:06',
      ip: '192.168.4.106',
      rssi: -58,
      firmware_version: '1.2.3',
      in_allowlist: true,
    },
  };

export const mockNetworkStatusChangedEvent: SSEEventEnvelope<NetworkStatusChangedPayload> =
  {
    version: '1.0',
    type: 'network.status_changed',
    timestamp: mockTimestamp,
    payload: {
      ssid: 'DelicasaOnboard',
      is_active: true,
      connected_devices: 6,
    },
  };

export const mockSSEErrorEvent: SSEEventEnvelope<SSEErrorPayload> = {
  version: '1.0',
  type: 'error',
  timestamp: mockTimestamp,
  payload: {
    code: 'SESSION_EXPIRED',
    message: 'The session has expired',
    retryable: false,
  },
};
