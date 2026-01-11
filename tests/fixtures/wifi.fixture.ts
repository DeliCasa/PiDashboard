/**
 * WiFi Test Fixtures (T011)
 * Mock data for WiFi API transformation tests
 */

import type { WiFiNetworkApiResponse } from '@/infrastructure/api/wifi';
import type { WiFiNetwork } from '@/domain/types/entities';

// Backend API response samples
export const wifiApiResponses = {
  wpa2Network: {
    ssid: 'HomeNetwork',
    bssid: '00:11:22:33:44:55',
    frequency: 2437,
    signal: -45,
    security: 'WPA2',
    channel: 6,
    quality: 80,
  } satisfies WiFiNetworkApiResponse,

  wpa3Network: {
    ssid: 'SecureNetwork',
    bssid: '00:11:22:33:44:66',
    frequency: 5180,
    signal: -50,
    security: 'WPA3',
    channel: 36,
    quality: 70,
  } satisfies WiFiNetworkApiResponse,

  wpaNetwork: {
    ssid: 'LegacyNetwork',
    signal: -60,
    security: 'WPA',
  } satisfies WiFiNetworkApiResponse,

  wepNetwork: {
    ssid: 'OldNetwork',
    signal: -70,
    security: 'WEP',
  } satisfies WiFiNetworkApiResponse,

  openNetwork: {
    ssid: 'CoffeeShop',
    bssid: '00:11:22:33:44:77',
    signal: -55,
    security: 'Open',
    channel: 11,
  } satisfies WiFiNetworkApiResponse,

  noneSecurityNetwork: {
    ssid: 'PublicHotspot',
    signal: -65,
    security: 'none',
  } satisfies WiFiNetworkApiResponse,

  mixedSecurityNetwork: {
    ssid: 'HybridNetwork',
    signal: -48,
    security: 'WPA2/WPA3',
  } satisfies WiFiNetworkApiResponse,

  // Edge cases for bug v1.1.4 regression testing
  uppercaseSecurity: {
    ssid: 'UpperCase',
    signal: -50,
    security: 'WPA2-PSK',
  } satisfies WiFiNetworkApiResponse,

  lowercaseSecurity: {
    ssid: 'LowerCase',
    signal: -50,
    security: 'wpa2',
  } satisfies WiFiNetworkApiResponse,

  unknownSecurity: {
    ssid: 'UnknownSec',
    signal: -50,
    security: 'UNKNOWN_PROTOCOL',
  } satisfies WiFiNetworkApiResponse,

  emptySecurityString: {
    ssid: 'EmptySec',
    signal: -50,
    security: '',
  } satisfies WiFiNetworkApiResponse,
};

// Expected transformed frontend results
export const expectedTransformedNetworks: Record<string, WiFiNetwork> = {
  wpa2Network: {
    ssid: 'HomeNetwork',
    signal: -45,
    secured: true,
    encryption: 'wpa2',
    bssid: '00:11:22:33:44:55',
    channel: 6,
  },

  wpa3Network: {
    ssid: 'SecureNetwork',
    signal: -50,
    secured: true,
    encryption: 'wpa3',
    bssid: '00:11:22:33:44:66',
    channel: 36,
  },

  openNetwork: {
    ssid: 'CoffeeShop',
    signal: -55,
    secured: false,
    encryption: 'open',
    bssid: '00:11:22:33:44:77',
    channel: 11,
  },
};

// Security string to encryption type mapping test cases
export const securityMappingCases = [
  { input: 'WPA2', expected: 'wpa2' },
  { input: 'wpa2', expected: 'wpa2' },
  { input: 'WPA2-PSK', expected: 'wpa2' },
  { input: 'WPA3', expected: 'wpa3' },
  { input: 'wpa3', expected: 'wpa3' },
  { input: 'WPA3-SAE', expected: 'wpa3' },
  { input: 'WPA', expected: 'wpa' },
  { input: 'wpa', expected: 'wpa' },
  { input: 'WPA-PSK', expected: 'wpa' },
  { input: 'WEP', expected: 'wep' },
  { input: 'wep', expected: 'wep' },
  { input: 'Open', expected: 'open' },
  { input: 'OPEN', expected: 'open' },
  { input: 'open', expected: 'open' },
  { input: 'none', expected: 'open' },
  { input: 'None', expected: 'open' },
  { input: 'NONE', expected: 'open' },
  { input: '', expected: 'open' }, // Empty string defaults to open
  { input: 'UNKNOWN', expected: 'open' }, // Unknown defaults to open
  { input: 'WPA2/WPA3', expected: 'wpa3' }, // Mixed prefers WPA3
] as const;

// Full scan response for integration testing
export const fullScanResponse = {
  count: 5,
  networks: [
    wifiApiResponses.wpa2Network,
    wifiApiResponses.wpa3Network,
    wifiApiResponses.openNetwork,
    wifiApiResponses.wepNetwork,
    wifiApiResponses.wpaNetwork,
  ],
  success: true,
};
