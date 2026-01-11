/**
 * DeviceList Component Tests (T065)
 *
 * Tests for the BLE device list component including:
 * - Device rendering
 * - Status badges
 * - Selection management
 * - Provision button behavior
 *
 * Feature: 005-testing-research-and-hardening [US4]
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeviceList } from '@/presentation/components/devices/DeviceList';
import type { Device, DeviceStatus } from '@/domain/types/entities';

// Test data factory
function createDevice(overrides: Partial<Device> = {}): Device {
  return {
    address: 'AA:BB:CC:DD:EE:FF',
    name: 'DeliCasa-ESP32-001',
    rssi: -55,
    status: 'discovered',
    provisioned: false,
    last_seen: new Date().toISOString(),
    ...overrides,
  };
}

describe('DeviceList Component (T065)', () => {
  describe('Empty State', () => {
    it('should display empty state when no devices', () => {
      render(
        <DeviceList
          devices={[]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(screen.getByText('No devices found')).toBeInTheDocument();
      expect(
        screen.getByText('Start a scan to discover nearby ESP32 devices')
      ).toBeInTheDocument();
    });
  });

  describe('Device Rendering', () => {
    it('should render device name and address', () => {
      const device = createDevice({
        name: 'Test-Device-001',
        address: '11:22:33:44:55:66',
      });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(screen.getByText('Test-Device-001')).toBeInTheDocument();
      expect(screen.getByText(/11:22:33:44:55:66/)).toBeInTheDocument();
    });

    it('should display firmware version when available', () => {
      const device = createDevice({
        firmware_version: '2.1.0',
      });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(screen.getByText(/v2\.1\.0/)).toBeInTheDocument();
    });

    it('should render multiple devices', () => {
      const devices = [
        createDevice({ address: 'AA:AA:AA:AA:AA:AA', name: 'Device-1' }),
        createDevice({ address: 'BB:BB:BB:BB:BB:BB', name: 'Device-2' }),
        createDevice({ address: 'CC:CC:CC:CC:CC:CC', name: 'Device-3' }),
      ];

      render(
        <DeviceList
          devices={devices}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(screen.getByText('Device-1')).toBeInTheDocument();
      expect(screen.getByText('Device-2')).toBeInTheDocument();
      expect(screen.getByText('Device-3')).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    const statusTests: Array<{ status: DeviceStatus; label: string }> = [
      { status: 'discovered', label: 'Discovered' },
      { status: 'connecting', label: 'Connecting' },
      { status: 'provisioning', label: 'Provisioning' },
      { status: 'provisioned', label: 'Provisioned' },
      { status: 'online', label: 'Online' },
      { status: 'offline', label: 'Offline' },
      { status: 'error', label: 'Error' },
    ];

    statusTests.forEach(({ status, label }) => {
      it(`should show ${label} badge for ${status} status`, () => {
        const device = createDevice({ status });

        render(
          <DeviceList
            devices={[device]}
            selectedAddresses={[]}
            onSelectionChange={vi.fn()}
            onProvision={vi.fn()}
          />
        );

        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('Signal Indicator', () => {
    it('should show full signal for strong RSSI (> -50)', () => {
      const device = createDevice({ rssi: -45 });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      // Signal indicator should be present with title showing dBm
      expect(screen.getByTitle('-45 dBm')).toBeInTheDocument();
    });

    it('should show weak signal for low RSSI (<= -70)', () => {
      const device = createDevice({ rssi: -80 });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(screen.getByTitle('-80 dBm')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should show selection checkbox for unprovisioned devices', () => {
      const device = createDevice({ provisioned: false });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(
        screen.getByRole('checkbox', { name: /select/i })
      ).toBeInTheDocument();
    });

    it('should not show checkbox for provisioned devices', () => {
      const device = createDevice({ provisioned: true, status: 'provisioned' });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(
        screen.queryByRole('checkbox', { name: /select/i })
      ).not.toBeInTheDocument();
    });

    it('should call onSelectionChange when device is selected', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const device = createDevice({ address: 'AA:BB:CC:DD:EE:FF' });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={onSelectionChange}
          onProvision={vi.fn()}
        />
      );

      await user.click(screen.getByRole('checkbox'));

      expect(onSelectionChange).toHaveBeenCalledWith(['AA:BB:CC:DD:EE:FF']);
    });

    it('should call onSelectionChange when device is deselected', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const device = createDevice({ address: 'AA:BB:CC:DD:EE:FF' });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={['AA:BB:CC:DD:EE:FF']}
          onSelectionChange={onSelectionChange}
          onProvision={vi.fn()}
        />
      );

      await user.click(screen.getByRole('checkbox'));

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('should show selection count', () => {
      const devices = [
        createDevice({ address: 'AA:AA:AA:AA:AA:AA' }),
        createDevice({ address: 'BB:BB:BB:BB:BB:BB' }),
        createDevice({ address: 'CC:CC:CC:CC:CC:CC' }),
      ];

      render(
        <DeviceList
          devices={devices}
          selectedAddresses={['AA:AA:AA:AA:AA:AA', 'BB:BB:BB:BB:BB:BB']}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(screen.getByText(/2 of 3 selected/)).toBeInTheDocument();
    });

    it('should select all unprovisioned devices with Select All', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const devices = [
        createDevice({ address: 'AA:AA:AA:AA:AA:AA' }),
        createDevice({ address: 'BB:BB:BB:BB:BB:BB', provisioned: true, status: 'provisioned' }),
        createDevice({ address: 'CC:CC:CC:CC:CC:CC' }),
      ];

      render(
        <DeviceList
          devices={devices}
          selectedAddresses={[]}
          onSelectionChange={onSelectionChange}
          onProvision={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /select all/i }));

      expect(onSelectionChange).toHaveBeenCalledWith([
        'AA:AA:AA:AA:AA:AA',
        'CC:CC:CC:CC:CC:CC',
      ]);
    });

    it('should clear selection with Clear button', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const devices = [
        createDevice({ address: 'AA:AA:AA:AA:AA:AA' }),
      ];

      render(
        <DeviceList
          devices={devices}
          selectedAddresses={['AA:AA:AA:AA:AA:AA']}
          onSelectionChange={onSelectionChange}
          onProvision={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /clear/i }));

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Provision Button', () => {
    it('should show Provision button for discovered devices', () => {
      const device = createDevice({ status: 'discovered', provisioned: false });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /provision/i })
      ).toBeInTheDocument();
    });

    it('should not show Provision button for provisioned devices', () => {
      const device = createDevice({ status: 'provisioned', provisioned: true });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(
        screen.queryByRole('button', { name: /provision/i })
      ).not.toBeInTheDocument();
    });

    it('should not show Provision button for provisioning devices', () => {
      const device = createDevice({ status: 'provisioning', provisioned: false });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(
        screen.queryByRole('button', { name: /provision/i })
      ).not.toBeInTheDocument();
    });

    it('should call onProvision with device address when clicked', async () => {
      const user = userEvent.setup();
      const onProvision = vi.fn();
      const device = createDevice({ address: 'AA:BB:CC:DD:EE:FF' });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={onProvision}
        />
      );

      await user.click(screen.getByRole('button', { name: /provision/i }));

      expect(onProvision).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });
  });

  describe('Visual States', () => {
    it('should highlight selected devices', () => {
      const device = createDevice({ address: 'AA:BB:CC:DD:EE:FF' });

      const { container } = render(
        <DeviceList
          devices={[device]}
          selectedAddresses={['AA:BB:CC:DD:EE:FF']}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      // Selected devices should have a border-primary class
      const deviceCard = container.querySelector('.border-primary');
      expect(deviceCard).toBeInTheDocument();
    });

    it('should show spinning icon for connecting status', () => {
      const device = createDevice({ status: 'connecting' });

      const { container } = render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      const spinningIcon = container.querySelector('.animate-spin');
      expect(spinningIcon).toBeInTheDocument();
    });

    it('should show spinning icon for provisioning status', () => {
      const device = createDevice({ status: 'provisioning' });

      const { container } = render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      const spinningIcon = container.querySelector('.animate-spin');
      expect(spinningIcon).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible checkbox labels', () => {
      const device = createDevice({ name: 'Test-Device' });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(
        screen.getByRole('checkbox', { name: /select test-device/i })
      ).toBeInTheDocument();
    });

    it('should have signal indicator with RSSI tooltip', () => {
      const device = createDevice({ rssi: -60 });

      render(
        <DeviceList
          devices={[device]}
          selectedAddresses={[]}
          onSelectionChange={vi.fn()}
          onProvision={vi.fn()}
        />
      );

      expect(screen.getByTitle('-60 dBm')).toBeInTheDocument();
    });
  });
});
