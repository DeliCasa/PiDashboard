/**
 * V1 Containers API Zod Schemas
 * Feature: 043-container-management
 *
 * Runtime validation schemas for container management API responses.
 */

import { z } from 'zod';
import { CameraStatusSchema } from './v1-cameras-schemas';

// ============================================================================
// Position Schema
// ============================================================================

export const CameraPositionSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type CameraPosition = z.infer<typeof CameraPositionSchema>;

// ============================================================================
// Container Entity
// ============================================================================

export const ContainerSchema = z.object({
  id: z.string().min(1),
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Container = z.infer<typeof ContainerSchema>;

// ============================================================================
// Camera Assignment
// ============================================================================

export const CameraAssignmentSchema = z.object({
  device_id: z.string().min(1),
  position: CameraPositionSchema,
  assigned_at: z.string(),
  status: CameraStatusSchema.optional(),
  name: z.string().optional(),
});
export type CameraAssignment = z.infer<typeof CameraAssignmentSchema>;

// ============================================================================
// Container Detail (with cameras)
// ============================================================================

export const ContainerDetailSchema = ContainerSchema.extend({
  cameras: z.array(CameraAssignmentSchema),
  camera_count: z.number().min(0).max(4),
  online_count: z.number().min(0).max(4),
});
export type ContainerDetail = z.infer<typeof ContainerDetailSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateContainerRequestSchema = z.object({
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});
export type CreateContainerRequest = z.infer<typeof CreateContainerRequestSchema>;

export const UpdateContainerRequestSchema = z.object({
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateContainerRequest = z.infer<typeof UpdateContainerRequestSchema>;

export const AssignCameraRequestSchema = z.object({
  device_id: z.string().min(1),
  position: CameraPositionSchema,
});
export type AssignCameraRequest = z.infer<typeof AssignCameraRequestSchema>;

// ============================================================================
// Response Envelopes
// ============================================================================

export const ContainerListDataSchema = z.object({
  containers: z.array(ContainerDetailSchema),
  total: z.number().nonnegative(),
});
export type ContainerListData = z.infer<typeof ContainerListDataSchema>;

export const ContainerListResponseSchema = z.object({
  success: z.boolean(),
  data: ContainerListDataSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string().optional(),
});
export type ContainerListResponse = z.infer<typeof ContainerListResponseSchema>;

export const ContainerResponseSchema = z.object({
  success: z.boolean(),
  data: ContainerDetailSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string().optional(),
});
export type ContainerResponse = z.infer<typeof ContainerResponseSchema>;

export const AssignmentResponseSchema = z.object({
  success: z.boolean(),
  data: CameraAssignmentSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string().optional(),
});
export type AssignmentResponse = z.infer<typeof AssignmentResponseSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const ContainerErrorCodeSchema = z.enum([
  'CONTAINER_NOT_FOUND',
  'CONTAINER_HAS_CAMERAS',
  'POSITION_OCCUPIED',
  'CAMERA_ALREADY_ASSIGNED',
  'INVALID_POSITION',
  'VALIDATION_FAILED',
  'INTERNAL_ERROR',
]);
export type ContainerErrorCode = z.infer<typeof ContainerErrorCodeSchema>;
