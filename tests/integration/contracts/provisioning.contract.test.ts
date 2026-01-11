/**
 * Provisioning API Contract Tests
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Validates that fixtures match Zod schemas to detect API contract drift.
 */

import { describe, it, expect } from 'vitest';

import {
  // V1 envelope schemas
  V1ErrorSchema,
  V1ErrorResponseSchema,
  createV1SuccessSchema,
  createV1ResponseSchema,
  // Provisioning schemas
  BatchProvisioningSessionSchema,
  ProvisioningCandidateSchema,
  DeviceAllowlistEntrySchema,
  NetworkStatusSchema,
  SessionConfigSchema,
  SessionStateSchema,
  CandidateStateSchema,
  // Response data schemas
  StartSessionDataSchema,
  SessionDataSchema,
  AllowlistDataSchema,
  RecoverableSessionsDataSchema,
  DeviceOperationDataSchema,
  ProvisionAllDataSchema,
  StopSessionDataSchema,
  // SSE schemas
  DeviceStateChangedPayloadSchema,
  DeviceDiscoveredPayloadSchema,
  SessionStatusPayloadSchema,
  NetworkStatusChangedPayloadSchema,
  SSEErrorPayloadSchema,
  createSSEEventEnvelopeSchema,
} from '@/infrastructure/api/schemas';

import {
  // Session fixtures
  mockBatchSession,
  mockActiveSession,
  mockClosedSession,
  mockSessionConfig,
  // Candidate fixtures
  mockDiscoveredCandidate,
  mockProvisioningCandidate,
  mockProvisionedCandidate,
  mockVerifiedCandidate,
  mockFailedCandidate,
  mockNotInAllowlistCandidate,
  mockCandidates,
  // Allowlist fixtures
  mockAllowlistEntry,
  mockUsedAllowlistEntry,
  mockAllowlistEntries,
  // Network fixtures
  mockNetworkStatus,
  mockNetworkStatusInactive,
  // V1 response fixtures
  mockV1Error,
  mockV1RetryableError,
  mockV1ErrorResponse,
  mockV1RetryableErrorResponse,
  mockUnauthorizedErrorResponse,
  mockStartSessionResponse,
  mockSessionDataResponse,
  mockAllowlistResponse,
  mockRecoverableSessionsResponse,
  mockDeviceOperationResponse,
  mockProvisionAllResponse,
  mockStopSessionResponse,
  // SSE event fixtures
  mockHeartbeatEvent,
  mockSessionStatusEvent,
  mockDeviceStateChangedEvent,
  mockDeviceDiscoveredEvent,
  mockNetworkStatusChangedEvent,
  mockSSEErrorEvent,
} from '../../fixtures/provisioning.fixture';

// ============================================================================
// Session Schema Tests
// ============================================================================

describe('BatchProvisioningSession Schema', () => {
  it('validates discovering session', () => {
    const result = BatchProvisioningSessionSchema.safeParse(mockBatchSession);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('discovering');
    }
  });

  it('validates active session', () => {
    const result = BatchProvisioningSessionSchema.safeParse(mockActiveSession);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('active');
      expect(result.data.provisioned_count).toBeGreaterThan(0);
    }
  });

  it('validates closed session', () => {
    const result = BatchProvisioningSessionSchema.safeParse(mockClosedSession);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('closed');
    }
  });

  it('validates session config', () => {
    const result = SessionConfigSchema.safeParse(mockSessionConfig);
    expect(result.success).toBe(true);
  });

  it('validates all session states', () => {
    const states = ['discovering', 'active', 'paused', 'closing', 'closed'];
    states.forEach((state) => {
      const result = SessionStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Candidate Schema Tests
// ============================================================================

describe('ProvisioningCandidate Schema', () => {
  it('validates discovered candidate', () => {
    const result = ProvisioningCandidateSchema.safeParse(mockDiscoveredCandidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('discovered');
    }
  });

  it('validates provisioning candidate', () => {
    const result = ProvisioningCandidateSchema.safeParse(mockProvisioningCandidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('provisioning');
    }
  });

  it('validates provisioned candidate', () => {
    const result = ProvisioningCandidateSchema.safeParse(mockProvisionedCandidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provisioned_at).toBeDefined();
    }
  });

  it('validates verified candidate', () => {
    const result = ProvisioningCandidateSchema.safeParse(mockVerifiedCandidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verified_at).toBeDefined();
      expect(result.data.container_id).toBeDefined();
    }
  });

  it('validates failed candidate', () => {
    const result = ProvisioningCandidateSchema.safeParse(mockFailedCandidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error_message).toBeDefined();
      expect(result.data.retry_count).toBeGreaterThan(0);
    }
  });

  it('validates not in allowlist candidate', () => {
    const result = ProvisioningCandidateSchema.safeParse(mockNotInAllowlistCandidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.in_allowlist).toBe(false);
    }
  });

  it('validates all candidates in array', () => {
    mockCandidates.forEach((candidate) => {
      const result = ProvisioningCandidateSchema.safeParse(candidate);
      expect(result.success).toBe(true);
    });
  });

  it('validates all candidate states', () => {
    const states = [
      'discovered',
      'provisioning',
      'provisioned',
      'verifying',
      'verified',
      'failed',
    ];
    states.forEach((state) => {
      const result = CandidateStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid MAC address format', () => {
    const invalidCandidate = {
      ...mockDiscoveredCandidate,
      mac: 'invalid-mac',
    };
    const result = ProvisioningCandidateSchema.safeParse(invalidCandidate);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Allowlist Schema Tests
// ============================================================================

describe('DeviceAllowlistEntry Schema', () => {
  it('validates unused allowlist entry', () => {
    const result = DeviceAllowlistEntrySchema.safeParse(mockAllowlistEntry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.used).toBe(false);
    }
  });

  it('validates used allowlist entry', () => {
    const result = DeviceAllowlistEntrySchema.safeParse(mockUsedAllowlistEntry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.used).toBe(true);
      expect(result.data.used_at).toBeDefined();
    }
  });

  it('validates all allowlist entries', () => {
    mockAllowlistEntries.forEach((entry) => {
      const result = DeviceAllowlistEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Network Status Schema Tests
// ============================================================================

describe('NetworkStatus Schema', () => {
  it('validates active network status', () => {
    const result = NetworkStatusSchema.safeParse(mockNetworkStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });

  it('validates inactive network status', () => {
    const result = NetworkStatusSchema.safeParse(mockNetworkStatusInactive);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(false);
    }
  });
});

// ============================================================================
// V1 Error Schema Tests
// ============================================================================

describe('V1 Error Schemas', () => {
  it('validates V1 error', () => {
    const result = V1ErrorSchema.safeParse(mockV1Error);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retryable).toBe(false);
    }
  });

  it('validates V1 retryable error', () => {
    const result = V1ErrorSchema.safeParse(mockV1RetryableError);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retryable).toBe(true);
      expect(result.data.retry_after_seconds).toBeDefined();
    }
  });

  it('validates V1 error response', () => {
    const result = V1ErrorResponseSchema.safeParse(mockV1ErrorResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });

  it('validates V1 retryable error response', () => {
    const result = V1ErrorResponseSchema.safeParse(mockV1RetryableErrorResponse);
    expect(result.success).toBe(true);
  });

  it('validates unauthorized error response', () => {
    const result = V1ErrorResponseSchema.safeParse(mockUnauthorizedErrorResponse);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// V1 Success Response Schema Tests
// ============================================================================

describe('V1 Success Response Schemas', () => {
  it('validates start session response', () => {
    const schema = createV1SuccessSchema(StartSessionDataSchema);
    const result = schema.safeParse(mockStartSessionResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.correlation_id).toBeDefined();
    }
  });

  it('validates session data response', () => {
    const schema = createV1SuccessSchema(SessionDataSchema);
    const result = schema.safeParse(mockSessionDataResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.devices).toBeDefined();
      expect(result.data.data.network_status).toBeDefined();
    }
  });

  it('validates allowlist response', () => {
    const schema = createV1SuccessSchema(AllowlistDataSchema);
    const result = schema.safeParse(mockAllowlistResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.entries.length).toBeGreaterThan(0);
    }
  });

  it('validates recoverable sessions response', () => {
    const schema = createV1SuccessSchema(RecoverableSessionsDataSchema);
    const result = schema.safeParse(mockRecoverableSessionsResponse);
    expect(result.success).toBe(true);
  });

  it('validates device operation response', () => {
    const schema = createV1SuccessSchema(DeviceOperationDataSchema);
    const result = schema.safeParse(mockDeviceOperationResponse);
    expect(result.success).toBe(true);
  });

  it('validates provision all response', () => {
    const schema = createV1SuccessSchema(ProvisionAllDataSchema);
    const result = schema.safeParse(mockProvisionAllResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.initiated_count).toBeGreaterThan(0);
    }
  });

  it('validates stop session response', () => {
    const schema = createV1SuccessSchema(StopSessionDataSchema);
    const result = schema.safeParse(mockStopSessionResponse);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// V1 Response Union Schema Tests
// ============================================================================

describe('V1 Response Union Schemas', () => {
  it('discriminates success response', () => {
    const schema = createV1ResponseSchema(StartSessionDataSchema);
    const result = schema.safeParse(mockStartSessionResponse);
    expect(result.success).toBe(true);
    if (result.success && result.data.success) {
      expect(result.data.data.session).toBeDefined();
    }
  });

  it('discriminates error response', () => {
    const schema = createV1ResponseSchema(StartSessionDataSchema);
    const result = schema.safeParse(mockV1ErrorResponse);
    expect(result.success).toBe(true);
    if (result.success && !result.data.success) {
      expect(result.data.error.code).toBeDefined();
    }
  });
});

// ============================================================================
// SSE Event Schema Tests
// ============================================================================

describe('SSE Event Schemas', () => {
  it('validates device state changed payload', () => {
    const result = DeviceStateChangedPayloadSchema.safeParse(
      mockDeviceStateChangedEvent.payload
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previous_state).toBe('discovered');
      expect(result.data.new_state).toBe('provisioning');
    }
  });

  it('validates device discovered payload', () => {
    const result = DeviceDiscoveredPayloadSchema.safeParse(
      mockDeviceDiscoveredEvent.payload
    );
    expect(result.success).toBe(true);
  });

  it('validates session status payload', () => {
    const result = SessionStatusPayloadSchema.safeParse(
      mockSessionStatusEvent.payload
    );
    expect(result.success).toBe(true);
  });

  it('validates network status changed payload', () => {
    const result = NetworkStatusChangedPayloadSchema.safeParse(
      mockNetworkStatusChangedEvent.payload
    );
    expect(result.success).toBe(true);
  });

  it('validates SSE error payload', () => {
    const result = SSEErrorPayloadSchema.safeParse(mockSSEErrorEvent.payload);
    expect(result.success).toBe(true);
  });

  it('validates SSE event envelope structure', () => {
    const schema = createSSEEventEnvelopeSchema(DeviceStateChangedPayloadSchema);
    const result = schema.safeParse(mockDeviceStateChangedEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe('1.0');
      expect(result.data.type).toBe('device.state_changed');
    }
  });

  it('validates heartbeat event (null payload)', () => {
    // Heartbeat has null payload which should be handled by the envelope
    expect(mockHeartbeatEvent.type).toBe('connection.heartbeat');
    expect(mockHeartbeatEvent.payload).toBeNull();
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  it('rejects session with invalid state', () => {
    const invalidSession = {
      ...mockBatchSession,
      state: 'invalid_state',
    };
    const result = BatchProvisioningSessionSchema.safeParse(invalidSession);
    expect(result.success).toBe(false);
  });

  it('rejects candidate with negative retry count', () => {
    const invalidCandidate = {
      ...mockDiscoveredCandidate,
      retry_count: -1,
    };
    const result = ProvisioningCandidateSchema.safeParse(invalidCandidate);
    expect(result.success).toBe(false);
  });

  it('rejects network status with negative device count', () => {
    const invalidNetwork = {
      ...mockNetworkStatus,
      connected_devices: -5,
    };
    const result = NetworkStatusSchema.safeParse(invalidNetwork);
    expect(result.success).toBe(false);
  });

  it('accepts optional fields as undefined', () => {
    const minimalSession = {
      id: 'sess_min',
      state: 'discovering',
      target_ssid: 'Test',
      created_at: '2026-01-11T10:00:00Z',
      updated_at: '2026-01-11T10:00:00Z',
      device_count: 0,
      provisioned_count: 0,
      verified_count: 0,
      failed_count: 0,
    };
    const result = BatchProvisioningSessionSchema.safeParse(minimalSession);
    expect(result.success).toBe(true);
  });

  it('accepts allowlist entry without optional fields', () => {
    const minimalEntry = {
      mac: 'AA:BB:CC:DD:EE:FF',
      added_at: '2026-01-11T10:00:00Z',
      used: false,
    };
    const result = DeviceAllowlistEntrySchema.safeParse(minimalEntry);
    expect(result.success).toBe(true);
  });
});
