/**
 * Adaptive Thresholds Hook
 * Auto-calibration integration with system status polling
 */

import { useEffect } from 'react';
import { useSystemStatus } from './useSystemStatus';
import {
  useThresholdsStore,
  CALIBRATION_SAMPLE_INTERVAL_MS,
} from '@/application/stores/thresholds';
import type { PiModel } from '@/domain/types/entities';

/**
 * Hook that provides threshold values and calibration functionality
 * Automatically detects Pi model and calibrates thresholds during initial setup
 */
export function useAdaptiveThresholds() {
  const { data: systemStatus } = useSystemStatus();
  const {
    piModel,
    cpu_warning,
    cpu_critical,
    memory_warning,
    memory_critical,
    temp_warning,
    temp_critical,
    calibratedAt,
    isCalibrating,
    setModel,
    startCalibration,
    addCalibrationSample,
    finishCalibration,
    resetToDefaults,
  } = useThresholdsStore();

  // Detect Pi model from system status and update store
  useEffect(() => {
    if (systemStatus?.pi_model && systemStatus.pi_model !== piModel) {
      setModel(systemStatus.pi_model as PiModel);
    }
  }, [systemStatus?.pi_model, piModel, setModel]);

  // Add calibration samples during calibration
  useEffect(() => {
    if (!isCalibrating || !systemStatus) return;

    // Add sample at interval
    const interval = setInterval(() => {
      addCalibrationSample(systemStatus.cpu_usage, systemStatus.memory_usage);
    }, CALIBRATION_SAMPLE_INTERVAL_MS);

    // Add immediate sample
    addCalibrationSample(systemStatus.cpu_usage, systemStatus.memory_usage);

    return () => clearInterval(interval);
  }, [isCalibrating, systemStatus, addCalibrationSample]);

  /**
   * Get threshold status for a metric value
   */
  const getThresholdStatus = (
    value: number,
    type: 'cpu' | 'memory' | 'temperature'
  ): 'normal' | 'warning' | 'critical' => {
    let warning: number;
    let critical: number;

    switch (type) {
      case 'cpu':
        warning = cpu_warning;
        critical = cpu_critical;
        break;
      case 'memory':
        warning = memory_warning;
        critical = memory_critical;
        break;
      case 'temperature':
        warning = temp_warning;
        critical = temp_critical;
        break;
    }

    if (value >= critical) return 'critical';
    if (value >= warning) return 'warning';
    return 'normal';
  };

  return {
    // Threshold values
    thresholds: {
      cpu: { warning: cpu_warning, critical: cpu_critical },
      memory: { warning: memory_warning, critical: memory_critical },
      temperature: { warning: temp_warning, critical: temp_critical },
    },
    // Status
    piModel,
    calibratedAt,
    isCalibrating,
    // Methods
    startCalibration,
    finishCalibration,
    resetToDefaults,
    getThresholdStatus,
  };
}
