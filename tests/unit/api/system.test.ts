/**
 * System API Transformation Tests (T023)
 * Tests for nanoseconds uptime conversion and system info transformation
 */

import { describe, it, expect } from 'vitest';
import { transformSystemInfo } from '@/infrastructure/api/system';
import {
  systemApiResponses,
  expectedSystemStatus,
  uptimeConversionCases,
  piModelCases,
} from '../../fixtures/system.fixture';

describe('System API Transformations', () => {
  describe('transformSystemInfo (T023)', () => {
    describe('basic transformations', () => {
      it('should transform healthy system response correctly', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);

        expect(result.cpu_usage).toBe(expectedSystemStatus.healthy.cpu_usage);
        expect(result.memory_usage).toBe(expectedSystemStatus.healthy.memory_usage);
        expect(result.memory_total).toBe(expectedSystemStatus.healthy.memory_total);
        expect(result.memory_available).toBe(expectedSystemStatus.healthy.memory_available);
        expect(result.disk_usage).toBe(expectedSystemStatus.healthy.disk_usage);
        expect(result.disk_total).toBe(expectedSystemStatus.healthy.disk_total);
        expect(result.temperature).toBe(expectedSystemStatus.healthy.temperature);
      });

      it('should transform high load system response', () => {
        const result = transformSystemInfo(systemApiResponses.highLoad);

        expect(result.cpu_usage).toBe(expectedSystemStatus.highLoad.cpu_usage);
        expect(result.memory_usage).toBe(expectedSystemStatus.highLoad.memory_usage);
        expect(result.temperature).toBe(expectedSystemStatus.highLoad.temperature);
      });

      it('should calculate disk_available correctly', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);

        // disk_available = total_gb - used_gb = 32 - 10.5 = 21.5
        expect(result.disk_available).toBe(21.5);
      });
    });

    describe('nanoseconds uptime conversion', () => {
      it('should convert nanoseconds to seconds correctly', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);

        // 86400_000_000_000 nanoseconds = 86400 seconds = 1 day
        expect(result.uptime_seconds).toBe(86400);
      });

      it('should format 1 day uptime as "1d 0h 0m"', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);
        expect(result.uptime).toBe('1d 0h 0m');
      });

      it('should format 7 days uptime as "7d 0h 0m"', () => {
        const result = transformSystemInfo(systemApiResponses.highLoad);
        expect(result.uptime).toBe('7d 0h 0m');
      });

      it('should format 1 hour uptime as "1h 0m"', () => {
        const result = transformSystemInfo(systemApiResponses.pi3Model);
        expect(result.uptime).toBe('1h 0m');
      });

      it('should format 5 minutes uptime as "5m"', () => {
        const result = transformSystemInfo(systemApiResponses.freshBoot);
        expect(result.uptime).toBe('5m');
      });

      it.each(uptimeConversionCases)(
        'should convert $nanoseconds ns to "$expectedString"',
        ({ nanoseconds, expectedSeconds, expectedString }) => {
          // V1 envelope unwrapped - data is direct
          const mockResponse = {
            ...systemApiResponses.healthy,
            uptime: nanoseconds,
          };
          const result = transformSystemInfo(mockResponse);

          expect(result.uptime_seconds).toBe(expectedSeconds);
          expect(result.uptime).toBe(expectedString);
        }
      );
    });

    describe('Pi model detection', () => {
      it('should detect Pi 4 model with 4+ cores', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);
        expect(result.pi_model).toBe('pi4');
      });

      it('should detect Pi 3 model with less than 4 cores', () => {
        const result = transformSystemInfo(systemApiResponses.pi3Model);
        expect(result.pi_model).toBe('pi3');
      });

      it.each(piModelCases)(
        'should detect $expectedModel for $coreCount cores',
        ({ coreCount, expectedModel }) => {
          // V1 envelope unwrapped - data is direct
          const mockResponse = {
            ...systemApiResponses.healthy,
            cpu: {
              ...systemApiResponses.healthy.cpu,
              core_count: coreCount,
            },
          };
          const result = transformSystemInfo(mockResponse);
          expect(result.pi_model).toBe(expectedModel);
        }
      );
    });

    describe('default hostname', () => {
      it('should use default hostname "raspberrypi" when not in response', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);
        expect(result.hostname).toBe('raspberrypi');
      });
    });

    describe('memory values', () => {
      it('should preserve memory values in MB', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);

        expect(result.memory_total).toBe(2048);
        expect(result.memory_available).toBe(1536);
      });
    });

    describe('disk values', () => {
      it('should preserve disk values in GB', () => {
        const result = transformSystemInfo(systemApiResponses.healthy);

        expect(result.disk_total).toBe(32);
        expect(result.disk_usage).toBe(32.8);
      });
    });
  });
});
