/**
 * Active Container Store Tests
 * Feature: 046-opaque-container-identity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useActiveContainerStore,
  useActiveContainerId,
  useActiveContainerActions,
} from '@/application/stores/activeContainer';

describe('Active Container Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useActiveContainerStore.setState({ activeContainerId: null });
    });
  });

  describe('initial state', () => {
    it('starts with null active container', () => {
      const state = useActiveContainerStore.getState();
      expect(state.activeContainerId).toBeNull();
    });
  });

  describe('setActiveContainer', () => {
    it('sets the active container ID', () => {
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('550e8400-e29b-41d4-a716-446655440000');
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('replaces a previously set container ID', () => {
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('container-aaa');
      });
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('container-bbb');
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBe('container-bbb');
    });

    it('accepts any opaque string as container ID', () => {
      const opaqueIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        'container-abc-123',
        '12345',
        'some-random-string',
      ];
      for (const id of opaqueIds) {
        act(() => {
          useActiveContainerStore.getState().setActiveContainer(id);
        });
        expect(useActiveContainerStore.getState().activeContainerId).toBe(id);
      }
    });
  });

  describe('clearActiveContainer', () => {
    it('clears the active container to null', () => {
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('container-aaa');
      });
      act(() => {
        useActiveContainerStore.getState().clearActiveContainer();
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBeNull();
    });

    it('is a no-op when already null', () => {
      act(() => {
        useActiveContainerStore.getState().clearActiveContainer();
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBeNull();
    });
  });

  describe('useActiveContainerId hook', () => {
    it('returns null initially', () => {
      const { result } = renderHook(() => useActiveContainerId());
      expect(result.current).toBeNull();
    });

    it('returns the active container ID after setting', () => {
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('container-xyz');
      });
      const { result } = renderHook(() => useActiveContainerId());
      expect(result.current).toBe('container-xyz');
    });
  });

  describe('useActiveContainerActions hook', () => {
    it('provides set and clear actions', () => {
      const { result } = renderHook(() => useActiveContainerActions());
      expect(typeof result.current.setActiveContainer).toBe('function');
      expect(typeof result.current.clearActiveContainer).toBe('function');
    });

    it('actions update the store', () => {
      const { result } = renderHook(() => useActiveContainerActions());

      act(() => {
        result.current.setActiveContainer('container-test');
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBe('container-test');

      act(() => {
        result.current.clearActiveContainer();
      });
      expect(useActiveContainerStore.getState().activeContainerId).toBeNull();
    });
  });

  describe('non-React getState access', () => {
    it('exposes state outside React components', () => {
      act(() => {
        useActiveContainerStore.getState().setActiveContainer('outside-react');
      });
      const id = useActiveContainerStore.getState().activeContainerId;
      expect(id).toBe('outside-react');
    });
  });
});
