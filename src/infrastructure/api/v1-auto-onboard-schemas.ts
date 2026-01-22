/**
 * V1 Auto-Onboard API Zod Schemas
 * Feature: 035-auto-onboard-dashboard
 *
 * Runtime validation schemas for ESP-CAM auto-onboard API responses.
 * Based on OpenAPI spec: specs/035-auto-onboard-dashboard/contracts/v1-auto-onboard-api.yaml
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const AutoOnboardModeSchema = z.enum(['off', 'dev']);
export type AutoOnboardMode = z.infer<typeof AutoOnboardModeSchema>;

export const AuditEventStageSchema = z.enum([
  'discovered',
  'verified',
  'registered',
  'paired',
  'failed',
  'rejected_by_policy',
]);
export type AuditEventStage = z.infer<typeof AuditEventStageSchema>;

export const AuditEventOutcomeSchema = z.enum(['success', 'failure']);
export type AuditEventOutcome = z.infer<typeof AuditEventOutcomeSchema>;

// ============================================================================
// Configuration
// ============================================================================

export const AutoOnboardConfigSchema = z.object({
  max_per_minute: z.number().nonnegative(),
  burst_size: z.number().nonnegative(),
  subnet_allowlist: z.array(z.string()),
  verification_timeout_sec: z.number().positive(),
});
export type AutoOnboardConfig = z.infer<typeof AutoOnboardConfigSchema>;

// ============================================================================
// Metrics
// ============================================================================

export const AutoOnboardMetricsSchema = z.object({
  attempts: z.number().nonnegative(),
  success: z.number().nonnegative(),
  failed: z.number().nonnegative(),
  rejected_by_policy: z.number().nonnegative(),
  already_onboarded: z.number().nonnegative(),
  last_success_at: z.string().optional(),
  last_failure_at: z.string().optional(),
});
export type AutoOnboardMetrics = z.infer<typeof AutoOnboardMetricsSchema>;

// ============================================================================
// Status (Main Entity)
// ============================================================================

export const AutoOnboardStatusSchema = z.object({
  enabled: z.boolean(),
  mode: AutoOnboardModeSchema,
  running: z.boolean().optional(),
  config: AutoOnboardConfigSchema,
  metrics: AutoOnboardMetricsSchema.optional(),
});
export type AutoOnboardStatus = z.infer<typeof AutoOnboardStatusSchema>;

// ============================================================================
// Audit Events
// ============================================================================

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
export type OnboardingAuditEntry = z.infer<typeof OnboardingAuditEntrySchema>;

export const PaginationSchema = z.object({
  total: z.number().nonnegative(),
  limit: z.number().positive(),
  offset: z.number().nonnegative(),
  has_more: z.boolean(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const AuditEventsDataSchema = z.object({
  events: z.array(OnboardingAuditEntrySchema),
  pagination: PaginationSchema,
});
export type AuditEventsData = z.infer<typeof AuditEventsDataSchema>;

// ============================================================================
// API Error
// ============================================================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// Response Envelopes
// ============================================================================

export const StatusResponseSchema = z.object({
  success: z.boolean(),
  data: AutoOnboardStatusSchema.optional(),
  error: ApiErrorSchema.optional(),
  timestamp: z.string(),
});
export type StatusResponse = z.infer<typeof StatusResponseSchema>;

export const EnableDisableDataSchema = z.object({
  enabled: z.boolean(),
  running: z.boolean(),
  message: z.string(),
});
export type EnableDisableData = z.infer<typeof EnableDisableDataSchema>;

export const EnableDisableResponseSchema = z.object({
  success: z.boolean(),
  data: EnableDisableDataSchema.optional(),
  error: ApiErrorSchema.optional(),
  timestamp: z.string(),
});
export type EnableDisableResponse = z.infer<typeof EnableDisableResponseSchema>;

export const AuditEventsResponseSchema = z.object({
  success: z.boolean(),
  data: AuditEventsDataSchema.optional(),
  error: ApiErrorSchema.optional(),
  timestamp: z.string(),
});
export type AuditEventsResponse = z.infer<typeof AuditEventsResponseSchema>;

export const ResetMetricsDataSchema = z.object({
  message: z.string(),
});
export type ResetMetricsData = z.infer<typeof ResetMetricsDataSchema>;

export const ResetMetricsResponseSchema = z.object({
  success: z.boolean(),
  data: ResetMetricsDataSchema.optional(),
  error: ApiErrorSchema.optional(),
  timestamp: z.string(),
});
export type ResetMetricsResponse = z.infer<typeof ResetMetricsResponseSchema>;

export const CleanupEventsDataSchema = z.object({
  deleted_count: z.number().nonnegative(),
  message: z.string(),
});
export type CleanupEventsData = z.infer<typeof CleanupEventsDataSchema>;

export const CleanupEventsResponseSchema = z.object({
  success: z.boolean(),
  data: CleanupEventsDataSchema.optional(),
  error: ApiErrorSchema.optional(),
  timestamp: z.string(),
});
export type CleanupEventsResponse = z.infer<typeof CleanupEventsResponseSchema>;

// ============================================================================
// Query/Filter Types (Frontend Only)
// ============================================================================

export interface AuditEventFilters {
  mac?: string;
  stage?: AuditEventStage;
  since?: string;
  limit?: number;
  offset?: number;
}

export interface CleanupOptions {
  days?: number;
}

// ============================================================================
// Error Codes
// ============================================================================

export const AutoOnboardErrorCodeSchema = z.enum([
  'ONBOARD_ENABLE_FAILED',
  'ONBOARD_DISABLE_FAILED',
  'ONBOARD_NOT_AVAILABLE',
  'ONBOARD_RATE_LIMITED',
  'ONBOARD_INTERNAL_ERROR',
]);
export type AutoOnboardErrorCode = z.infer<typeof AutoOnboardErrorCodeSchema>;
