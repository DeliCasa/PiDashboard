/**
 * Stale Capture Detection Unit Tests
 * Feature: 038-dev-observability-panels (T038)
 *
 * Tests for stale capture utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isStaleCapture,
  STALE_THRESHOLD_MS,
  formatRelativeTime,
  formatTime,
} from '@/lib/diagnostics-utils';

describe('isStaleCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-25T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false for undefined last_capture_at', () => {
    expect(isStaleCapture(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isStaleCapture('')).toBe(false);
  });

  it('should return false for recent capture (< 5 min)', () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    expect(isStaleCapture(oneMinuteAgo)).toBe(false);
  });

  it('should return false for capture exactly 5 minutes ago', () => {
    const exactlyFiveMinutesAgo = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
    expect(isStaleCapture(exactlyFiveMinutesAgo)).toBe(false);
  });

  it('should return true for stale capture (> 5 min)', () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60_000).toISOString();
    expect(isStaleCapture(sixMinutesAgo)).toBe(true);
  });

  it('should return true for capture 10 minutes ago', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(isStaleCapture(tenMinutesAgo)).toBe(true);
  });

  it('should return false for invalid date strings', () => {
    expect(isStaleCapture('invalid-date')).toBe(false);
    expect(isStaleCapture('not-a-date')).toBe(false);
  });

  it('should return false for future timestamps', () => {
    const futureDate = new Date(Date.now() + 60_000).toISOString();
    expect(isStaleCapture(futureDate)).toBe(false);
  });
});

describe('STALE_THRESHOLD_MS', () => {
  it('should be 5 minutes in milliseconds', () => {
    expect(STALE_THRESHOLD_MS).toBe(5 * 60 * 1000);
    expect(STALE_THRESHOLD_MS).toBe(300000);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-25T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format seconds ago', () => {
    const thirtySecsAgo = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTime(thirtySecsAgo)).toBe('30s ago');
  });

  it('should format minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('should format hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('should format to time string for 24+ hours', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
    const result = formatRelativeTime(twoDaysAgo);
    // Should be a time format, not relative
    expect(result).not.toContain('ago');
    expect(result).toMatch(/\d+:\d+/);
  });

  it('should return Unknown for invalid dates', () => {
    expect(formatRelativeTime('invalid')).toBe('Unknown');
  });
});

describe('formatTime', () => {
  it('should format valid timestamp', () => {
    const result = formatTime('2026-01-25T14:30:45Z');
    // Should contain time components
    expect(result).toMatch(/\d+:\d+:\d+/);
  });

  it('should return Invalid time for invalid dates', () => {
    expect(formatTime('not-a-date')).toBe('Invalid time');
  });
});
