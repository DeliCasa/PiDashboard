/**
 * Download Utility Tests
 * Feature: 034-esp-camera-integration (T009)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  downloadBase64,
  createDataUrl,
  generateCaptureFilename,
} from '@/lib/download';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock DOM APIs
const mockAnchorElement = {
  href: '',
  download: '',
  style: { display: '' },
  click: vi.fn(),
};

const mockCreateElement = vi.fn(() => mockAnchorElement);
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/test-blob-url');
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  // Reset mocks
  vi.resetAllMocks();
  mockAnchorElement.href = '';
  mockAnchorElement.download = '';
  mockAnchorElement.style.display = '';

  // Setup global mocks
  vi.stubGlobal('document', {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  });

  vi.stubGlobal('URL', {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============================================================================
// Test Data
// ============================================================================

// Valid base64-encoded 1x1 red pixel PNG
const validBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Valid base64-encoded minimal JPEG
const validJpegBase64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof';

// ============================================================================
// downloadBase64 Tests
// ============================================================================

describe('downloadBase64', () => {
  it('should create a blob from base64 data', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/png',
      filename: 'test.png',
    });

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('should create an anchor element', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/png',
      filename: 'test.png',
    });

    expect(mockCreateElement).toHaveBeenCalledWith('a');
  });

  it('should set the href to the blob URL', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/png',
      filename: 'test.png',
    });

    expect(mockAnchorElement.href).toBe('blob:http://localhost/test-blob-url');
  });

  it('should set the download attribute to the filename', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/jpeg',
      filename: 'capture-2024-01-15.jpg',
    });

    expect(mockAnchorElement.download).toBe('capture-2024-01-15.jpg');
  });

  it('should hide the anchor element', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/png',
      filename: 'test.png',
    });

    expect(mockAnchorElement.style.display).toBe('none');
  });

  it('should append and then remove the anchor', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/png',
      filename: 'test.png',
    });

    expect(mockAppendChild).toHaveBeenCalledWith(mockAnchorElement);
    expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchorElement);
  });

  it('should click the anchor to trigger download', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/png',
      filename: 'test.png',
    });

    expect(mockAnchorElement.click).toHaveBeenCalledTimes(1);
  });

  it('should revoke the object URL after download', () => {
    downloadBase64({
      base64: validBase64,
      mimeType: 'image/png',
      filename: 'test.png',
    });

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob-url');
  });

  it('should throw on invalid base64', () => {
    expect(() =>
      downloadBase64({
        base64: 'not-valid-base64!!!',
        mimeType: 'image/png',
        filename: 'test.png',
      })
    ).toThrow();
  });
});

// ============================================================================
// createDataUrl Tests
// ============================================================================

describe('createDataUrl', () => {
  it('should create a valid data URL for image/jpeg', () => {
    const result = createDataUrl(validJpegBase64, 'image/jpeg');

    expect(result).toBe(`data:image/jpeg;base64,${validJpegBase64}`);
  });

  it('should create a valid data URL for image/png', () => {
    const result = createDataUrl(validBase64, 'image/png');

    expect(result).toBe(`data:image/png;base64,${validBase64}`);
  });

  it('should handle any MIME type', () => {
    const result = createDataUrl('SGVsbG8=', 'text/plain');

    expect(result).toBe('data:text/plain;base64,SGVsbG8=');
  });

  it('should not modify the base64 content', () => {
    const base64 = 'abc123+/=';
    const result = createDataUrl(base64, 'image/jpeg');

    expect(result).toContain(base64);
  });
});

// ============================================================================
// generateCaptureFilename Tests
// ============================================================================

describe('generateCaptureFilename', () => {
  it('should include the camera ID in the filename', () => {
    const result = generateCaptureFilename('camera-01');

    expect(result).toContain('camera-01');
  });

  it('should use "capture" prefix', () => {
    const result = generateCaptureFilename('test');

    expect(result).toMatch(/^capture-/);
  });

  it('should end with .jpg extension', () => {
    const result = generateCaptureFilename('test');

    expect(result).toMatch(/\.jpg$/);
  });

  it('should include timestamp in ISO format', () => {
    const timestamp = new Date('2024-01-15T10:30:45.123Z');
    const result = generateCaptureFilename('test', timestamp);

    // ISO format with colons replaced by dashes
    expect(result).toContain('2024-01-15T10-30-45');
  });

  it('should sanitize camera IDs with special characters', () => {
    const result = generateCaptureFilename('AA:BB:CC:DD:EE:FF');

    // Colons should be replaced
    expect(result).not.toContain(':');
    expect(result).toContain('AA-BB-CC-DD-EE-FF');
  });

  it('should use current time when no timestamp provided', () => {
    const result = generateCaptureFilename('test');

    // Extract year from filename
    const yearMatch = result.match(/(\d{4})/);
    expect(yearMatch).not.toBeNull();
    const year = parseInt(yearMatch![1], 10);
    expect(year).toBe(new Date().getFullYear());
  });

  it('should handle empty camera ID', () => {
    const result = generateCaptureFilename('');

    expect(result).toMatch(/^capture--\d{4}/);
  });

  it('should preserve alphanumeric characters and hyphens/underscores', () => {
    const result = generateCaptureFilename('my_camera-01');

    expect(result).toContain('my_camera-01');
  });
});
