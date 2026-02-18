/**
 * InventoryDeltaTable Enhanced Tests
 * Feature: 055-session-review-drilldown (T013)
 *
 * Tests for item count badge feature.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventoryDeltaTable } from '@/presentation/components/inventory/InventoryDeltaTable';
import type { DeltaEntry } from '@/domain/types/inventory';

const singleItem: DeltaEntry[] = [
  {
    name: 'Coca-Cola 330ml',
    sku: 'CC330',
    before_count: 10,
    after_count: 8,
    change: -2,
    confidence: 0.95,
    rationale: null,
  },
];

const multipleItems: DeltaEntry[] = [
  {
    name: 'Coca-Cola 330ml',
    sku: 'CC330',
    before_count: 10,
    after_count: 8,
    change: -2,
    confidence: 0.95,
    rationale: null,
  },
  {
    name: 'Water 500ml',
    sku: null,
    before_count: 5,
    after_count: 5,
    change: 0,
    confidence: 0.88,
    rationale: null,
  },
  {
    name: 'Juice 250ml',
    sku: 'JC250',
    before_count: 3,
    after_count: 1,
    change: -2,
    confidence: 0.72,
    rationale: null,
  },
];

describe('InventoryDeltaTable - Item Count Badge', () => {
  it('shows item count badge with correct count for single item', () => {
    render(<InventoryDeltaTable delta={singleItem} />);
    const badge = screen.getByTestId('delta-item-count');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('1 item');
  });

  it('shows item count badge with correct count for multiple items', () => {
    render(<InventoryDeltaTable delta={multipleItems} />);
    const badge = screen.getByTestId('delta-item-count');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('3 items');
  });

  it('does not show item count badge when delta is empty', () => {
    render(<InventoryDeltaTable delta={[]} />);
    expect(screen.queryByTestId('delta-item-count')).not.toBeInTheDocument();
  });
});
