/**
 * UI State Types
 * Feature: 030-dashboard-recovery
 * Task: T014
 *
 * Type definitions for UI state management.
 */

/**
 * Explicit states for the device list UI.
 * Ensures clear visual distinction between different states.
 */
export type DeviceListState = 'loading' | 'empty' | 'populated' | 'error';

/**
 * Connection state for API connectivity.
 */
export type ConnectionState = 'connected' | 'error' | 'reconnecting' | 'disconnected';
