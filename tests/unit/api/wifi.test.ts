/**
 * WiFi API Transformation Tests (T014, T015)
 * Tests for bug v1.1.4 - WiFi security string transformation
 */

import { describe, it, expect } from 'vitest';
import { mapSecurityToEncryption, transformNetwork } from '@/infrastructure/api/wifi';
import {
  wifiApiResponses,
  expectedTransformedNetworks,
  securityMappingCases,
} from '../../fixtures/wifi.fixture';

describe('WiFi API Transformations', () => {
  describe('mapSecurityToEncryption (T014)', () => {
    it('should map WPA2 security strings correctly', () => {
      expect(mapSecurityToEncryption('WPA2')).toBe('wpa2');
      expect(mapSecurityToEncryption('wpa2')).toBe('wpa2');
      expect(mapSecurityToEncryption('WPA2-PSK')).toBe('wpa2');
    });

    it('should map WPA3 security strings correctly', () => {
      expect(mapSecurityToEncryption('WPA3')).toBe('wpa3');
      expect(mapSecurityToEncryption('wpa3')).toBe('wpa3');
      expect(mapSecurityToEncryption('WPA3-SAE')).toBe('wpa3');
    });

    it('should map legacy WPA security strings correctly', () => {
      expect(mapSecurityToEncryption('WPA')).toBe('wpa');
      expect(mapSecurityToEncryption('wpa')).toBe('wpa');
      expect(mapSecurityToEncryption('WPA-PSK')).toBe('wpa');
    });

    it('should map WEP security strings correctly', () => {
      expect(mapSecurityToEncryption('WEP')).toBe('wep');
      expect(mapSecurityToEncryption('wep')).toBe('wep');
    });

    it('should map open networks correctly', () => {
      expect(mapSecurityToEncryption('Open')).toBe('open');
      expect(mapSecurityToEncryption('OPEN')).toBe('open');
      expect(mapSecurityToEncryption('open')).toBe('open');
      expect(mapSecurityToEncryption('none')).toBe('open');
      expect(mapSecurityToEncryption('None')).toBe('open');
    });

    it('should prefer WPA3 in mixed security strings (bug v1.1.4)', () => {
      // This was the specific bug - mixed WPA2/WPA3 networks
      expect(mapSecurityToEncryption('WPA2/WPA3')).toBe('wpa3');
      expect(mapSecurityToEncryption('wpa2/wpa3')).toBe('wpa3');
    });

    it('should default to open for unknown security types', () => {
      expect(mapSecurityToEncryption('UNKNOWN')).toBe('open');
      expect(mapSecurityToEncryption('RandomProtocol')).toBe('open');
    });

    it('should handle empty string as open', () => {
      expect(mapSecurityToEncryption('')).toBe('open');
    });

    it.each(securityMappingCases)(
      'should map "$input" to "$expected"',
      ({ input, expected }) => {
        expect(mapSecurityToEncryption(input)).toBe(expected);
      }
    );
  });

  describe('transformNetwork (T015)', () => {
    it('should transform WPA2 network correctly', () => {
      const result = transformNetwork(wifiApiResponses.wpa2Network);
      expect(result).toEqual(expectedTransformedNetworks.wpa2Network);
    });

    it('should transform WPA3 network correctly', () => {
      const result = transformNetwork(wifiApiResponses.wpa3Network);
      expect(result).toEqual(expectedTransformedNetworks.wpa3Network);
    });

    it('should transform open network correctly', () => {
      const result = transformNetwork(wifiApiResponses.openNetwork);
      expect(result).toEqual(expectedTransformedNetworks.openNetwork);
    });

    it('should set secured=true for encrypted networks', () => {
      const wpa2 = transformNetwork(wifiApiResponses.wpa2Network);
      const wpa3 = transformNetwork(wifiApiResponses.wpa3Network);
      const wpa = transformNetwork(wifiApiResponses.wpaNetwork);
      const wep = transformNetwork(wifiApiResponses.wepNetwork);

      expect(wpa2.secured).toBe(true);
      expect(wpa3.secured).toBe(true);
      expect(wpa.secured).toBe(true);
      expect(wep.secured).toBe(true);
    });

    it('should set secured=false for open networks', () => {
      const open = transformNetwork(wifiApiResponses.openNetwork);
      const none = transformNetwork(wifiApiResponses.noneSecurityNetwork);

      expect(open.secured).toBe(false);
      expect(none.secured).toBe(false);
    });

    it('should preserve ssid correctly', () => {
      const result = transformNetwork(wifiApiResponses.wpa2Network);
      expect(result.ssid).toBe('HomeNetwork');
    });

    it('should preserve signal strength correctly', () => {
      const result = transformNetwork(wifiApiResponses.wpa2Network);
      expect(result.signal).toBe(-45);
    });

    it('should preserve optional bssid field', () => {
      const withBssid = transformNetwork(wifiApiResponses.wpa2Network);
      const withoutBssid = transformNetwork(wifiApiResponses.wpaNetwork);

      expect(withBssid.bssid).toBe('00:11:22:33:44:55');
      expect(withoutBssid.bssid).toBeUndefined();
    });

    it('should preserve optional channel field', () => {
      const withChannel = transformNetwork(wifiApiResponses.wpa2Network);
      const withoutChannel = transformNetwork(wifiApiResponses.wpaNetwork);

      expect(withChannel.channel).toBe(6);
      expect(withoutChannel.channel).toBeUndefined();
    });

    it('should not include frequency or quality from backend (not in frontend type)', () => {
      const result = transformNetwork(wifiApiResponses.wpa2Network);

      // These fields should not be present in the transformed output
      expect(result).not.toHaveProperty('frequency');
      expect(result).not.toHaveProperty('quality');
    });

    it('should handle case-insensitive security strings (bug v1.1.4)', () => {
      const uppercase = transformNetwork(wifiApiResponses.uppercaseSecurity);
      const lowercase = transformNetwork(wifiApiResponses.lowercaseSecurity);

      expect(uppercase.encryption).toBe('wpa2');
      expect(lowercase.encryption).toBe('wpa2');
    });

    it('should handle unknown security as open (bug v1.1.4)', () => {
      const unknown = transformNetwork(wifiApiResponses.unknownSecurity);

      expect(unknown.encryption).toBe('open');
      expect(unknown.secured).toBe(false);
    });

    it('should handle empty security string (bug v1.1.4)', () => {
      const empty = transformNetwork(wifiApiResponses.emptySecurityString);

      expect(empty.encryption).toBe('open');
      expect(empty.secured).toBe(false);
    });
  });
});
