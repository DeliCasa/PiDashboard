/**
 * Zod API Validation Schemas
 * Feature: 005-testing-research-and-hardening
 *
 * Runtime schema validation for API responses.
 * Prevents silent API contract drift between frontend and PiOrchestrator.
 *
 * These schemas match the actual PiOrchestrator API response structures.
 */

import { z } from 'zod';

// ============================================================================
// System Info Schemas (matches /api/system/info)
// ============================================================================

/**
 * CPU info schema
 */
export const CpuInfoSchema = z.object({
  usage_percent: z.number().min(0).max(100),
  core_count: z.number().int().positive(),
  per_core: z.array(z.number()).optional(),
});

/**
 * Memory info schema
 */
export const MemoryInfoSchema = z.object({
  used_mb: z.number().nonnegative(),
  total_mb: z.number().positive(),
  used_percent: z.number().min(0).max(100),
  available_mb: z.number().nonnegative(),
});

/**
 * Disk info schema
 */
export const DiskInfoSchema = z.object({
  used_gb: z.number().nonnegative(),
  total_gb: z.number().positive(),
  used_percent: z.number().min(0).max(100),
  path: z.string(),
});

/**
 * Load average schema
 */
export const LoadAverageSchema = z.object({
  load_1: z.number().nonnegative(),
  load_5: z.number().nonnegative(),
  load_15: z.number().nonnegative(),
});

/**
 * System info data schema - the nested data object
 */
export const SystemInfoDataSchema = z.object({
  timestamp: z.string(),
  cpu: CpuInfoSchema,
  memory: MemoryInfoSchema,
  disk: DiskInfoSchema,
  temperature_celsius: z.number(),
  uptime: z.number(), // nanoseconds
  load_average: LoadAverageSchema,
  overall_status: z.string(),
});

/**
 * SystemInfo response schema - validates /api/system/info response
 * NOTE: V1 envelope is unwrapped by proxy, so we get the data directly
 */
export const SystemInfoResponseSchema = SystemInfoDataSchema;

export type RawSystemInfoResponse = z.infer<typeof SystemInfoResponseSchema>;
export type SystemInfoData = z.infer<typeof SystemInfoDataSchema>;

// ============================================================================
// WiFi Schemas (matches /api/wifi/*)
// ============================================================================

/**
 * WiFiNetwork API schema - individual network in scan results
 * Matches WiFiNetworkApiResponse in wifi.ts
 */
export const WifiNetworkApiSchema = z.object({
  ssid: z.string(),
  bssid: z.string().optional(),
  frequency: z.number().optional(),
  signal: z.number(),
  security: z.string(), // "WPA2", "WPA3", "Open", etc.
  channel: z.number().optional(),
  quality: z.number().optional(),
});

export type WifiNetworkApi = z.infer<typeof WifiNetworkApiSchema>;

/**
 * WiFiScan response schema - validates /api/wifi/scan response
 * NOTE: V1 envelope is unwrapped by proxy
 */
export const WifiScanResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  networks: z.array(WifiNetworkApiSchema),
});

export type WifiScanResponse = z.infer<typeof WifiScanResponseSchema>;

/**
 * WiFiStatus response schema - validates /api/wifi/status response
 */
export const WifiStatusResponseSchema = z.object({
  status: z.object({
    connected: z.boolean(),
    ssid: z.string().optional(),
    ip_address: z.string().optional(),
    signal_strength: z.number().optional(),
    mode: z.enum(['client', 'ap', 'disconnected']).optional(),
  }),
});

export type WifiStatusResponse = z.infer<typeof WifiStatusResponseSchema>;

/**
 * WiFiConnect request schema
 */
export const WifiConnectRequestSchema = z.object({
  ssid: z.string().min(1),
  password: z.string().optional(),
});

/**
 * WiFiConnect response schema
 */
export const WifiConnectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// ============================================================================
// Config Schemas (matches /api/dashboard/config)
// ============================================================================

/**
 * Config validation schema (optional nested rules)
 */
export const ConfigValidationSchema = z.object({
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
});

/**
 * Config item schema - individual item in a section
 * Matches ConfigApiResponse.sections[].items[] in config.ts
 */
export const ConfigItemApiSchema = z.object({
  key: z.string(),
  value: z.string(),
  default_value: z.string().optional(),
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  editable: z.boolean().optional(),
  validation: ConfigValidationSchema.optional(),
});

export type ConfigItemApi = z.infer<typeof ConfigItemApiSchema>;

/**
 * ConfigSection API schema - group of config items
 */
export const ConfigSectionApiSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  items: z.array(ConfigItemApiSchema),
});

export type ConfigSectionApi = z.infer<typeof ConfigSectionApiSchema>;

/**
 * ConfigResponse schema - validates /api/dashboard/config response
 * NOTE: V1 envelope is unwrapped by proxy
 */
export const ConfigResponseSchema = z.object({
  sections: z.array(ConfigSectionApiSchema),
});

export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;

/**
 * ConfigUpdate response schema
 */
export const ConfigUpdateResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

/**
 * ConfigReset response schema
 */
export const ConfigResetResponseSchema = z.object({
  success: z.boolean(),
  value: z.string().optional(),
});

// ============================================================================
// Door Schemas (matches /api/door/*)
// ============================================================================

/**
 * DoorState enum schema
 */
export const DoorStateSchema = z.enum(['open', 'closed', 'unknown', 'error']);
export type DoorState = z.infer<typeof DoorStateSchema>;

/**
 * LockState enum schema
 */
export const LockStateSchema = z.enum([
  'locked',
  'unlocked',
  'unknown',
  'error',
]);
export type LockState = z.infer<typeof LockStateSchema>;

/**
 * DoorStatus schema - validates /api/door/status response
 * Matches Door entity type
 */
export const DoorStatusSchema = z.object({
  state: DoorStateSchema,
  lock_state: LockStateSchema.optional(),
  last_command: z.string().optional(),
  last_command_time: z.string().optional(),
  error: z.string().optional(),
});

export type DoorStatus = z.infer<typeof DoorStatusSchema>;

/**
 * DoorOpen request schema
 */
export const DoorOpenRequestSchema = z.object({
  duration: z.number().optional(),
  testing_mode: z.boolean().optional(),
});

/**
 * DoorCommandResponse schema - validates /api/door/open and /api/door/close response
 */
export const DoorCommandResponseSchema = z.object({
  success: z.boolean(),
  state: DoorStateSchema.optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

/**
 * DoorOperation schema - for history entries
 */
export const DoorOperationSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string(),
  command: z.string(),
  result: z.string(),
  duration_ms: z.number().optional(),
});

export type DoorOperation = z.infer<typeof DoorOperationSchema>;

// ============================================================================
// Logs Schemas (matches /api/dashboard/logs)
// ============================================================================

/**
 * LogLevel enum schema
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * LogEntry schema - individual log entry
 * Matches LogEntry entity type
 */
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: LogLevelSchema,
  message: z.string(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

/**
 * LogsResponse schema - validates /api/dashboard/logs response
 */
export const LogsResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  logs: z.array(LogEntrySchema),
});

export type LogsResponse = z.infer<typeof LogsResponseSchema>;

/**
 * DiagnosticReport schema - validates /api/dashboard/diagnostics/export response
 */
export const DiagnosticReportSchema = z.object({
  generated_at: z.string(),
  system: z.record(z.unknown()).optional(),
  logs: z.array(LogEntrySchema).optional(),
  config: z.record(z.unknown()).optional(),
});

// ============================================================================
// Network Schemas
// ============================================================================

/**
 * MQTTStatus schema
 */
export const MqttStatusSchema = z.object({
  connected: z.boolean(),
  broker: z.string().optional(),
  error: z.string().optional(),
});

export type MqttStatus = z.infer<typeof MqttStatusSchema>;

// ============================================================================
// Device/Camera Schemas
// ============================================================================

/**
 * Camera schema
 */
export const CameraSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().optional(),
  status: z.enum(['online', 'offline', 'error']).optional(),
});

export type Camera = z.infer<typeof CameraSchema>;

/**
 * CamerasResponse schema
 */
export const CamerasResponseSchema = z.object({
  cameras: z.array(CameraSchema),
});

// ============================================================================
// Error Response Schema
// ============================================================================

/**
 * Generic API error response
 */
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Safe parse with detailed error reporting
 */
export function safeParseWithErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return { success: false, errors };
}

/**
 * Validate and throw on error (for runtime validation)
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate with fallback (for graceful degradation)
 */
export function validateWithFallback<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T
): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : fallback;
}

// ============================================================================
// V1 API Response Envelope Schemas (Feature 006)
// ============================================================================

/**
 * V1 Error schema - structured error from V1 API
 */
export const V1ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  retry_after_seconds: z.number().optional(),
  details: z.string().optional(),
});

export type V1Error = z.infer<typeof V1ErrorSchema>;

/**
 * Factory for V1 success response schema
 * @param dataSchema - The schema for the data payload
 */
export function createV1SuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    correlation_id: z.string(),
    timestamp: z.string(),
  });
}

/**
 * V1 Error response schema
 */
export const V1ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: V1ErrorSchema,
  correlation_id: z.string(),
  timestamp: z.string(),
});

export type V1ErrorResponse = z.infer<typeof V1ErrorResponseSchema>;

/**
 * Factory for V1 response schema (success | error union)
 * @param dataSchema - The schema for the success data payload
 */
export function createV1ResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion('success', [
    createV1SuccessSchema(dataSchema),
    V1ErrorResponseSchema,
  ]);
}

// ============================================================================
// Batch Provisioning Schemas (Feature 006)
// ============================================================================

/**
 * Session state enum schema
 */
export const SessionStateSchema = z.enum([
  'discovering',
  'active',
  'paused',
  'closing',
  'closed',
]);

export type SessionState = z.infer<typeof SessionStateSchema>;

/**
 * Candidate state enum schema
 */
export const CandidateStateSchema = z.enum([
  'discovered',
  'provisioning',
  'provisioned',
  'verifying',
  'verified',
  'failed',
]);

export type CandidateState = z.infer<typeof CandidateStateSchema>;

/**
 * Session config schema
 */
export const SessionConfigSchema = z.object({
  discovery_timeout_seconds: z.number().optional(),
  provisioning_timeout_seconds: z.number().optional(),
  verification_timeout_seconds: z.number().optional(),
});

export type SessionConfig = z.infer<typeof SessionConfigSchema>;

/**
 * Batch provisioning session schema
 */
export const BatchProvisioningSessionSchema = z.object({
  id: z.string(),
  state: SessionStateSchema,
  target_ssid: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  expires_at: z.string().optional(),
  device_count: z.number().int().nonnegative(),
  provisioned_count: z.number().int().nonnegative(),
  verified_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
  config: SessionConfigSchema.optional(),
});

export type BatchProvisioningSession = z.infer<
  typeof BatchProvisioningSessionSchema
>;

/**
 * MAC address regex for validation
 */
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

/**
 * Provisioning candidate schema
 */
export const ProvisioningCandidateSchema = z.object({
  mac: z.string().regex(MAC_REGEX, 'Invalid MAC address format'),
  ip: z.string(),
  state: CandidateStateSchema,
  rssi: z.number(),
  firmware_version: z.string(),
  discovered_at: z.string(),
  provisioned_at: z.string().optional(),
  verified_at: z.string().optional(),
  error_message: z.string().optional(),
  retry_count: z.number().int().nonnegative(),
  container_id: z.string().optional(),
  in_allowlist: z.boolean(),
});

export type ProvisioningCandidate = z.infer<typeof ProvisioningCandidateSchema>;

/**
 * Device allowlist entry schema
 */
export const DeviceAllowlistEntrySchema = z.object({
  mac: z.string().regex(MAC_REGEX, 'Invalid MAC address format'),
  description: z.string().optional(),
  container_id: z.string().optional(),
  added_at: z.string(),
  used: z.boolean(),
  used_at: z.string().optional(),
});

export type DeviceAllowlistEntry = z.infer<typeof DeviceAllowlistEntrySchema>;

/**
 * Network status schema
 */
export const NetworkStatusSchema = z.object({
  ssid: z.string(),
  is_active: z.boolean(),
  connected_devices: z.number().int().nonnegative(),
});

export type NetworkStatus = z.infer<typeof NetworkStatusSchema>;

// ============================================================================
// Batch Provisioning Request Schemas
// ============================================================================

/**
 * Start session request schema
 */
export const StartSessionRequestSchema = z.object({
  target_ssid: z.string().min(1),
  target_password: z.string().min(1),
  config: SessionConfigSchema.optional(),
});

/**
 * Allowlist entry request schema
 */
export const AllowlistEntryRequestSchema = z.object({
  mac: z.string().regex(MAC_REGEX, 'Invalid MAC address format'),
  description: z.string().optional(),
  container_id: z.string().optional(),
});

// ============================================================================
// Batch Provisioning Response Data Schemas
// ============================================================================

/**
 * Start session response data schema
 */
export const StartSessionDataSchema = z.object({
  session: BatchProvisioningSessionSchema,
  message: z.string(),
});

/**
 * Session data response schema (with optional devices)
 */
export const SessionDataSchema = z.object({
  session: BatchProvisioningSessionSchema,
  devices: z.array(ProvisioningCandidateSchema).optional(),
  timeout_remaining: z.string().optional(),
  network_status: NetworkStatusSchema.optional(),
});

/**
 * Devices data response schema
 */
export const DevicesDataSchema = z.object({
  devices: z.array(ProvisioningCandidateSchema),
});

/**
 * Allowlist data response schema
 */
export const AllowlistDataSchema = z.object({
  entries: z.array(DeviceAllowlistEntrySchema),
});

/**
 * Recoverable sessions data response schema
 */
export const RecoverableSessionsDataSchema = z.object({
  sessions: z.array(BatchProvisioningSessionSchema),
});

/**
 * Device operation data response schema
 */
export const DeviceOperationDataSchema = z.object({
  mac: z.string(),
  state: CandidateStateSchema,
  message: z.string(),
});

/**
 * Provision all data response schema
 */
export const ProvisionAllDataSchema = z.object({
  initiated_count: z.number().int().nonnegative(),
  skipped_count: z.number().int().nonnegative(),
  message: z.string(),
});

/**
 * Stop session data response schema
 */
export const StopSessionDataSchema = z.object({
  session: BatchProvisioningSessionSchema,
  message: z.string(),
});

// ============================================================================
// SSE Event Schemas (Feature 006)
// ============================================================================

/**
 * SSE event type enum schema
 */
export const SSEEventTypeSchema = z.enum([
  'connection.established',
  'connection.heartbeat',
  'session.status',
  'device.state_changed',
  'device.discovered',
  'network.status_changed',
  'error',
]);

/**
 * Factory for SSE event envelope schema
 */
export function createSSEEventEnvelopeSchema<T extends z.ZodTypeAny>(
  payloadSchema: T
) {
  return z.object({
    version: z.literal('1.0'),
    type: SSEEventTypeSchema,
    timestamp: z.string(),
    session_id: z.string().optional(),
    payload: payloadSchema,
  });
}

/**
 * Device state changed payload schema
 */
export const DeviceStateChangedPayloadSchema = z.object({
  mac: z.string(),
  previous_state: CandidateStateSchema,
  new_state: CandidateStateSchema,
  progress: z.number().min(0).max(100).optional(),
  error: z.string().optional(),
});

/**
 * Device discovered payload schema
 */
export const DeviceDiscoveredPayloadSchema = z.object({
  mac: z.string(),
  ip: z.string(),
  rssi: z.number(),
  firmware_version: z.string(),
  in_allowlist: z.boolean(),
});

/**
 * Session status payload schema
 */
export const SessionStatusPayloadSchema = z.object({
  session: BatchProvisioningSessionSchema,
});

/**
 * Network status changed payload schema
 */
export const NetworkStatusChangedPayloadSchema = z.object({
  ssid: z.string(),
  is_active: z.boolean(),
  connected_devices: z.number().int().nonnegative(),
});

/**
 * SSE error payload schema
 */
export const SSEErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});
