/**
 * Batch Provisioning Entity Type Definitions
 * Pi Dashboard - DeliCasa IoT System
 *
 * Defines entities for the batch device provisioning workflow,
 * including sessions, candidates, and device allowlist.
 */

// ============ State Types ============

/**
 * Batch provisioning session lifecycle states.
 */
export type SessionState =
  | 'discovering' // Scanning for devices on onboarding network
  | 'active' // Ready for provisioning commands
  | 'paused' // Temporarily stopped
  | 'closing' // Cleanup in progress
  | 'closed'; // Session ended

/**
 * Device provisioning workflow states.
 */
export type CandidateState =
  | 'discovered' // Found on onboarding network
  | 'provisioning' // Currently receiving credentials
  | 'provisioned' // Credentials sent successfully
  | 'verifying' // Waiting to appear on target network
  | 'verified' // Successfully online on target network
  | 'failed'; // Provisioning failed

// ============ Configuration ============

/**
 * Optional timeout configuration for batch sessions.
 */
export interface SessionConfig {
  /** Discovery phase timeout (default: 60s) */
  discovery_timeout_seconds?: number;
  /** Per-device provisioning timeout (default: 120s) */
  provisioning_timeout_seconds?: number;
  /** Network verification timeout (default: 90s) */
  verification_timeout_seconds?: number;
}

// ============ Session Entity ============

/**
 * Batch provisioning session representing a multi-device onboarding workflow.
 */
export interface BatchProvisioningSession {
  /** Session ID format: sess_xxxxx */
  id: string;
  /** Current session lifecycle state */
  state: SessionState;
  /** Target WiFi network SSID */
  target_ssid: string;
  /** ISO8601 creation timestamp */
  created_at: string;
  /** ISO8601 last update timestamp */
  updated_at: string;
  /** ISO8601 expiration timestamp (if set) */
  expires_at?: string;
  /** Total discovered devices */
  device_count: number;
  /** Successfully provisioned devices */
  provisioned_count: number;
  /** Verified on target network */
  verified_count: number;
  /** Failed provisioning attempts */
  failed_count: number;
  /** Custom timeout configuration */
  config?: SessionConfig;
}

// ============ Device Candidate ============

/**
 * Device discovered during batch provisioning.
 */
export interface ProvisioningCandidate {
  /** Primary key, format: AA:BB:CC:DD:EE:FF */
  mac: string;
  /** IP address on onboarding network */
  ip: string;
  /** Current provisioning state */
  state: CandidateState;
  /** Signal strength (negative dBm, e.g., -65) */
  rssi: number;
  /** Device firmware version string */
  firmware_version: string;
  /** ISO8601 discovery timestamp */
  discovered_at: string;
  /** ISO8601 provisioning timestamp */
  provisioned_at?: string;
  /** ISO8601 verification timestamp */
  verified_at?: string;
  /** Last error message if failed */
  error_message?: string;
  /** Number of retry attempts */
  retry_count: number;
  /** Assigned container ID */
  container_id?: string;
  /** Whether device is in allowlist */
  in_allowlist: boolean;
}

// ============ Device Allowlist ============

/**
 * Pre-approved device for provisioning.
 */
export interface DeviceAllowlistEntry {
  /** MAC address format: AA:BB:CC:DD:EE:FF */
  mac: string;
  /** Human-readable description/label */
  description?: string;
  /** Pre-assigned container ID */
  container_id?: string;
  /** ISO8601 timestamp when added */
  added_at: string;
  /** Whether device has been provisioned */
  used: boolean;
  /** ISO8601 timestamp when provisioned */
  used_at?: string;
}

// ============ Network Status ============

/**
 * Status of the onboarding network.
 */
export interface NetworkStatus {
  /** Onboarding network SSID (e.g., "DelicasaOnboard") */
  ssid: string;
  /** Whether the network is currently active */
  is_active: boolean;
  /** Number of devices connected to onboarding network */
  connected_devices: number;
}

// ============ API Request Types ============

/**
 * Request to start a new batch provisioning session.
 */
export interface StartSessionRequest {
  /** Target WiFi network SSID */
  target_ssid: string;
  /** Target WiFi network password */
  target_password: string;
  /** Optional timeout configuration */
  config?: SessionConfig;
}

/**
 * Request to add a device to the allowlist.
 */
export interface AllowlistEntryRequest {
  /** MAC address format: AA:BB:CC:DD:EE:FF */
  mac: string;
  /** Human-readable description */
  description?: string;
  /** Pre-assigned container ID */
  container_id?: string;
}

// ============ API Response Data Types ============

/**
 * Response data when starting a session.
 */
export interface StartSessionData {
  session: BatchProvisioningSession;
  message: string;
}

/**
 * Response data for session status/details.
 */
export interface SessionData {
  session: BatchProvisioningSession;
  devices?: ProvisioningCandidate[];
  timeout_remaining?: string;
  network_status?: NetworkStatus;
}

/**
 * Response data for device list.
 */
export interface DevicesData {
  devices: ProvisioningCandidate[];
}

/**
 * Response data for allowlist.
 */
export interface AllowlistData {
  entries: DeviceAllowlistEntry[];
}

/**
 * Response data for recoverable sessions.
 */
export interface RecoverableSessionsData {
  sessions: BatchProvisioningSession[];
}

/**
 * Response data for single device operations.
 */
export interface DeviceOperationData {
  mac: string;
  state: CandidateState;
  message: string;
}

/**
 * Response data for provision all operation.
 */
export interface ProvisionAllData {
  initiated_count: number;
  skipped_count: number;
  message: string;
}

/**
 * Response data for stop session operation.
 */
export interface StopSessionData {
  session: BatchProvisioningSession;
  message: string;
}
