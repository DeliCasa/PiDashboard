/**
 * Adaptive Thresholds Store
 * Auto-calibrated health monitoring thresholds based on Pi model
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdaptiveThresholds, PiModel } from '@/domain/types/entities';

// Default thresholds by Pi model
const DEFAULT_THRESHOLDS: Record<PiModel, Omit<AdaptiveThresholds, 'piModel' | 'calibratedAt' | 'baseline_cpu' | 'baseline_memory'>> = {
  pi3: {
    cpu_warning: 80,
    cpu_critical: 95,
    memory_warning: 80,
    memory_critical: 90,
    temp_warning: 75,
    temp_critical: 80,
  },
  pi4: {
    cpu_warning: 80,
    cpu_critical: 95,
    memory_warning: 80,
    memory_critical: 90,
    temp_warning: 75,
    temp_critical: 80,
  },
  pi5: {
    cpu_warning: 85,
    cpu_critical: 95,
    memory_warning: 85,
    memory_critical: 95,
    temp_warning: 80,
    temp_critical: 85,
  },
  unknown: {
    cpu_warning: 80,
    cpu_critical: 95,
    memory_warning: 80,
    memory_critical: 90,
    temp_warning: 70,
    temp_critical: 80,
  },
};

interface ThresholdsState extends AdaptiveThresholds {
  isCalibrating: boolean;
  calibrationSamples: { cpu: number[]; memory: number[] };
  setModel: (model: PiModel) => void;
  startCalibration: () => void;
  addCalibrationSample: (cpu: number, memory: number) => void;
  finishCalibration: () => void;
  resetToDefaults: () => void;
}

const CALIBRATION_DURATION_MS = 60_000; // 60 seconds
const CALIBRATION_SAMPLE_INTERVAL_MS = 5_000; // 5 seconds
const WARNING_OFFSET = 0.4; // warning = baseline + 40%
const CRITICAL_OFFSET = 0.6; // critical = baseline + 60%

/**
 * Adaptive thresholds store with localStorage persistence
 */
export const useThresholdsStore = create<ThresholdsState>()(
  persist(
    (set, get) => ({
      // Default to unknown model
      piModel: 'unknown',
      ...DEFAULT_THRESHOLDS.unknown,
      calibratedAt: '',
      baseline_cpu: undefined,
      baseline_memory: undefined,
      isCalibrating: false,
      calibrationSamples: { cpu: [], memory: [] },

      setModel: (model: PiModel) => {
        const defaults = DEFAULT_THRESHOLDS[model];
        set({
          piModel: model,
          ...defaults,
          calibratedAt: '',
          baseline_cpu: undefined,
          baseline_memory: undefined,
        });
      },

      startCalibration: () => {
        set({
          isCalibrating: true,
          calibrationSamples: { cpu: [], memory: [] },
        });

        // Auto-finish calibration after duration
        setTimeout(() => {
          if (get().isCalibrating) {
            get().finishCalibration();
          }
        }, CALIBRATION_DURATION_MS);
      },

      addCalibrationSample: (cpu: number, memory: number) => {
        if (!get().isCalibrating) return;

        set((state) => ({
          calibrationSamples: {
            cpu: [...state.calibrationSamples.cpu, cpu],
            memory: [...state.calibrationSamples.memory, memory],
          },
        }));
      },

      finishCalibration: () => {
        const { calibrationSamples, piModel } = get();
        const defaults = DEFAULT_THRESHOLDS[piModel];

        // Calculate averages
        const avgCpu =
          calibrationSamples.cpu.length > 0
            ? calibrationSamples.cpu.reduce((a, b) => a + b, 0) /
              calibrationSamples.cpu.length
            : 30; // Default baseline

        const avgMemory =
          calibrationSamples.memory.length > 0
            ? calibrationSamples.memory.reduce((a, b) => a + b, 0) /
              calibrationSamples.memory.length
            : 40; // Default baseline

        // Calculate thresholds: warning = baseline + 40%, critical = baseline + 60%
        // But don't exceed 95% for critical or go below defaults
        const cpuWarning = Math.max(
          defaults.cpu_warning,
          Math.min(90, avgCpu + avgCpu * WARNING_OFFSET)
        );
        const cpuCritical = Math.max(
          defaults.cpu_critical,
          Math.min(95, avgCpu + avgCpu * CRITICAL_OFFSET)
        );
        const memWarning = Math.max(
          defaults.memory_warning,
          Math.min(90, avgMemory + avgMemory * WARNING_OFFSET)
        );
        const memCritical = Math.max(
          defaults.memory_critical,
          Math.min(95, avgMemory + avgMemory * CRITICAL_OFFSET)
        );

        set({
          isCalibrating: false,
          calibrationSamples: { cpu: [], memory: [] },
          baseline_cpu: avgCpu,
          baseline_memory: avgMemory,
          cpu_warning: Math.round(cpuWarning),
          cpu_critical: Math.round(cpuCritical),
          memory_warning: Math.round(memWarning),
          memory_critical: Math.round(memCritical),
          calibratedAt: new Date().toISOString(),
        });
      },

      resetToDefaults: () => {
        const { piModel } = get();
        const defaults = DEFAULT_THRESHOLDS[piModel];
        set({
          ...defaults,
          calibratedAt: '',
          baseline_cpu: undefined,
          baseline_memory: undefined,
          isCalibrating: false,
          calibrationSamples: { cpu: [], memory: [] },
        });
      },
    }),
    {
      name: 'delicasa-thresholds',
      partialize: (state) => ({
        piModel: state.piModel,
        cpu_warning: state.cpu_warning,
        cpu_critical: state.cpu_critical,
        memory_warning: state.memory_warning,
        memory_critical: state.memory_critical,
        temp_warning: state.temp_warning,
        temp_critical: state.temp_critical,
        calibratedAt: state.calibratedAt,
        baseline_cpu: state.baseline_cpu,
        baseline_memory: state.baseline_memory,
      }),
    }
  )
);

export { CALIBRATION_SAMPLE_INTERVAL_MS };
