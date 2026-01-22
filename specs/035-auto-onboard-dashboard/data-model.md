# Data Model: Auto-Onboard ESP-CAM Dashboard Integration

**Feature**: 035-auto-onboard-dashboard
**Date**: 2026-01-22
**Location**: `src/infrastructure/api/v1-auto-onboard-schemas.ts`

## Entity Relationship Overview

```
AutoOnboardStatus (1)
├── AutoOnboardConfig (1) - embedded
└── AutoOnboardMetrics (1) - optional, embedded

OnboardingAuditEntry (*)
├── Stage enum
└── Outcome enum

AuditEventsResponse
├── OnboardingAuditEntry[] - events
└── Pagination - pagination info
```

## Core Entities

### AutoOnboardMode

Represents the operational mode of auto-onboard.

```typescript
/**
 * Auto-onboard mode from PiOrchestrator configuration.
 * - "off": Feature disabled at config level
 * - "dev": DEV MODE ONLY - automatic onboarding enabled
 */
export type AutoOnboardMode = "off" | "dev";

export const AutoOnboardModeSchema = z.enum(["off", "dev"]);
```

### AutoOnboardConfig

Configuration settings for auto-onboard (read-only from dashboard).

```typescript
/**
 * Auto-onboard configuration from PiOrchestrator.
 * Dashboard displays this but cannot modify it.
 */
export interface AutoOnboardConfig {
  /** Maximum onboarding attempts per minute */
  max_per_minute: number;
  /** Burst size for rate limiting */
  burst_size: number;
  /** Allowed subnets for auto-onboard (e.g., ["192.168.10.0/24"]) */
  subnet_allowlist: string[];
  /** Timeout in seconds for device verification */
  verification_timeout_sec: number;
}

export const AutoOnboardConfigSchema = z.object({
  max_per_minute: z.number().nonnegative(),
  burst_size: z.number().nonnegative(),
  subnet_allowlist: z.array(z.string()),
  verification_timeout_sec: z.number().positive(),
});
```

### AutoOnboardMetrics

Success/failure counters and timestamps.

```typescript
/**
 * Auto-onboard metrics tracking success/failure rates.
 * Displayed in the dashboard metrics panel.
 */
export interface AutoOnboardMetrics {
  /** Total onboarding attempts */
  attempts: number;
  /** Successful onboards */
  success: number;
  /** Failed onboards */
  failed: number;
  /** Rejected by rate limit or policy */
  rejected_by_policy: number;
  /** Already onboarded (duplicate) */
  already_onboarded: number;
  /** ISO 8601 timestamp of last successful onboard */
  last_success_at?: string;
  /** ISO 8601 timestamp of last failed onboard */
  last_failure_at?: string;
}

export const AutoOnboardMetricsSchema = z.object({
  attempts: z.number().nonnegative(),
  success: z.number().nonnegative(),
  failed: z.number().nonnegative(),
  rejected_by_policy: z.number().nonnegative(),
  already_onboarded: z.number().nonnegative(),
  last_success_at: z.string().optional(),
  last_failure_at: z.string().optional(),
});
```

### AutoOnboardStatus

Main status entity returned by GET /status endpoint.

```typescript
/**
 * Complete auto-onboard status including config and metrics.
 * Primary entity for status polling.
 */
export interface AutoOnboardStatus {
  /** Whether auto-onboard is currently enabled */
  enabled: boolean;
  /** Operating mode ("off" or "dev") */
  mode: AutoOnboardMode;
  /** Whether the worker is actively listening for devices */
  running?: boolean;
  /** Configuration settings */
  config: AutoOnboardConfig;
  /** Metrics counters (may be absent if never run) */
  metrics?: AutoOnboardMetrics;
}

export const AutoOnboardStatusSchema = z.object({
  enabled: z.boolean(),
  mode: AutoOnboardModeSchema,
  running: z.boolean().optional(),
  config: AutoOnboardConfigSchema,
  metrics: AutoOnboardMetricsSchema.optional(),
});
```

### AuditEventStage

Enum representing stages in the onboarding process.

```typescript
/**
 * Stages in the auto-onboard process.
 * Represents the lifecycle of a device discovery.
 */
export type AuditEventStage =
  | "discovered"      // Device seen on network
  | "verified"        // HTTP status check passed
  | "registered"      // Device registered in database
  | "paired"          // Device paired to container
  | "failed"          // Process failed
  | "rejected_by_policy"; // Rate limit or policy violation

export const AuditEventStageSchema = z.enum([
  "discovered",
  "verified",
  "registered",
  "paired",
  "failed",
  "rejected_by_policy",
]);
```

### AuditEventOutcome

Enum for success/failure outcome.

```typescript
/**
 * Outcome of an onboarding attempt.
 */
export type AuditEventOutcome = "success" | "failure";

export const AuditEventOutcomeSchema = z.enum(["success", "failure"]);
```

### OnboardingAuditEntry

Individual audit log entry for device onboarding.

```typescript
/**
 * Audit log entry for a single onboarding event.
 * Used for debugging and monitoring.
 */
export interface OnboardingAuditEntry {
  /** Unique event ID */
  id: number;
  /** Device MAC address */
  mac_address: string;
  /** Current stage in onboarding process */
  stage: AuditEventStage;
  /** Success or failure */
  outcome: AuditEventOutcome;
  /** Error code if failed */
  error_code?: string;
  /** Error message if failed */
  error_message?: string;
  /** Device ID assigned after registration */
  device_id?: string;
  /** Device IP address */
  ip_address?: string;
  /** Firmware version from device */
  firmware_version?: string;
  /** Target container ID */
  container_id?: string;
  /** Duration of this stage in milliseconds */
  duration_ms?: number;
  /** ISO 8601 timestamp */
  timestamp: string;
}

export const OnboardingAuditEntrySchema = z.object({
  id: z.number(),
  mac_address: z.string(),
  stage: AuditEventStageSchema,
  outcome: AuditEventOutcomeSchema,
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  device_id: z.string().optional(),
  ip_address: z.string().optional(),
  firmware_version: z.string().optional(),
  container_id: z.string().optional(),
  duration_ms: z.number().optional(),
  timestamp: z.string(),
});
```

## Response Envelopes

### ApiResponse (Generic Wrapper)

All API responses follow the standard PiOrchestrator envelope.

```typescript
/**
 * Standard API response envelope.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  timestamp: string;
}
```

### AutoOnboardStatusResponse

```typescript
export type AutoOnboardStatusResponse = ApiResponse<AutoOnboardStatus>;

export const AutoOnboardStatusResponseSchema = z.object({
  success: z.boolean(),
  data: AutoOnboardStatusSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string(),
});
```

### EnableDisableResponse

```typescript
export interface EnableDisableData {
  enabled: boolean;
  running: boolean;
  message: string;
}

export type EnableDisableResponse = ApiResponse<EnableDisableData>;

export const EnableDisableResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    enabled: z.boolean(),
    running: z.boolean(),
    message: z.string(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string(),
});
```

### AuditEventsResponse

```typescript
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface AuditEventsData {
  events: OnboardingAuditEntry[];
  pagination: PaginationInfo;
}

export type AuditEventsResponse = ApiResponse<AuditEventsData>;

export const PaginationSchema = z.object({
  total: z.number().nonnegative(),
  limit: z.number().positive(),
  offset: z.number().nonnegative(),
  has_more: z.boolean(),
});

export const AuditEventsDataSchema = z.object({
  events: z.array(OnboardingAuditEntrySchema),
  pagination: PaginationSchema,
});

export const AuditEventsResponseSchema = z.object({
  success: z.boolean(),
  data: AuditEventsDataSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string(),
});
```

### ResetMetricsResponse

```typescript
export interface ResetMetricsData {
  message: string;
}

export type ResetMetricsResponse = ApiResponse<ResetMetricsData>;
```

### CleanupEventsResponse

```typescript
export interface CleanupEventsData {
  deleted_count: number;
  message: string;
}

export type CleanupEventsResponse = ApiResponse<CleanupEventsData>;
```

## Error Codes

New error codes for auto-onboard operations:

```typescript
/**
 * Auto-onboard specific error codes.
 */
export type AutoOnboardErrorCode =
  | "ONBOARD_ENABLE_FAILED"    // Cannot enable (mode not "dev")
  | "ONBOARD_DISABLE_FAILED"   // Cannot disable
  | "ONBOARD_NOT_AVAILABLE"    // Feature not configured
  | "ONBOARD_RATE_LIMITED"     // Too many requests
  | "ONBOARD_INTERNAL_ERROR";  // Server error

export const AutoOnboardErrorCodeSchema = z.enum([
  "ONBOARD_ENABLE_FAILED",
  "ONBOARD_DISABLE_FAILED",
  "ONBOARD_NOT_AVAILABLE",
  "ONBOARD_RATE_LIMITED",
  "ONBOARD_INTERNAL_ERROR",
]);
```

## Query/Filter Types (Frontend Only)

```typescript
/**
 * Filters for audit events query.
 */
export interface AuditEventFilters {
  /** Filter by MAC address */
  mac?: string;
  /** Filter by stage */
  stage?: AuditEventStage;
  /** Filter events since this ISO timestamp */
  since?: string;
  /** Page size (default: 50, max: 100) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/**
 * Options for cleanup operation.
 */
export interface CleanupOptions {
  /** Retention period in days (default: 90, range: 1-365) */
  days?: number;
}
```

## UI State Types (Frontend Only)

```typescript
/**
 * Derived state for UI display.
 */
export interface AutoOnboardUIState {
  /** Whether the feature is available at all */
  isAvailable: boolean;
  /** Whether toggle is currently enabled */
  isEnabled: boolean;
  /** Whether worker is actively running */
  isRunning: boolean;
  /** Whether a toggle operation is in progress */
  isToggling: boolean;
  /** User-friendly status message */
  statusMessage: string;
}
```

## File Structure

```
src/infrastructure/api/
├── v1-auto-onboard-schemas.ts  # Zod schemas + type exports
└── v1-auto-onboard.ts          # API client

src/application/hooks/
└── useAutoOnboard.ts           # React Query hooks

src/domain/types/
└── entities.ts                 # Update with AutoOnboard types (if needed)
```

## Constitution Compliance

| Principle | Compliance |
|-----------|------------|
| Hexagonal Architecture | Types in domain/, schemas in infrastructure/ |
| Contract-First API | All responses validated through Zod schemas |
| Test Discipline | Schemas testable in isolation |
| Simplicity | No unnecessary abstractions, reuse existing patterns |
