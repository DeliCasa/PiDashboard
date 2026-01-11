/**
 * Config API Transformation Tests (T017)
 * Tests for bug v1.1.2 - Nested backend response transformation
 */

import { describe, it, expect } from 'vitest';
import { mapSectionToCategory } from '@/infrastructure/api/config';
import { sectionMappingCases } from '../../fixtures/config.fixture';

describe('Config API Transformations', () => {
  describe('mapSectionToCategory (T017)', () => {
    it('should map Server section to system category', () => {
      expect(mapSectionToCategory('Server')).toBe('system');
    });

    it('should map System section to system category', () => {
      expect(mapSectionToCategory('System')).toBe('system');
    });

    it('should map Bridge section to system category', () => {
      expect(mapSectionToCategory('Bridge')).toBe('system');
    });

    it('should map MQTT section to mqtt category', () => {
      expect(mapSectionToCategory('MQTT')).toBe('mqtt');
    });

    it('should map WiFi section to wifi category', () => {
      expect(mapSectionToCategory('WiFi')).toBe('wifi');
    });

    it('should map Hardware section to hardware category', () => {
      expect(mapSectionToCategory('Hardware')).toBe('hardware');
    });

    it('should map Heartbeat section to monitoring category', () => {
      expect(mapSectionToCategory('Heartbeat')).toBe('monitoring');
    });

    it('should map Logging section to monitoring category', () => {
      expect(mapSectionToCategory('Logging')).toBe('monitoring');
    });

    it('should map Monitoring section to monitoring category', () => {
      expect(mapSectionToCategory('Monitoring')).toBe('monitoring');
    });

    it('should default unknown sections to system category (bug v1.1.2)', () => {
      expect(mapSectionToCategory('UnknownSection')).toBe('system');
      expect(mapSectionToCategory('RandomName')).toBe('system');
      expect(mapSectionToCategory('NewFeature')).toBe('system');
    });

    it('should handle empty string as system category', () => {
      expect(mapSectionToCategory('')).toBe('system');
    });

    it.each(sectionMappingCases)(
      'should map "$section" to "$expected"',
      ({ section, expected }) => {
        expect(mapSectionToCategory(section)).toBe(expected);
      }
    );
  });
});
