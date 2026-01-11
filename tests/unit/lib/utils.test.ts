/**
 * Utility Function Tests (T051)
 * Tests for cn() class merge utility
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() utility function (T051)', () => {
  describe('basic class merging', () => {
    it('should merge multiple class strings', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle single class', () => {
      const result = cn('single-class');
      expect(result).toBe('single-class');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle empty strings', () => {
      const result = cn('class1', '', 'class2');
      expect(result).toBe('class1 class2');
    });
  });

  describe('conditional classes', () => {
    it('should filter falsy values', () => {
      const shouldInclude = false;
      const result = cn('class1', shouldInclude && 'class2', 'class3');
      expect(result).toBe('class1 class3');
    });

    it('should include truthy conditional values', () => {
      const shouldInclude = true;
      const result = cn('class1', shouldInclude && 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle null values', () => {
      const result = cn('class1', null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle undefined values', () => {
      const result = cn('class1', undefined, 'class2');
      expect(result).toBe('class1 class2');
    });
  });

  describe('Tailwind class merging', () => {
    it('should merge conflicting padding classes (tw-merge)', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });

    it('should merge conflicting margin classes', () => {
      const result = cn('m-4', 'm-2');
      expect(result).toBe('m-2');
    });

    it('should merge conflicting text size classes', () => {
      const result = cn('text-sm', 'text-lg');
      expect(result).toBe('text-lg');
    });

    it('should merge conflicting background color classes', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });

    it('should preserve non-conflicting classes', () => {
      const result = cn('p-4', 'm-2', 'text-lg');
      expect(result).toBe('p-4 m-2 text-lg');
    });

    it('should handle mixed conflicting and non-conflicting classes', () => {
      const result = cn('p-4', 'p-2', 'm-4', 'text-lg');
      expect(result).toBe('p-2 m-4 text-lg');
    });

    it('should preserve flex utilities', () => {
      const result = cn('flex', 'items-center', 'justify-between');
      expect(result).toBe('flex items-center justify-between');
    });

    it('should handle responsive variants', () => {
      const result = cn('md:p-4', 'lg:p-6');
      expect(result).toBe('md:p-4 lg:p-6');
    });
  });

  describe('object syntax (clsx feature)', () => {
    it('should handle object syntax for conditional classes', () => {
      const result = cn({ 'class-a': true, 'class-b': false, 'class-c': true });
      expect(result).toBe('class-a class-c');
    });

    it('should combine object and string syntax', () => {
      const result = cn('base-class', { conditional: true });
      expect(result).toBe('base-class conditional');
    });

    it('should handle nested arrays', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });
  });

  describe('real-world use cases', () => {
    it('should handle button variant classes', () => {
      const isActive = true;
      const isDisabled = false;

      const result = cn(
        'px-4 py-2 rounded',
        isActive && 'bg-primary text-white',
        isDisabled && 'opacity-50 cursor-not-allowed'
      );

      expect(result).toBe('px-4 py-2 rounded bg-primary text-white');
    });

    it('should handle card component classes', () => {
      const result = cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        'p-6' // override default padding
      );

      expect(result).toBe('rounded-lg border bg-card text-card-foreground shadow-sm p-6');
    });
  });
});
