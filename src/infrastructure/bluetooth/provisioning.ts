/**
 * Web Bluetooth Provisioning Service
 * Direct BLE provisioning via Web Bluetooth API
 */

/// <reference types="@anthropic-ai/sdk" />
// Note: Web Bluetooth types are experimental. Using any for browser compatibility.
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { MQTTConfig } from '@/domain/types/entities';

// DeliCasa ESP32 Service UUIDs
const DELICASA_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const WIFI_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef1';
const MQTT_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef2';
const STATUS_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef3';

/**
 * Provisioning step for progress tracking
 */
export type ProvisioningStep = 'idle' | 'scanning' | 'connecting' | 'writing' | 'verifying' | 'done' | 'error';

/**
 * Provisioning result
 */
export interface ProvisioningResult {
  success: boolean;
  deviceName?: string;
  error?: string;
}

/**
 * Check if Web Bluetooth is supported in current browser
 */
export function isWebBluetoothSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as any;
  return 'bluetooth' in nav &&
         typeof nav.bluetooth?.requestDevice === 'function';
}

/**
 * Encode string to Uint8Array for BLE write
 */
function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Encode WiFi credentials for BLE characteristic
 * Format: SSID\0PASSWORD
 */
function encodeWifiCredentials(ssid: string, password?: string): Uint8Array {
  const data = password ? `${ssid}\0${password}` : ssid;
  return encodeString(data);
}

/**
 * Encode MQTT config for BLE characteristic
 * Format: JSON string
 */
function encodeMqttConfig(config: MQTTConfig): Uint8Array {
  const json = JSON.stringify({
    broker: config.broker,
    port: config.port,
    username: config.username || '',
    password: config.password || '',
    client_id: config.client_id || '',
    use_tls: config.use_tls || false,
  });
  return encodeString(json);
}

/**
 * Web Bluetooth provisioning class
 */
export class BluetoothProvisioner {
  private device: any = null;
  private server: any = null;
  private service: any = null;

  /**
   * Request and connect to a DeliCasa ESP32 device
   */
  async connect(): Promise<string> {
    if (!isWebBluetoothSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    try {
      // Request device with DeliCasa service filter
      const nav = navigator as any;
      this.device = await nav.bluetooth.requestDevice({
        filters: [
          { services: [DELICASA_SERVICE_UUID] },
          { namePrefix: 'DeliCasa' },
        ],
        optionalServices: [DELICASA_SERVICE_UUID],
      });

      if (!this.device.gatt) {
        throw new Error('Device does not support GATT');
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Get DeliCasa service
      this.service = await this.server.getPrimaryService(DELICASA_SERVICE_UUID);

      return this.device.name || this.device.id;
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  /**
   * Write WiFi credentials to device
   */
  async writeWifiCredentials(ssid: string, password?: string): Promise<void> {
    if (!this.service) {
      throw new Error('Not connected to device');
    }

    const characteristic = await this.service.getCharacteristic(WIFI_CHARACTERISTIC_UUID);
    const data = encodeWifiCredentials(ssid, password);
    await characteristic.writeValue(data);
  }

  /**
   * Write MQTT configuration to device
   */
  async writeMqttConfig(config: MQTTConfig): Promise<void> {
    if (!this.service) {
      throw new Error('Not connected to device');
    }

    const characteristic = await this.service.getCharacteristic(MQTT_CHARACTERISTIC_UUID);
    const data = encodeMqttConfig(config);
    await characteristic.writeValue(data);
  }

  /**
   * Read provisioning status from device
   */
  async readStatus(): Promise<string> {
    if (!this.service) {
      throw new Error('Not connected to device');
    }

    const characteristic = await this.service.getCharacteristic(STATUS_CHARACTERISTIC_UUID);
    const value = await characteristic.readValue();
    return new TextDecoder().decode(value);
  }

  /**
   * Disconnect from device
   */
  disconnect(): void {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.service = null;
  }

  /**
   * Full provisioning flow
   */
  async provision(
    mqttConfig: MQTTConfig,
    wifiConfig?: { ssid: string; password?: string },
    onProgress?: (step: ProvisioningStep) => void
  ): Promise<ProvisioningResult> {
    const reportProgress = (step: ProvisioningStep) => {
      onProgress?.(step);
    };

    try {
      // Connect
      reportProgress('connecting');
      const deviceName = await this.connect();

      // Write MQTT config
      reportProgress('writing');
      await this.writeMqttConfig(mqttConfig);

      // Write WiFi if provided
      if (wifiConfig) {
        await this.writeWifiCredentials(wifiConfig.ssid, wifiConfig.password);
      }

      // Verify
      reportProgress('verifying');
      const status = await this.readStatus();
      const success = status === 'OK' || status === 'CONFIGURED';

      reportProgress('done');
      return {
        success,
        deviceName,
        error: success ? undefined : `Device returned status: ${status}`,
      };
    } catch (error) {
      reportProgress('error');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.disconnect();
    }
  }
}

/**
 * Singleton provisioner instance
 */
let provisionerInstance: BluetoothProvisioner | null = null;

export function getProvisioner(): BluetoothProvisioner {
  if (!provisionerInstance) {
    provisionerInstance = new BluetoothProvisioner();
  }
  return provisionerInstance;
}
