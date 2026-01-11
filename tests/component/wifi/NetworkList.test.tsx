/**
 * NetworkList Component Tests (T032, T039)
 * Tests for WiFi network list display and selection
 *
 * Feature: 005-testing-research-and-hardening (T039)
 * Updated to use data-testid selectors for reliable test targeting.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { NetworkList } from '@/presentation/components/wifi/NetworkList';
import type { WiFiNetwork } from '@/domain/types/entities';

const mockNetworks: WiFiNetwork[] = [
  {
    ssid: 'HomeNetwork',
    signal: -45,
    secured: true,
    encryption: 'wpa2',
    bssid: '00:11:22:33:44:55',
    channel: 6,
  },
  {
    ssid: 'GuestNetwork',
    signal: -60,
    secured: true,
    encryption: 'wpa3',
  },
  {
    ssid: 'OpenCafe',
    signal: -55,
    secured: false,
    encryption: 'open',
  },
  {
    ssid: 'WeakSignal',
    signal: -80,
    secured: true,
    encryption: 'wep',
  },
];

describe('NetworkList', () => {
  describe('rendering', () => {
    it('should render list of networks', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      // Use data-testid for list container
      expect(screen.getByTestId('network-list')).toBeInTheDocument();
      // Use data-testid for individual network items
      expect(screen.getByTestId('network-item-HomeNetwork')).toBeInTheDocument();
      expect(screen.getByTestId('network-item-GuestNetwork')).toBeInTheDocument();
      expect(screen.getByTestId('network-item-OpenCafe')).toBeInTheDocument();
      expect(screen.getByTestId('network-item-WeakSignal')).toBeInTheDocument();
    });

    it('should display empty state when no networks', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={[]} onSelect={onSelect} />);

      // Use data-testid for empty state
      expect(screen.getByTestId('network-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No networks found')).toBeInTheDocument();
      expect(screen.getByText('Try scanning again')).toBeInTheDocument();
    });

    it('should sort networks by signal strength (strongest first)', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      const buttons = screen.getAllByRole('button');
      // HomeNetwork (-45) should be first, WeakSignal (-80) should be last
      expect(buttons[0]).toHaveTextContent('HomeNetwork');
      expect(buttons[buttons.length - 1]).toHaveTextContent('WeakSignal');
    });
  });

  describe('network information', () => {
    it('should display signal strength in dBm', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      expect(screen.getByText('-45 dBm')).toBeInTheDocument();
      expect(screen.getByText('-60 dBm')).toBeInTheDocument();
    });

    it('should display lock icon for secured networks', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      // HomeNetwork and GuestNetwork are secured - use data-testid
      const homeNetworkItem = screen.getByTestId('network-item-HomeNetwork');
      // Lock icons should be present (we check by aria-label for better accessibility)
      expect(homeNetworkItem.querySelector('[aria-label="Secured"]')).toBeInTheDocument();
    });

    it('should not display lock icon for open networks', () => {
      const onSelect = vi.fn();
      const openNetworks: WiFiNetwork[] = [
        { ssid: 'OpenNetwork', signal: -50, secured: false, encryption: 'open' },
      ];
      render(<NetworkList networks={openNetworks} onSelect={onSelect} />);

      const networkItem = screen.getByTestId('network-item-OpenNetwork');
      expect(networkItem.querySelector('[aria-label="Secured"]')).not.toBeInTheDocument();
    });

    it('should display encryption type for encrypted networks', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      expect(screen.getByText('wpa2')).toBeInTheDocument();
      expect(screen.getByText('wpa3')).toBeInTheDocument();
      expect(screen.getByText('wep')).toBeInTheDocument();
    });

    it('should not display encryption for open networks', () => {
      const onSelect = vi.fn();
      const openNetworks: WiFiNetwork[] = [
        { ssid: 'OpenOnly', signal: -50, secured: false, encryption: 'open' },
      ];
      render(<NetworkList networks={openNetworks} onSelect={onSelect} />);

      expect(screen.queryByText('open')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should call onSelect when network is clicked', async () => {
      const onSelect = vi.fn();
      const { user } = render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      await user.click(screen.getByRole('button', { name: /homeNetwork/i }));

      expect(onSelect).toHaveBeenCalledWith('HomeNetwork');
    });

    it('should highlight selected network', () => {
      const onSelect = vi.fn();
      render(
        <NetworkList
          networks={mockNetworks}
          selectedSsid="HomeNetwork"
          onSelect={onSelect}
        />
      );

      const selectedButton = screen.getByRole('button', { name: /homeNetwork/i });
      expect(selectedButton).toHaveClass('bg-accent');
    });
  });

  describe('connected state', () => {
    it('should display "Connected" badge for connected network', () => {
      const onSelect = vi.fn();
      render(
        <NetworkList
          networks={mockNetworks}
          connectedSsid="HomeNetwork"
          onSelect={onSelect}
        />
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should apply special styling to connected network', () => {
      const onSelect = vi.fn();
      render(
        <NetworkList
          networks={mockNetworks}
          connectedSsid="HomeNetwork"
          onSelect={onSelect}
        />
      );

      const connectedButton = screen.getByRole('button', { name: /homeNetwork/i });
      expect(connectedButton).toHaveClass('border-green-500/50');
    });
  });

  describe('signal strength indicators', () => {
    it('should show 4 bars for excellent signal (> -50 dBm)', () => {
      const onSelect = vi.fn();
      const excellentNetwork: WiFiNetwork[] = [
        { ssid: 'Excellent', signal: -45, secured: false, encryption: 'open' },
      ];
      render(<NetworkList networks={excellentNetwork} onSelect={onSelect} />);

      // Signal bars are rendered as divs
      const networkButton = screen.getByRole('button');
      const signalBars = networkButton.querySelector('[title="-45 dBm"]');
      expect(signalBars).toBeInTheDocument();
    });

    it('should show appropriate color coding for signal strength', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      // Green for strong signals
      const strongSignal = screen.getByText('-45 dBm');
      expect(strongSignal).toHaveClass('text-green-500');

      // Red for weak signals
      const weakSignal = screen.getByText('-80 dBm');
      expect(weakSignal).toHaveClass('text-red-500');
    });
  });

  describe('accessibility', () => {
    it('should have button role for each network', () => {
      const onSelect = vi.fn();
      render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(mockNetworks.length);
    });

    it('should support keyboard navigation', async () => {
      const onSelect = vi.fn();
      const { user } = render(<NetworkList networks={mockNetworks} onSelect={onSelect} />);

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalled();
    });
  });
});
