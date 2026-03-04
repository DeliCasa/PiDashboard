/**
 * Connect RPC Service Clients
 * Feature: 062-piorch-grpc-client
 *
 * Exports typed clients for all 4 PiOrchestrator device services.
 * Each client is bound to the shared transport from transport.ts.
 */

import { createClient } from '@connectrpc/connect';
import { CameraService } from '@delicasa/wire/gen/delicasa/device/v1/camera_service_pb';
import { CaptureService } from '@delicasa/wire/gen/delicasa/device/v1/capture_service_pb';
import { SessionService } from '@delicasa/wire/gen/delicasa/device/v1/session_service_pb';
import { EvidenceService } from '@delicasa/wire/gen/delicasa/device/v1/evidence_service_pb';
import { transport } from './transport';

export const cameraClient = createClient(CameraService, transport);
export const captureClient = createClient(CaptureService, transport);
export const sessionClient = createClient(SessionService, transport);
export const evidenceClient = createClient(EvidenceService, transport);
