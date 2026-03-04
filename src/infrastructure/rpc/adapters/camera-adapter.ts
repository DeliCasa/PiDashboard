/**
 * Camera Proto → Domain Adapter
 * Feature: 062-piorch-grpc-client
 *
 * Converts proto Camera/CameraHealth to domain types.
 * Maps CameraStatus enum numbers to lowercase strings.
 * Converts bigint fields (free_heap, uptime_seconds) to numbers.
 */

import type {
  Camera as ProtoCamera,
  CameraHealth as ProtoCameraHealth,
} from '@delicasa/wire/gen/delicasa/device/v1/camera_pb';
import { CameraStatus } from '@delicasa/wire/gen/delicasa/device/v1/camera_pb';
import type { Camera, CameraResolution, CaptureResult } from '@/infrastructure/api/v1-cameras-schemas';
import type { CaptureImageResponse } from '@delicasa/wire/gen/delicasa/device/v1/capture_service_pb';

const CAMERA_STATUS_MAP: Record<number, Camera['status']> = {
  [CameraStatus.ONLINE]: 'online',
  [CameraStatus.OFFLINE]: 'offline',
  [CameraStatus.IDLE]: 'idle',
  [CameraStatus.ERROR]: 'error',
  [CameraStatus.REBOOTING]: 'rebooting',
  [CameraStatus.DISCOVERED]: 'discovered',
  [CameraStatus.PAIRING]: 'pairing',
  [CameraStatus.CONNECTING]: 'connecting',
};

function timestampToIso(ts: { seconds: bigint; nanos: number } | undefined): string {
  if (!ts) return new Date(0).toISOString();
  const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
  return new Date(ms).toISOString();
}

/**
 * Convert proto CameraHealth to domain health object.
 */
function adaptHealth(proto: ProtoCameraHealth | undefined): Camera['health'] {
  if (!proto) return undefined;
  return {
    wifi_rssi: proto.wifiRssi,
    free_heap: Number(proto.freeHeap),
    uptime_seconds: Number(proto.uptimeSeconds),
    firmware_version: proto.firmwareVersion,
    resolution: (proto.resolution || undefined) as CameraResolution | undefined,
    last_capture: timestampToIso(proto.lastCapture),
  };
}

/**
 * Convert proto Camera to domain Camera type.
 * Maps device_id → id, camelCase → snake_case where needed.
 */
export function adaptCamera(proto: ProtoCamera): Camera {
  return {
    id: proto.deviceId,
    name: proto.name || proto.deviceId,
    status: CAMERA_STATUS_MAP[proto.status] ?? 'offline',
    lastSeen: timestampToIso(proto.lastSeen),
    health: adaptHealth(proto.health),
    ip_address: proto.ipAddress || undefined,
    mac_address: proto.macAddress || undefined,
  };
}

/**
 * Convert a list of proto Cameras to domain Cameras.
 */
export function adaptCameraList(protos: ProtoCamera[]): Camera[] {
  return protos.map(adaptCamera);
}

/**
 * Convert Uint8Array to base64 string.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert CaptureImageResponse to domain CaptureResult.
 */
export function adaptCaptureResult(proto: CaptureImageResponse): CaptureResult {
  const image = proto.imageData.length > 0
    ? uint8ArrayToBase64(proto.imageData)
    : undefined;

  return {
    success: true,
    image,
    timestamp: timestampToIso(proto.capturedAt),
    camera_id: proto.cameraId,
    file_size: proto.imageSizeBytes ? Number(proto.imageSizeBytes) : undefined,
  };
}
