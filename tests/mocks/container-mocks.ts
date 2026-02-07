/**
 * Container Mock Data Fixtures
 * Feature: 043-container-identity-ui
 *
 * Typed mock data for container management tests.
 * All mocks validated against Zod schemas in contract tests.
 */

import type {
  Container,
  ContainerDetail,
  CameraAssignment,
  CameraPosition,
} from '@/infrastructure/api/v1-containers-schemas';
import type { CameraStatus } from '@/domain/types/entities';

// ============================================================================
// Timestamps (consistent for reproducible tests)
// ============================================================================

const NOW = '2026-02-04T12:00:00Z';
const HOUR_AGO = '2026-02-04T11:00:00Z';
const DAY_AGO = '2026-02-03T12:00:00Z';

// ============================================================================
// Camera Assignment Mocks
// ============================================================================

export const mockCameraAssignmentOnline: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:01',
  position: 1 as CameraPosition,
  assigned_at: HOUR_AGO,
  status: 'online' as CameraStatus,
  name: 'Front Door Camera',
};

export const mockCameraAssignmentOffline: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:02',
  position: 2 as CameraPosition,
  assigned_at: DAY_AGO,
  status: 'offline' as CameraStatus,
  name: 'Backyard Camera',
};

export const mockCameraAssignmentNoName: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:03',
  position: 3 as CameraPosition,
  assigned_at: HOUR_AGO,
  status: 'online' as CameraStatus,
};

export const mockCameraAssignmentError: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:04',
  position: 4 as CameraPosition,
  assigned_at: HOUR_AGO,
  status: 'error' as CameraStatus,
  name: 'Garage Camera',
};

// ============================================================================
// Container Base Mocks
// ============================================================================

export const mockContainerBase: Container = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  label: 'Kitchen Fridge',
  description: 'Main refrigerator in kitchen',
  created_at: DAY_AGO,
  updated_at: NOW,
};

export const mockContainerNoLabel: Container = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  created_at: DAY_AGO,
  updated_at: NOW,
};

export const mockContainerNoDescription: Container = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  label: 'Garage Unit',
  created_at: DAY_AGO,
  updated_at: NOW,
};

// ============================================================================
// Container Detail Mocks
// ============================================================================

/** Container with label and one online camera */
export const mockContainerDetailWithCamera: ContainerDetail = {
  ...mockContainerBase,
  cameras: [mockCameraAssignmentOnline],
  camera_count: 1,
  online_count: 1,
};

/** Container with label but no cameras (empty) */
export const mockContainerDetailEmpty: ContainerDetail = {
  ...mockContainerBase,
  id: '550e8400-e29b-41d4-a716-446655440003',
  label: 'Living Room',
  cameras: [],
  camera_count: 0,
  online_count: 0,
};

/** Container without label (unnamed) */
export const mockContainerDetailUnlabeled: ContainerDetail = {
  ...mockContainerNoLabel,
  cameras: [mockCameraAssignmentOnline],
  camera_count: 1,
  online_count: 1,
};

/** Container with multiple cameras (mixed status) */
export const mockContainerDetailMixedCameras: ContainerDetail = {
  ...mockContainerBase,
  id: '550e8400-e29b-41d4-a716-446655440004',
  label: 'Main Fridge',
  cameras: [
    mockCameraAssignmentOnline,
    mockCameraAssignmentOffline,
    mockCameraAssignmentError,
  ],
  camera_count: 3,
  online_count: 1,
};

/** Container with all 4 positions filled (full) */
export const mockContainerDetailFull: ContainerDetail = {
  ...mockContainerBase,
  id: '550e8400-e29b-41d4-a716-446655440005',
  label: 'Full Container',
  cameras: [
    mockCameraAssignmentOnline,
    mockCameraAssignmentOffline,
    { ...mockCameraAssignmentNoName, position: 3 as CameraPosition },
    { ...mockCameraAssignmentError, position: 4 as CameraPosition },
  ],
  camera_count: 4,
  online_count: 2,
};

/** Container with all cameras offline */
export const mockContainerDetailAllOffline: ContainerDetail = {
  ...mockContainerBase,
  id: '550e8400-e29b-41d4-a716-446655440006',
  label: 'Offline Container',
  cameras: [
    { ...mockCameraAssignmentOffline, position: 1 as CameraPosition },
    { ...mockCameraAssignmentOffline, device_id: 'AA:BB:CC:DD:EE:05', position: 2 as CameraPosition },
  ],
  camera_count: 2,
  online_count: 0,
};

// ============================================================================
// Container Variants (for schema validation)
// ============================================================================

export const mockContainerVariants = {
  /** Standard container with label and cameras */
  labeled: mockContainerDetailWithCamera,
  /** Container without a label (shows "Unnamed Container") */
  unlabeled: mockContainerDetailUnlabeled,
  /** Empty container (no cameras assigned) */
  empty: mockContainerDetailEmpty,
  /** Container with mixed online/offline cameras */
  mixedStatus: mockContainerDetailMixedCameras,
  /** Container with all 4 positions filled */
  full: mockContainerDetailFull,
  /** Container with all cameras offline */
  allOffline: mockContainerDetailAllOffline,
};

// ============================================================================
// Camera Assignment Variants
// ============================================================================

export const mockAssignmentVariants = {
  online: mockCameraAssignmentOnline,
  offline: mockCameraAssignmentOffline,
  error: mockCameraAssignmentError,
  noName: mockCameraAssignmentNoName,
};

// ============================================================================
// Container List Mock
// ============================================================================

export const mockContainerList: ContainerDetail[] = [
  mockContainerDetailWithCamera,
  mockContainerDetailEmpty,
  mockContainerDetailMixedCameras,
];

// ============================================================================
// API Response Mocks
// ============================================================================

export const mockContainerListResponse = {
  success: true,
  data: {
    containers: mockContainerList,
    total: mockContainerList.length,
  },
  timestamp: NOW,
};

export const mockContainerResponse = (container: ContainerDetail) => ({
  success: true,
  data: container,
  timestamp: NOW,
});

export const mockAssignmentResponse = (assignment: CameraAssignment) => ({
  success: true,
  data: assignment,
  timestamp: NOW,
});

export const mockErrorResponse = (
  code: string,
  message: string,
  retryable = false
) => ({
  success: false,
  error: {
    code,
    message,
    retryable,
  },
  timestamp: NOW,
});

// ============================================================================
// Request Mocks
// ============================================================================

export const mockCreateContainerRequest = {
  label: 'New Container',
  description: 'A newly created container',
};

export const mockCreateContainerRequestNoLabel = {};

export const mockUpdateContainerRequest = {
  label: 'Updated Label',
  description: 'Updated description',
};

export const mockAssignCameraRequest = {
  device_id: 'AA:BB:CC:DD:EE:99',
  position: 2 as CameraPosition,
};
