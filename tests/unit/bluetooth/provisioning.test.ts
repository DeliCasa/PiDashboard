/**
 * BLE Provisioning Tests (T060-T064)
 *
 * Tests for BluetoothProvisioner class including:
 * - T060: Connection tests
 * - T061: WiFi credential write tests
 * - T062: MQTT config write tests
 * - T063: Status read tests
 * - T064: Error scenario tests
 *
 * Feature: 005-testing-research-and-hardening [US4]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupMockBluetooth,
  setupCancelledBluetooth,
  removeBluetooth,
  decodeWifiCredentials,
  decodeMqttConfig,
  standardDeviceConfig,
  connectionFailureConfig,
  writeFailureConfig,
  readFailureConfig,
  errorStatusConfig,
  configuredDeviceConfig,
  testMqttConfig,
  testWifiConfig,
  openWifiConfig,
} from '../../mocks/bluetooth-utils';
import {
  WIFI_CHARACTERISTIC_UUID,
  MQTT_CHARACTERISTIC_UUID,
} from '../../mocks/bluetooth';

describe('BluetoothProvisioner', () => {
  let restoreFn: (() => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreFn?.();
    restoreFn = undefined;
  });

  /**
   * T060 [US4] Connection Tests
   */
  describe('Connection (T060)', () => {
    it('should connect to a device successfully', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      const deviceName = await provisioner.connect();

      expect(deviceName).toBe(standardDeviceConfig.deviceName);
    });

    it('should throw error when Web Bluetooth is not supported', async () => {
      const { restore } = removeBluetooth();
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      await expect(provisioner.connect()).rejects.toThrow(
        'Web Bluetooth is not supported in this browser'
      );
    });

    it('should handle user cancellation', async () => {
      const { restore } = setupCancelledBluetooth();
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      await expect(provisioner.connect()).rejects.toThrow(
        'User cancelled the requestDevice() chooser.'
      );
    });

    it('should handle GATT connection failure', async () => {
      const { restore } = setupMockBluetooth(connectionFailureConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      await expect(provisioner.connect()).rejects.toThrow(
        'Failed to connect to device'
      );
    });

    it('should disconnect on connection error', async () => {
      const { bluetooth, restore } = setupMockBluetooth(connectionFailureConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      try {
        await provisioner.connect();
      } catch {
        // Expected to fail
      }

      // Verify disconnect was called on the device's GATT server
      const device = await bluetooth.requestDevice({});
      expect(device.gatt.connected).toBe(false);
    });
  });

  /**
   * T061 [US4] WiFi Credential Write Tests
   */
  describe('WiFi Credentials Write (T061)', () => {
    it('should write WiFi credentials with password', async () => {
      const { bluetooth, restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();
      await provisioner.writeWifiCredentials(testWifiConfig.ssid, testWifiConfig.password);

      // Verify the write was called
      const device = await bluetooth.requestDevice({});
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('12345678-1234-5678-1234-56789abcdef0');
      const characteristic = await service.getCharacteristic(WIFI_CHARACTERISTIC_UUID);

      expect(characteristic.writeValue).toHaveBeenCalled();

      // Verify the data format
      const writtenData = characteristic.writtenData[0];
      const decoded = decodeWifiCredentials(writtenData);
      expect(decoded.ssid).toBe(testWifiConfig.ssid);
      expect(decoded.password).toBe(testWifiConfig.password);
    });

    it('should write WiFi credentials without password for open networks', async () => {
      const { bluetooth, restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();
      await provisioner.writeWifiCredentials(openWifiConfig.ssid);

      const device = await bluetooth.requestDevice({});
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('12345678-1234-5678-1234-56789abcdef0');
      const characteristic = await service.getCharacteristic(WIFI_CHARACTERISTIC_UUID);

      const writtenData = characteristic.writtenData[0];
      const decoded = decodeWifiCredentials(writtenData);
      expect(decoded.ssid).toBe(openWifiConfig.ssid);
      expect(decoded.password).toBeUndefined();
    });

    it('should throw error when not connected', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      // Not calling connect()

      await expect(
        provisioner.writeWifiCredentials(testWifiConfig.ssid, testWifiConfig.password)
      ).rejects.toThrow('Not connected to device');
    });
  });

  /**
   * T062 [US4] MQTT Config Write Tests
   */
  describe('MQTT Config Write (T062)', () => {
    it('should write MQTT configuration', async () => {
      const { bluetooth, restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();
      await provisioner.writeMqttConfig(testMqttConfig);

      const device = await bluetooth.requestDevice({});
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('12345678-1234-5678-1234-56789abcdef0');
      const characteristic = await service.getCharacteristic(MQTT_CHARACTERISTIC_UUID);

      expect(characteristic.writeValue).toHaveBeenCalled();

      const writtenData = characteristic.writtenData[0];
      const decoded = decodeMqttConfig(writtenData);
      expect(decoded.broker).toBe(testMqttConfig.broker);
      expect(decoded.port).toBe(testMqttConfig.port);
      expect(decoded.username).toBe(testMqttConfig.username);
      expect(decoded.password).toBe(testMqttConfig.password);
    });

    it('should handle optional MQTT fields', async () => {
      const { bluetooth, restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();

      // Minimal MQTT config
      const minimalConfig = {
        broker: 'mqtt://minimal.local',
        port: 1883,
      };
      await provisioner.writeMqttConfig(minimalConfig);

      const device = await bluetooth.requestDevice({});
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('12345678-1234-5678-1234-56789abcdef0');
      const characteristic = await service.getCharacteristic(MQTT_CHARACTERISTIC_UUID);

      const writtenData = characteristic.writtenData[0];
      const decoded = decodeMqttConfig(writtenData);
      expect(decoded.broker).toBe(minimalConfig.broker);
      expect(decoded.username).toBe(''); // Default empty string
      expect(decoded.password).toBe(''); // Default empty string
      expect(decoded.use_tls).toBe(false); // Default false
    });

    it('should throw error when not connected', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      await expect(provisioner.writeMqttConfig(testMqttConfig)).rejects.toThrow(
        'Not connected to device'
      );
    });
  });

  /**
   * T063 [US4] Status Read Tests
   */
  describe('Status Read (T063)', () => {
    it('should read OK status from device', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();
      const status = await provisioner.readStatus();

      expect(status).toBe('OK');
    });

    it('should read CONFIGURED status from device', async () => {
      const { restore } = setupMockBluetooth(configuredDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();
      const status = await provisioner.readStatus();

      expect(status).toBe('CONFIGURED');
    });

    it('should read error status from device', async () => {
      const { restore } = setupMockBluetooth(errorStatusConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();
      const status = await provisioner.readStatus();

      expect(status).toBe('ERROR: Invalid configuration');
    });

    it('should throw error when not connected', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      await expect(provisioner.readStatus()).rejects.toThrow(
        'Not connected to device'
      );
    });
  });

  /**
   * T064 [US4] Error Scenario Tests
   */
  describe('Error Scenarios (T064)', () => {
    it('should handle write failure gracefully', async () => {
      const { restore } = setupMockBluetooth(writeFailureConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();

      await expect(provisioner.writeMqttConfig(testMqttConfig)).rejects.toThrow(
        'Characteristic write failed'
      );
    });

    it('should handle read failure gracefully', async () => {
      const { restore } = setupMockBluetooth(readFailureConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();

      await expect(provisioner.readStatus()).rejects.toThrow(
        'Characteristic read failed'
      );
    });

    it('should disconnect properly after use', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.connect();

      // After disconnect, operations should fail with "Not connected"
      provisioner.disconnect();

      await expect(provisioner.readStatus()).rejects.toThrow('Not connected to device');
    });

    it('should handle disconnection when already disconnected', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      // Disconnect without connecting should not throw
      expect(() => provisioner.disconnect()).not.toThrow();
    });
  });

  /**
   * Full provision flow tests
   */
  describe('Full Provision Flow', () => {
    it('should complete full provisioning with MQTT only', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      const progressSteps: string[] = [];

      const result = await provisioner.provision(
        testMqttConfig,
        undefined,
        (step) => progressSteps.push(step)
      );

      expect(result.success).toBe(true);
      expect(result.deviceName).toBe(standardDeviceConfig.deviceName);
      expect(progressSteps).toContain('connecting');
      expect(progressSteps).toContain('writing');
      expect(progressSteps).toContain('verifying');
      expect(progressSteps).toContain('done');
    });

    it('should complete full provisioning with MQTT and WiFi', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      const result = await provisioner.provision(testMqttConfig, testWifiConfig);

      expect(result.success).toBe(true);
      expect(result.deviceName).toBe(standardDeviceConfig.deviceName);
    });

    it('should report error on connection failure', async () => {
      const { restore } = setupMockBluetooth(connectionFailureConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      const progressSteps: string[] = [];

      const result = await provisioner.provision(
        testMqttConfig,
        undefined,
        (step) => progressSteps.push(step)
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to connect to device');
      expect(progressSteps).toContain('error');
    });

    it('should report error on write failure', async () => {
      const { restore } = setupMockBluetooth(writeFailureConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      const result = await provisioner.provision(testMqttConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Characteristic write failed');
    });

    it('should report failure when device status is not OK', async () => {
      const { restore } = setupMockBluetooth(errorStatusConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      const result = await provisioner.provision(testMqttConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ERROR: Invalid configuration');
    });

    it('should accept CONFIGURED as success status', async () => {
      const { restore } = setupMockBluetooth(configuredDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();

      const result = await provisioner.provision(testMqttConfig);

      expect(result.success).toBe(true);
    });

    it('should always disconnect after provisioning', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.provision(testMqttConfig);

      // After provisioning, the internal state should be cleared
      // so operations should fail with "Not connected"
      await expect(provisioner.readStatus()).rejects.toThrow('Not connected to device');
    });

    it('should disconnect even on error', async () => {
      const { restore } = setupMockBluetooth(writeFailureConfig);
      restoreFn = restore;

      const { BluetoothProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const provisioner = new BluetoothProvisioner();
      await provisioner.provision(testMqttConfig);

      // After provisioning (even with error), internal state should be cleared
      await expect(provisioner.readStatus()).rejects.toThrow('Not connected to device');
    });
  });

  /**
   * Singleton tests
   */
  describe('Singleton Pattern', () => {
    it('should return same instance from getProvisioner', async () => {
      const { restore } = setupMockBluetooth(standardDeviceConfig);
      restoreFn = restore;

      const { getProvisioner } = await import(
        '@/infrastructure/bluetooth/provisioning'
      );

      const instance1 = getProvisioner();
      const instance2 = getProvisioner();

      expect(instance1).toBe(instance2);
    });
  });
});
