/**
 * Container Domain Types
 * Feature: 043-container-management
 *
 * Types for container management with opaque IDs and human-readable labels.
 * Containers hold up to 4 cameras in fixed positions (1-4).
 */

import type { CameraStatus } from './entities';

/**
 * Valid camera position within a container (1-4)
 */
export type CameraPosition = 1 | 2 | 3 | 4;

/**
 * Base container entity with opaque ID and optional label
 */
export interface Container {
  /** Opaque container ID (UUID or similar) - never assume semantic meaning */
  id: string;
  /** Human-friendly label set by admin (optional) */
  label?: string;
  /** Optional description for documentation */
  description?: string;
  /** ISO timestamp when container was created */
  created_at: string;
  /** ISO timestamp when container was last updated */
  updated_at: string;
}

/**
 * Camera assignment to a container position
 * Includes denormalized camera info for display without additional API calls
 */
export interface CameraAssignment {
  /** Camera device ID (MAC address or similar) */
  device_id: string;
  /** Position within container (1-4) */
  position: CameraPosition;
  /** ISO timestamp when camera was assigned */
  assigned_at: string;
  /** Denormalized camera status for display */
  status?: CameraStatus;
  /** Denormalized camera name for display */
  name?: string;
}

/**
 * Container with full camera assignment details
 * Used for detail views and list displays
 */
export interface ContainerDetail extends Container {
  /** Cameras assigned to this container */
  cameras: CameraAssignment[];
  /** Total number of cameras assigned (0-4) */
  camera_count: number;
  /** Number of cameras currently online */
  online_count: number;
}

/**
 * Request payload for creating a new container
 */
export interface CreateContainerRequest {
  /** Optional human-friendly label (max 100 chars) */
  label?: string;
  /** Optional description (max 500 chars) */
  description?: string;
}

/**
 * Request payload for updating an existing container
 */
export interface UpdateContainerRequest {
  /** New label (max 100 chars) */
  label?: string;
  /** New description (max 500 chars) */
  description?: string;
}

/**
 * Request payload for assigning a camera to a container
 */
export interface AssignCameraRequest {
  /** Camera device ID to assign */
  device_id: string;
  /** Target position (1-4) */
  position: CameraPosition;
}

/**
 * API response wrapper for container list
 */
export interface ContainerListResponse {
  /** Array of container details */
  containers: ContainerDetail[];
  /** Total number of containers */
  total: number;
}
