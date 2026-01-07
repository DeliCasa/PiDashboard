/**
 * Testing Mode Store
 * Client-side state for door testing mode with 5-minute auto-expire
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestingMode } from '@/domain/types/entities';

const TESTING_MODE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface TestingModeState extends TestingMode {
  activate: () => void;
  deactivate: () => void;
  incrementOperations: () => void;
  checkExpiry: () => void;
}

/**
 * Testing mode store with localStorage persistence
 */
export const useTestingModeStore = create<TestingModeState>()(
  persist(
    (set, get) => ({
      active: false,
      activatedAt: '',
      expiresAt: '',
      operationCount: 0,

      activate: () => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + TESTING_MODE_DURATION_MS);

        set({
          active: true,
          activatedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          operationCount: 0,
        });

        // Schedule auto-deactivation
        setTimeout(() => {
          get().checkExpiry();
        }, TESTING_MODE_DURATION_MS);
      },

      deactivate: () => {
        set({
          active: false,
          activatedAt: '',
          expiresAt: '',
          operationCount: 0,
        });
      },

      incrementOperations: () => {
        set((state) => ({
          operationCount: state.operationCount + 1,
        }));
      },

      checkExpiry: () => {
        const { active, expiresAt } = get();
        if (active && expiresAt) {
          const now = new Date();
          const expiry = new Date(expiresAt);
          if (now >= expiry) {
            get().deactivate();
          }
        }
      },
    }),
    {
      name: 'delicasa-testing-mode',
      // Check expiry on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.checkExpiry();
        }
      },
    }
  )
);

/**
 * Get remaining time in testing mode (ms)
 */
export function getRemainingTime(expiresAt: string): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const expiry = new Date(expiresAt);
  return Math.max(0, expiry.getTime() - now.getTime());
}

/**
 * Format remaining time as MM:SS
 */
export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
