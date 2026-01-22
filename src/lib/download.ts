/**
 * Base64 Download Utility
 * Feature: 034-esp-camera-integration
 *
 * Converts base64-encoded data to downloadable files.
 */

/**
 * Options for downloading a base64-encoded file.
 */
export interface DownloadBase64Options {
  /** Base64-encoded data (without data URL prefix) */
  base64: string;
  /** MIME type of the file (e.g., 'image/jpeg') */
  mimeType: string;
  /** Filename for the download */
  filename: string;
}

/**
 * Downloads a base64-encoded file.
 *
 * Creates a Blob from the base64 data, generates an object URL,
 * and triggers a download via a temporary anchor element.
 *
 * @param options - Download configuration
 * @throws Error if base64 decoding fails
 *
 * @example
 * ```ts
 * downloadBase64({
 *   base64: captureResult.image,
 *   mimeType: 'image/jpeg',
 *   filename: `camera-capture-${Date.now()}.jpg`,
 * });
 * ```
 */
export function downloadBase64(options: DownloadBase64Options): void {
  const { base64, mimeType, filename } = options;

  // Decode base64 to binary
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create blob and object URL
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);

  // Create temporary anchor and trigger download
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Creates a data URL from base64 data.
 *
 * @param base64 - Base64-encoded data (without prefix)
 * @param mimeType - MIME type of the data
 * @returns Complete data URL string
 *
 * @example
 * ```tsx
 * const src = createDataUrl(captureResult.image, 'image/jpeg');
 * <img src={src} alt="Captured image" />
 * ```
 */
export function createDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Generates a filename for a camera capture.
 *
 * @param cameraId - ID of the camera
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Formatted filename
 *
 * @example
 * ```ts
 * const filename = generateCaptureFilename('camera-01');
 * // => "capture-camera-01-2024-01-15T10-30-45.jpg"
 * ```
 */
export function generateCaptureFilename(cameraId: string, timestamp?: Date): string {
  const date = timestamp ?? new Date();
  // Format: capture-{cameraId}-{ISO timestamp with safe chars}.jpg
  const isoString = date.toISOString().replace(/[:.]/g, '-');
  const safeCameraId = cameraId.replace(/[^a-zA-Z0-9-_]/g, '-');
  return `capture-${safeCameraId}-${isoString}.jpg`;
}
