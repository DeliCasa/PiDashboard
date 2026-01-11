/**
 * BLE Test Utilities (T058)
 *
 * Helper functions for testing BLE provisioning functionality.
 *
 * Feature: 005-testing-research-and-hardening [US4]
 */

import type {
  MockBluetoothConfig,
  MockCharacteristic,
  MockService,
} from './bluetooth';
import {
  installMockBluetooth,
  createCancelledBluetooth,
  WIFI_CHARACTERISTIC_UUID,
  MQTT_CHARACTERISTIC_UUID,
  STATUS_CHARACTERISTIC_UUID,
} from './bluetooth';

/**
 * Decode written WiFi credentials from characteristic
 * Format: SSID\0PASSWORD
 */
export function decodeWifiCredentials(data: Uint8Array): { ssid: string; password?: string } {
  const text = new TextDecoder().decode(data);
  const parts = text.split('\0');
  return {
    ssid: parts[0],
    password: parts[1] || undefined,
  };
}

/**
 * Decode written MQTT config from characteristic
 */
export function decodeMqttConfig(data: Uint8Array): Record<string, unknown> {
  const text = new TextDecoder().decode(data);
  return JSON.parse(text);
}

/**
 * Get the WiFi characteristic from a mock service
 */
export function getWifiCharacteristic(service: MockService): MockCharacteristic {
  const char = service.characteristics.get(WIFI_CHARACTERISTIC_UUID);
  if (!char) {
    throw new Error('WiFi characteristic not found in mock service');
  }
  return char;
}

/**
 * Get the MQTT characteristic from a mock service
 */
export function getMqttCharacteristic(service: MockService): MockCharacteristic {
  const char = service.characteristics.get(MQTT_CHARACTERISTIC_UUID);
  if (!char) {
    throw new Error('MQTT characteristic not found in mock service');
  }
  return char;
}

/**
 * Get the Status characteristic from a mock service
 */
export function getStatusCharacteristic(service: MockService): MockCharacteristic {
  const char = service.characteristics.get(STATUS_CHARACTERISTIC_UUID);
  if (!char) {
    throw new Error('Status characteristic not found in mock service');
  }
  return char;
}

/**
 * Create a standard test device configuration
 */
export const standardDeviceConfig: MockBluetoothConfig = {
  deviceName: 'DeliCasa-ESP32-Test',
  deviceId: 'test-device-001',
  statusResponse: 'OK',
};

/**
 * Create a device that reports CONFIGURED status
 */
export const configuredDeviceConfig: MockBluetoothConfig = {
  ...standardDeviceConfig,
  statusResponse: 'CONFIGURED',
};

/**
 * Create a device with connection failure
 */
export const connectionFailureConfig: MockBluetoothConfig = {
  ...standardDeviceConfig,
  shouldFailConnection: true,
  connectionError: new Error('Failed to connect to device'),
};

/**
 * Create a device with write failure
 */
export const writeFailureConfig: MockBluetoothConfig = {
  ...standardDeviceConfig,
  shouldFailWrite: true,
  writeError: new Error('Characteristic write failed'),
};

/**
 * Create a device with read failure
 */
export const readFailureConfig: MockBluetoothConfig = {
  ...standardDeviceConfig,
  shouldFailRead: true,
  readError: new Error('Characteristic read failed'),
};

/**
 * Create a device with error status
 */
export const errorStatusConfig: MockBluetoothConfig = {
  ...standardDeviceConfig,
  statusResponse: 'ERROR: Invalid configuration',
};

/**
 * Setup mock bluetooth with standard config and return cleanup function
 */
export function setupMockBluetooth(config: MockBluetoothConfig = standardDeviceConfig) {
  return installMockBluetooth(config);
}

/**
 * Setup mock bluetooth that simulates user cancellation
 */
export function setupCancelledBluetooth() {
  const mock = createCancelledBluetooth();
  const originalBluetooth = (navigator as Record<string, unknown>).bluetooth;

  Object.defineProperty(navigator, 'bluetooth', {
    value: mock,
    configurable: true,
    writable: true,
  });

  return {
    bluetooth: mock,
    restore: () => {
      if (originalBluetooth !== undefined) {
        Object.defineProperty(navigator, 'bluetooth', {
          value: originalBluetooth,
          configurable: true,
          writable: true,
        });
      } else {
        delete (navigator as Record<string, unknown>).bluetooth;
      }
    },
  };
}

/**
 * Remove bluetooth from navigator (simulate unsupported browser)
 */
export function removeBluetooth() {
  const originalBluetooth = (navigator as Record<string, unknown>).bluetooth;
  delete (navigator as Record<string, unknown>).bluetooth;

  return {
    restore: () => {
      if (originalBluetooth !== undefined) {
        Object.defineProperty(navigator, 'bluetooth', {
          value: originalBluetooth,
          configurable: true,
          writable: true,
        });
      }
    },
  };
}

/**
 * Standard test MQTT configuration
 */
export const testMqttConfig = {
  broker: 'mqtt://test-broker.local',
  port: 1883,
  username: 'testuser',
  password: 'testpass',
  client_id: 'test-client-001',
  use_tls: false,
};

/**
 * Standard test WiFi configuration
 */
export const testWifiConfig = {
  ssid: 'TestNetwork',
  password: 'testpassword123',
};

/**
 * Open network WiFi configuration (no password)
 */
export const openWifiConfig = {
  ssid: 'OpenNetwork',
};
