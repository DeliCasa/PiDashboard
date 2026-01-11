/**
 * Query Client Tests (T052)
 * Tests for query key factory and invalidation helpers
 */

import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/queryClient';

describe('Query Key Factory (T052)', () => {
  describe('system keys', () => {
    it('should return base system key', () => {
      expect(queryKeys.system).toEqual(['system']);
    });

    it('should return system status key', () => {
      expect(queryKeys.systemStatus()).toEqual(['system', 'status']);
    });

    it('should return system health key', () => {
      expect(queryKeys.systemHealth()).toEqual(['system', 'health']);
    });
  });

  describe('wifi keys', () => {
    it('should return base wifi key', () => {
      expect(queryKeys.wifi).toEqual(['wifi']);
    });

    it('should return wifi status key', () => {
      expect(queryKeys.wifiStatus()).toEqual(['wifi', 'status']);
    });

    it('should return wifi networks key', () => {
      expect(queryKeys.wifiNetworks()).toEqual(['wifi', 'networks']);
    });
  });

  describe('devices keys', () => {
    it('should return base devices key', () => {
      expect(queryKeys.devices).toEqual(['devices']);
    });

    it('should return device list key', () => {
      expect(queryKeys.deviceList()).toEqual(['devices', 'list']);
    });

    it('should return device by id key', () => {
      expect(queryKeys.deviceById('AA:BB:CC:DD:EE:FF')).toEqual([
        'devices',
        'AA:BB:CC:DD:EE:FF',
      ]);
    });

    it('should return provisioning history key', () => {
      expect(queryKeys.provisioningHistory()).toEqual(['devices', 'history']);
    });
  });

  describe('cameras keys', () => {
    it('should return base cameras key', () => {
      expect(queryKeys.cameras).toEqual(['cameras']);
    });

    it('should return camera list key', () => {
      expect(queryKeys.cameraList()).toEqual(['cameras', 'list']);
    });

    it('should return camera diagnostics key', () => {
      expect(queryKeys.cameraDiagnostics()).toEqual(['cameras', 'diagnostics']);
    });

    it('should return camera by id key', () => {
      expect(queryKeys.cameraById('cam-001')).toEqual(['cameras', 'cam-001']);
    });
  });

  describe('door keys', () => {
    it('should return base door key', () => {
      expect(queryKeys.door).toEqual(['door']);
    });

    it('should return door status key', () => {
      expect(queryKeys.doorStatus()).toEqual(['door', 'status']);
    });

    it('should return door history key', () => {
      expect(queryKeys.doorHistory()).toEqual(['door', 'history']);
    });
  });

  describe('logs keys', () => {
    it('should return base logs key', () => {
      expect(queryKeys.logs).toEqual(['logs']);
    });

    it('should return log list key without filters', () => {
      expect(queryKeys.logList()).toEqual(['logs', undefined]);
    });

    it('should return log list key with filters', () => {
      expect(queryKeys.logList({ level: 'error' })).toEqual([
        'logs',
        { level: 'error' },
      ]);
    });

    it('should return log list key with multiple filters', () => {
      expect(queryKeys.logList({ level: 'warn', search: 'mqtt' })).toEqual([
        'logs',
        { level: 'warn', search: 'mqtt' },
      ]);
    });
  });

  describe('config keys', () => {
    it('should return base config key', () => {
      expect(queryKeys.config).toEqual(['config']);
    });

    it('should return config list key', () => {
      expect(queryKeys.configList()).toEqual(['config', 'list']);
    });

    it('should return config by key', () => {
      expect(queryKeys.configByKey('server.port')).toEqual([
        'config',
        'server.port',
      ]);
    });
  });

  describe('network keys', () => {
    it('should return base network key', () => {
      expect(queryKeys.network).toEqual(['network']);
    });

    it('should return tailscale key', () => {
      expect(queryKeys.tailscale()).toEqual(['network', 'tailscale']);
    });

    it('should return mqtt key', () => {
      expect(queryKeys.mqtt()).toEqual(['network', 'mqtt']);
    });

    it('should return bridgeServer key', () => {
      expect(queryKeys.bridgeServer()).toEqual(['network', 'bridgeserver']);
    });
  });

  describe('offline keys', () => {
    it('should return base offline key', () => {
      expect(queryKeys.offline).toEqual(['offline']);
    });

    it('should return offline queue key', () => {
      expect(queryKeys.offlineQueue()).toEqual(['offline', 'queue']);
    });
  });

  describe('key hierarchy', () => {
    it('should ensure child keys include parent prefix', () => {
      // This pattern allows invalidating all queries under a domain
      const systemBase = queryKeys.system;
      const systemStatus = queryKeys.systemStatus();
      const systemHealth = queryKeys.systemHealth();

      expect(systemStatus.slice(0, systemBase.length)).toEqual(systemBase);
      expect(systemHealth.slice(0, systemBase.length)).toEqual(systemBase);
    });

    it('should ensure network keys follow hierarchy', () => {
      const networkBase = queryKeys.network;
      const tailscale = queryKeys.tailscale();
      const mqtt = queryKeys.mqtt();
      const bridge = queryKeys.bridgeServer();

      expect(tailscale[0]).toBe(networkBase[0]);
      expect(mqtt[0]).toBe(networkBase[0]);
      expect(bridge[0]).toBe(networkBase[0]);
    });
  });

  describe('key uniqueness', () => {
    it('should generate unique keys for different devices', () => {
      const device1 = queryKeys.deviceById('AA:BB:CC:DD:EE:01');
      const device2 = queryKeys.deviceById('AA:BB:CC:DD:EE:02');

      expect(device1).not.toEqual(device2);
    });

    it('should generate unique keys for different cameras', () => {
      const camera1 = queryKeys.cameraById('cam-001');
      const camera2 = queryKeys.cameraById('cam-002');

      expect(camera1).not.toEqual(camera2);
    });

    it('should generate unique keys for different log filters', () => {
      const errorLogs = queryKeys.logList({ level: 'error' });
      const warnLogs = queryKeys.logList({ level: 'warn' });

      expect(errorLogs).not.toEqual(warnLogs);
    });
  });
});
