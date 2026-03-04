/**
 * Cameras RPC API Client
 * Feature: 062-piorch-grpc-client
 *
 * Replaces REST camera/capture fetching with Connect RPC calls.
 * Uses CameraService + CaptureService from PiOrchestrator via @delicasa/wire.
 */

import { cameraClient, captureClient } from '@/infrastructure/rpc/clients';
import { adaptCamera, adaptCameraList, adaptCaptureResult } from '@/infrastructure/rpc/adapters/camera-adapter';
import { isRpcFeatureUnavailable, mapConnectError } from '@/infrastructure/rpc/error-mapper';
import type { Camera, CaptureResult } from './v1-cameras-schemas';

export const camerasRpcApi = {
  /**
   * List all cameras via CameraService/ListCameras.
   */
  list: async (): Promise<Camera[]> => {
    try {
      const response = await cameraClient.listCameras({});
      return adaptCameraList(response.cameras);
    } catch (error) {
      if (isRpcFeatureUnavailable(error)) {
        return [];
      }
      throw mapConnectError(error);
    }
  },

  /**
   * Get single camera via CameraService/GetCamera.
   */
  getById: async (id: string): Promise<Camera> => {
    try {
      const response = await cameraClient.getCamera({ deviceId: id });
      if (!response.camera) {
        throw new Error(`Camera not found: ${id}`);
      }
      return adaptCamera(response.camera);
    } catch (error) {
      throw mapConnectError(error);
    }
  },

  /**
   * Capture image via CaptureService/CaptureImage.
   */
  capture: async (id: string): Promise<CaptureResult> => {
    try {
      const response = await captureClient.captureImage({
        cameraId: id,
      });
      return adaptCaptureResult(response);
    } catch (error) {
      throw mapConnectError(error);
    }
  },

  /**
   * Reconcile cameras via CameraService/ReconcileCameras.
   * Requires API key authentication.
   */
  reconcile: async (): Promise<{ reconciledCount: number; reconciledDeviceIds: string[] }> => {
    try {
      const response = await cameraClient.reconcileCameras({});
      return {
        reconciledCount: response.reconciledCount,
        reconciledDeviceIds: [...response.reconciledDeviceIds],
      };
    } catch (error) {
      throw mapConnectError(error);
    }
  },
};
