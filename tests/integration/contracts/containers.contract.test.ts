/**
 * Container API Contract Tests
 * Feature: 043-container-identity-ui (T003)
 *
 * Validates that mock data matches the Zod schemas defined for containers API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  ContainerSchema,
  ContainerDetailSchema,
  CameraAssignmentSchema,
  CameraPositionSchema,
  CreateContainerRequestSchema,
  UpdateContainerRequestSchema,
  AssignCameraRequestSchema,
  ContainerListResponseSchema,
  ContainerResponseSchema,
  AssignmentResponseSchema,
  ContainerErrorCodeSchema,
} from '@/infrastructure/api/v1-containers-schemas';
import {
  mockContainerBase,
  mockContainerNoLabel,
  mockContainerNoDescription,
  mockContainerDetailWithCamera,
  mockContainerDetailEmpty,
  mockContainerDetailUnlabeled,
  mockContainerDetailMixedCameras,
  mockContainerDetailFull,
  mockContainerDetailAllOffline,
  mockContainerVariants,
  mockAssignmentVariants,
  mockContainerList,
  mockContainerListResponse,
  mockContainerResponse,
  mockAssignmentResponse,
  mockErrorResponse,
  mockCreateContainerRequest,
  mockCreateContainerRequestNoLabel,
  mockUpdateContainerRequest,
  mockAssignCameraRequest,
} from '../../mocks/container-mocks';

// ============================================================================
// Camera Position Schema Tests
// ============================================================================

describe('CameraPositionSchema', () => {
  it('validates position 1', () => {
    const result = CameraPositionSchema.safeParse(1);
    expect(result.success).toBe(true);
  });

  it('validates position 2', () => {
    const result = CameraPositionSchema.safeParse(2);
    expect(result.success).toBe(true);
  });

  it('validates position 3', () => {
    const result = CameraPositionSchema.safeParse(3);
    expect(result.success).toBe(true);
  });

  it('validates position 4', () => {
    const result = CameraPositionSchema.safeParse(4);
    expect(result.success).toBe(true);
  });

  it('rejects position 0', () => {
    const result = CameraPositionSchema.safeParse(0);
    expect(result.success).toBe(false);
  });

  it('rejects position 5', () => {
    const result = CameraPositionSchema.safeParse(5);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer positions', () => {
    const result = CameraPositionSchema.safeParse(1.5);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Camera Assignment Schema Tests
// ============================================================================

describe('CameraAssignmentSchema', () => {
  it('validates online camera assignment', () => {
    const result = CameraAssignmentSchema.safeParse(mockAssignmentVariants.online);
    expect(result.success).toBe(true);
  });

  it('validates offline camera assignment', () => {
    const result = CameraAssignmentSchema.safeParse(mockAssignmentVariants.offline);
    expect(result.success).toBe(true);
  });

  it('validates error camera assignment', () => {
    const result = CameraAssignmentSchema.safeParse(mockAssignmentVariants.error);
    expect(result.success).toBe(true);
  });

  it('validates assignment without name', () => {
    const result = CameraAssignmentSchema.safeParse(mockAssignmentVariants.noName);
    expect(result.success).toBe(true);
  });

  it('rejects assignment without device_id', () => {
    const invalid = { ...mockAssignmentVariants.online, device_id: '' };
    const result = CameraAssignmentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects assignment with invalid position', () => {
    const invalid = { ...mockAssignmentVariants.online, position: 5 };
    const result = CameraAssignmentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Container Schema Tests
// ============================================================================

describe('ContainerSchema', () => {
  it('validates container with all fields', () => {
    const result = ContainerSchema.safeParse(mockContainerBase);
    expect(result.success).toBe(true);
  });

  it('validates container without label', () => {
    const result = ContainerSchema.safeParse(mockContainerNoLabel);
    expect(result.success).toBe(true);
  });

  it('validates container without description', () => {
    const result = ContainerSchema.safeParse(mockContainerNoDescription);
    expect(result.success).toBe(true);
  });

  it('accepts non-UUID container IDs (T046)', () => {
    const nonUuidFormats = [
      'kitchen-fridge-001',
      'CONTAINER_ABC_123',
      '42',
      'a'.repeat(50),
    ];

    for (const id of nonUuidFormats) {
      const result = ContainerSchema.safeParse({ ...mockContainerBase, id });
      expect(result.success).toBe(true);
    }
  });

  it('rejects container without id', () => {
    const invalid = { ...mockContainerBase, id: '' };
    const result = ContainerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects container with label exceeding max length', () => {
    const invalid = { ...mockContainerBase, label: 'x'.repeat(101) };
    const result = ContainerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects container with description exceeding max length', () => {
    const invalid = { ...mockContainerBase, description: 'x'.repeat(501) };
    const result = ContainerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Container Detail Schema Tests
// ============================================================================

describe('ContainerDetailSchema', () => {
  it('validates container with single camera', () => {
    const result = ContainerDetailSchema.safeParse(mockContainerDetailWithCamera);
    expect(result.success).toBe(true);
  });

  it('validates empty container', () => {
    const result = ContainerDetailSchema.safeParse(mockContainerDetailEmpty);
    expect(result.success).toBe(true);
  });

  it('validates unlabeled container', () => {
    const result = ContainerDetailSchema.safeParse(mockContainerDetailUnlabeled);
    expect(result.success).toBe(true);
  });

  it('validates container with mixed camera status', () => {
    const result = ContainerDetailSchema.safeParse(mockContainerDetailMixedCameras);
    expect(result.success).toBe(true);
  });

  it('validates full container (4 cameras)', () => {
    const result = ContainerDetailSchema.safeParse(mockContainerDetailFull);
    expect(result.success).toBe(true);
  });

  it('validates container with all cameras offline', () => {
    const result = ContainerDetailSchema.safeParse(mockContainerDetailAllOffline);
    expect(result.success).toBe(true);
  });

  it('validates all mock container variants', () => {
    for (const [name, data] of Object.entries(mockContainerVariants)) {
      const result = ContainerDetailSchema.safeParse(data);
      expect(result.success, `Variant "${name}" failed validation`).toBe(true);
    }
  });

  it('rejects container with camera_count > 4', () => {
    const invalid = { ...mockContainerDetailWithCamera, camera_count: 5 };
    const result = ContainerDetailSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects container with online_count > 4', () => {
    const invalid = { ...mockContainerDetailWithCamera, online_count: 5 };
    const result = ContainerDetailSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects container with negative camera_count', () => {
    const invalid = { ...mockContainerDetailWithCamera, camera_count: -1 };
    const result = ContainerDetailSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Request Schema Tests
// ============================================================================

describe('CreateContainerRequestSchema', () => {
  it('validates request with label and description', () => {
    const result = CreateContainerRequestSchema.safeParse(mockCreateContainerRequest);
    expect(result.success).toBe(true);
  });

  it('validates empty request (no label)', () => {
    const result = CreateContainerRequestSchema.safeParse(mockCreateContainerRequestNoLabel);
    expect(result.success).toBe(true);
  });

  it('validates request with only label', () => {
    const result = CreateContainerRequestSchema.safeParse({ label: 'Test' });
    expect(result.success).toBe(true);
  });

  it('rejects request with label too long', () => {
    const result = CreateContainerRequestSchema.safeParse({ label: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('UpdateContainerRequestSchema', () => {
  it('validates request with label and description', () => {
    const result = UpdateContainerRequestSchema.safeParse(mockUpdateContainerRequest);
    expect(result.success).toBe(true);
  });

  it('validates request with only label', () => {
    const result = UpdateContainerRequestSchema.safeParse({ label: 'New Label' });
    expect(result.success).toBe(true);
  });

  it('validates empty request', () => {
    const result = UpdateContainerRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('AssignCameraRequestSchema', () => {
  it('validates valid assignment request', () => {
    const result = AssignCameraRequestSchema.safeParse(mockAssignCameraRequest);
    expect(result.success).toBe(true);
  });

  it('rejects request without device_id', () => {
    const result = AssignCameraRequestSchema.safeParse({ position: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects request with empty device_id', () => {
    const result = AssignCameraRequestSchema.safeParse({ device_id: '', position: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects request with invalid position', () => {
    const result = AssignCameraRequestSchema.safeParse({ device_id: 'test', position: 5 });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Response Schema Tests
// ============================================================================

describe('ContainerListResponseSchema', () => {
  it('validates successful list response', () => {
    const result = ContainerListResponseSchema.safeParse(mockContainerListResponse);
    expect(result.success).toBe(true);
  });

  it('validates empty list response', () => {
    const emptyResponse = {
      success: true,
      data: { containers: [], total: 0 },
      timestamp: new Date().toISOString(),
    };
    const result = ContainerListResponseSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
  });

  it('validates error response', () => {
    const errorResponse = mockErrorResponse('INTERNAL_ERROR', 'Server error', true);
    const result = ContainerListResponseSchema.safeParse(errorResponse);
    expect(result.success).toBe(true);
  });
});

describe('ContainerResponseSchema', () => {
  it('validates successful container response', () => {
    const response = mockContainerResponse(mockContainerDetailWithCamera);
    const result = ContainerResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('validates error response', () => {
    const errorResponse = mockErrorResponse('CONTAINER_NOT_FOUND', 'Not found');
    const result = ContainerResponseSchema.safeParse(errorResponse);
    expect(result.success).toBe(true);
  });
});

describe('AssignmentResponseSchema', () => {
  it('validates successful assignment response', () => {
    const response = mockAssignmentResponse(mockAssignmentVariants.online);
    const result = AssignmentResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('validates error response', () => {
    const errorResponse = mockErrorResponse('POSITION_OCCUPIED', 'Position taken');
    const result = AssignmentResponseSchema.safeParse(errorResponse);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Error Code Schema Tests
// ============================================================================

describe('ContainerErrorCodeSchema', () => {
  const validCodes = [
    'CONTAINER_NOT_FOUND',
    'CONTAINER_HAS_CAMERAS',
    'POSITION_OCCUPIED',
    'CAMERA_ALREADY_ASSIGNED',
    'INVALID_POSITION',
    'VALIDATION_FAILED',
    'INTERNAL_ERROR',
  ];

  it.each(validCodes)('validates error code: %s', (code) => {
    const result = ContainerErrorCodeSchema.safeParse(code);
    expect(result.success).toBe(true);
  });

  it('rejects unknown error code', () => {
    const result = ContainerErrorCodeSchema.safeParse('UNKNOWN_ERROR');
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Mock Data Consistency Tests
// ============================================================================

describe('Mock Data Consistency', () => {
  it('container list contains valid containers', () => {
    for (const container of mockContainerList) {
      const result = ContainerDetailSchema.safeParse(container);
      expect(result.success, `Container ${container.id} failed validation`).toBe(true);
    }
  });

  it('camera_count matches cameras array length', () => {
    for (const container of mockContainerList) {
      expect(container.camera_count).toBe(container.cameras.length);
    }
  });

  it('online_count is <= camera_count', () => {
    for (const container of mockContainerList) {
      expect(container.online_count).toBeLessThanOrEqual(container.camera_count);
    }
  });

  it('all container IDs are unique', () => {
    const ids = mockContainerList.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all camera device_ids within a container are unique', () => {
    for (const container of mockContainerList) {
      const deviceIds = container.cameras.map((c) => c.device_id);
      const uniqueIds = new Set(deviceIds);
      expect(uniqueIds.size).toBe(deviceIds.length);
    }
  });

  it('all camera positions within a container are unique', () => {
    for (const container of mockContainerList) {
      const positions = container.cameras.map((c) => c.position);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(positions.length);
    }
  });
});
