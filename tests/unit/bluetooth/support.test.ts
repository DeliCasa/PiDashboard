/**
 * Web Bluetooth Support Tests (T059)
 *
 * Tests for isWebBluetoothSupported detection function.
 *
 * Feature: 005-testing-research-and-hardening [US4]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockBluetooth, removeBluetooth } from '../../mocks/bluetooth-utils';

describe('isWebBluetoothSupported (T059)', () => {
  let restoreFn: (() => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreFn?.();
    restoreFn = undefined;
  });

  it('should return true when Web Bluetooth is available', async () => {
    const { restore } = setupMockBluetooth();
    restoreFn = restore;

    const { isWebBluetoothSupported } = await import(
      '@/infrastructure/bluetooth/provisioning'
    );

    expect(isWebBluetoothSupported()).toBe(true);
  });

  it('should return false when bluetooth is not in navigator', async () => {
    const { restore } = removeBluetooth();
    restoreFn = restore;

    const { isWebBluetoothSupported } = await import(
      '@/infrastructure/bluetooth/provisioning'
    );

    expect(isWebBluetoothSupported()).toBe(false);
  });

  it('should return false when requestDevice is not a function', async () => {
    // Install partial bluetooth (missing requestDevice)
    const originalBluetooth = (navigator as Record<string, unknown>).bluetooth;
    Object.defineProperty(navigator, 'bluetooth', {
      value: { getAvailability: () => Promise.resolve(true) },
      configurable: true,
      writable: true,
    });

    restoreFn = () => {
      if (originalBluetooth !== undefined) {
        Object.defineProperty(navigator, 'bluetooth', {
          value: originalBluetooth,
          configurable: true,
          writable: true,
        });
      } else {
        delete (navigator as Record<string, unknown>).bluetooth;
      }
    };

    const { isWebBluetoothSupported } = await import(
      '@/infrastructure/bluetooth/provisioning'
    );

    expect(isWebBluetoothSupported()).toBe(false);
  });

  it('should return false when bluetooth object is null', async () => {
    const originalBluetooth = (navigator as Record<string, unknown>).bluetooth;
    Object.defineProperty(navigator, 'bluetooth', {
      value: null,
      configurable: true,
      writable: true,
    });

    restoreFn = () => {
      if (originalBluetooth !== undefined) {
        Object.defineProperty(navigator, 'bluetooth', {
          value: originalBluetooth,
          configurable: true,
          writable: true,
        });
      } else {
        delete (navigator as Record<string, unknown>).bluetooth;
      }
    };

    const { isWebBluetoothSupported } = await import(
      '@/infrastructure/bluetooth/provisioning'
    );

    expect(isWebBluetoothSupported()).toBe(false);
  });

  it('should handle edge case where bluetooth.requestDevice exists but is not callable', async () => {
    const originalBluetooth = (navigator as Record<string, unknown>).bluetooth;
    Object.defineProperty(navigator, 'bluetooth', {
      value: { requestDevice: 'not a function' },
      configurable: true,
      writable: true,
    });

    restoreFn = () => {
      if (originalBluetooth !== undefined) {
        Object.defineProperty(navigator, 'bluetooth', {
          value: originalBluetooth,
          configurable: true,
          writable: true,
        });
      } else {
        delete (navigator as Record<string, unknown>).bluetooth;
      }
    };

    const { isWebBluetoothSupported } = await import(
      '@/infrastructure/bluetooth/provisioning'
    );

    expect(isWebBluetoothSupported()).toBe(false);
  });
});
