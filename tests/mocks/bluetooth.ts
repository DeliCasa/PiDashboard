/**
 * Web Bluetooth Mock (T057)
 *
 * Mock implementation of the Web Bluetooth API for testing
 * BLE provisioning functionality.
 *
 * Feature: 005-testing-research-and-hardening [US4]
 */

import { vi } from 'vitest';

// DeliCasa ESP32 Service UUIDs (matching provisioning.ts)
export const DELICASA_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
export const WIFI_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef1';
export const MQTT_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef2';
export const STATUS_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef3';

/**
 * Mock characteristic that tracks writes and returns configurable values
 */
export interface MockCharacteristic {
  uuid: string;
  writeValue: ReturnType<typeof vi.fn>;
  readValue: ReturnType<typeof vi.fn>;
  writtenData: Uint8Array[];
}

/**
 * Mock service with characteristics
 */
export interface MockService {
  uuid: string;
  getCharacteristic: ReturnType<typeof vi.fn>;
  characteristics: Map<string, MockCharacteristic>;
}

/**
 * Mock GATT server
 */
export interface MockGATTServer {
  connected: boolean;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  getPrimaryService: ReturnType<typeof vi.fn>;
}

/**
 * Mock Bluetooth device
 */
export interface MockBluetoothDevice {
  id: string;
  name: string;
  gatt: MockGATTServer;
}

/**
 * Mock Bluetooth API
 */
export interface MockBluetooth {
  requestDevice: ReturnType<typeof vi.fn>;
  getAvailability: ReturnType<typeof vi.fn>;
  getDevices: ReturnType<typeof vi.fn>;
}

/**
 * Configuration for creating mock bluetooth environment
 */
export interface MockBluetoothConfig {
  deviceName?: string;
  deviceId?: string;
  statusResponse?: string;
  connectionDelay?: number;
  writeDelay?: number;
  shouldFailConnection?: boolean;
  shouldFailWrite?: boolean;
  shouldFailRead?: boolean;
  connectionError?: Error;
  writeError?: Error;
  readError?: Error;
}

/**
 * Create a mock characteristic
 */
export function createMockCharacteristic(
  uuid: string,
  config: {
    readValue?: Uint8Array;
    shouldFailWrite?: boolean;
    shouldFailRead?: boolean;
    writeError?: Error;
    readError?: Error;
  } = {}
): MockCharacteristic {
  const writtenData: Uint8Array[] = [];

  const writeValue = vi.fn().mockImplementation(async (data: BufferSource) => {
    if (config.shouldFailWrite) {
      throw config.writeError ?? new Error('Write failed');
    }
    writtenData.push(new Uint8Array(data as ArrayBuffer));
    return Promise.resolve();
  });

  const readValue = vi.fn().mockImplementation(async () => {
    if (config.shouldFailRead) {
      throw config.readError ?? new Error('Read failed');
    }
    return config.readValue ?? new TextEncoder().encode('OK');
  });

  return {
    uuid,
    writeValue,
    readValue,
    writtenData,
  };
}

/**
 * Create a mock service with default characteristics
 */
export function createMockService(config: MockBluetoothConfig = {}): MockService {
  const characteristics = new Map<string, MockCharacteristic>();

  // WiFi characteristic
  characteristics.set(
    WIFI_CHARACTERISTIC_UUID,
    createMockCharacteristic(WIFI_CHARACTERISTIC_UUID, {
      shouldFailWrite: config.shouldFailWrite,
      writeError: config.writeError,
    })
  );

  // MQTT characteristic
  characteristics.set(
    MQTT_CHARACTERISTIC_UUID,
    createMockCharacteristic(MQTT_CHARACTERISTIC_UUID, {
      shouldFailWrite: config.shouldFailWrite,
      writeError: config.writeError,
    })
  );

  // Status characteristic
  characteristics.set(
    STATUS_CHARACTERISTIC_UUID,
    createMockCharacteristic(STATUS_CHARACTERISTIC_UUID, {
      readValue: new TextEncoder().encode(config.statusResponse ?? 'OK'),
      shouldFailRead: config.shouldFailRead,
      readError: config.readError,
    })
  );

  const getCharacteristic = vi.fn().mockImplementation(async (uuid: string) => {
    const characteristic = characteristics.get(uuid);
    if (!characteristic) {
      throw new Error(`Characteristic ${uuid} not found`);
    }
    return characteristic;
  });

  return {
    uuid: DELICASA_SERVICE_UUID,
    getCharacteristic,
    characteristics,
  };
}

/**
 * Create a mock GATT server
 */
export function createMockGATTServer(config: MockBluetoothConfig = {}): MockGATTServer {
  let connected = false;
  const service = createMockService(config);

  const connect = vi.fn().mockImplementation(async () => {
    if (config.connectionDelay) {
      await new Promise((r) => setTimeout(r, config.connectionDelay));
    }
    if (config.shouldFailConnection) {
      throw config.connectionError ?? new Error('Connection failed');
    }
    connected = true;
    return { getPrimaryService };
  });

  const disconnect = vi.fn().mockImplementation(() => {
    connected = false;
  });

  const getPrimaryService = vi.fn().mockImplementation(async (uuid: string) => {
    if (uuid !== DELICASA_SERVICE_UUID) {
      throw new Error(`Service ${uuid} not found`);
    }
    return service;
  });

  return {
    get connected() {
      return connected;
    },
    connect,
    disconnect,
    getPrimaryService,
  };
}

/**
 * Create a mock Bluetooth device
 */
export function createMockDevice(config: MockBluetoothConfig = {}): MockBluetoothDevice {
  return {
    id: config.deviceId ?? 'mock-device-001',
    name: config.deviceName ?? 'DeliCasa-ESP32-001',
    gatt: createMockGATTServer(config),
  };
}

/**
 * Create a full mock Bluetooth API
 */
export function createMockBluetooth(config: MockBluetoothConfig = {}): MockBluetooth {
  const device = createMockDevice(config);

  return {
    requestDevice: vi.fn().mockResolvedValue(device),
    getAvailability: vi.fn().mockResolvedValue(true),
    getDevices: vi.fn().mockResolvedValue([device]),
  };
}

/**
 * Install mock bluetooth on navigator
 */
export function installMockBluetooth(config: MockBluetoothConfig = {}): {
  bluetooth: MockBluetooth;
  restore: () => void;
} {
  const originalBluetooth = (navigator as Record<string, unknown>).bluetooth;
  const mockBluetooth = createMockBluetooth(config);

  Object.defineProperty(navigator, 'bluetooth', {
    value: mockBluetooth,
    configurable: true,
    writable: true,
  });

  return {
    bluetooth: mockBluetooth,
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
 * Create a mock bluetooth that fails device request (user cancelled)
 */
export function createCancelledBluetooth(): MockBluetooth {
  return {
    requestDevice: vi.fn().mockRejectedValue(
      new Error('User cancelled the requestDevice() chooser.')
    ),
    getAvailability: vi.fn().mockResolvedValue(true),
    getDevices: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Create a mock bluetooth for an unsupported browser
 */
export function createUnsupportedBluetooth(): undefined {
  return undefined;
}
