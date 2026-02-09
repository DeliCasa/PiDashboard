/**
 * Active Container Store Integration Tests
 * Feature: 046-opaque-container-identity (T011)
 *
 * Tests the interaction between the active container store
 * and container list data for stale selection reconciliation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useActiveContainerStore } from '@/application/stores/activeContainer';

describe('Active Container Store Integration', () => {
  beforeEach(() => {
    act(() => {
      useActiveContainerStore.setState({ activeContainerId: null });
    });
  });

  describe('stale selection scenarios', () => {
    it('stores selection correctly', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      act(() => {
        useActiveContainerStore.getState().setActiveContainer(id);
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBe(id);
    });

    it('clears stale selection', () => {
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('old-id');
      });
      act(() => {
        useActiveContainerStore.getState().clearActiveContainer();
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBeNull();
    });

    it('replaces stale ID with new fallback', () => {
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('stale-id');
      });

      // Simulate reconciliation: container list has a different first item
      const firstAvailable = '550e8400-e29b-41d4-a716-446655440001';
      act(() => {
        useActiveContainerStore.getState().setActiveContainer(firstAvailable);
      });

      expect(useActiveContainerStore.getState().activeContainerId).toBe(firstAvailable);
    });

    it('handles rapid container switching', () => {
      const ids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];

      for (const id of ids) {
        act(() => {
          useActiveContainerStore.getState().setActiveContainer(id);
        });
      }

      // Should have the last one
      expect(useActiveContainerStore.getState().activeContainerId).toBe(ids[2]);
    });
  });
});
