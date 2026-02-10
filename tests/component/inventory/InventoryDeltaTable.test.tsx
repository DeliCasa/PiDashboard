/**
 * InventoryDeltaTable Component Tests
 * Feature: 047-inventory-delta-viewer (T012)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventoryDeltaTable } from '@/presentation/components/inventory/InventoryDeltaTable';
import type { DeltaEntry } from '@/domain/types/inventory';

const mockDelta: DeltaEntry[] = [
  {
    name: 'Coca-Cola 330ml',
    sku: 'CC330',
    before_count: 5,
    after_count: 3,
    change: -2,
    confidence: 0.92,
    rationale: 'Two cans removed',
  },
  {
    name: 'Sprite 330ml',
    sku: 'SP330',
    before_count: 3,
    after_count: 3,
    change: 0,
    confidence: 0.90,
    rationale: 'No change detected',
  },
  {
    name: 'Water 500ml',
    before_count: 0,
    after_count: 2,
    change: 2,
    confidence: 0.85,
  },
];

const lowConfidenceDelta: DeltaEntry[] = [
  {
    name: 'Unknown Item A',
    before_count: 2,
    after_count: 1,
    change: -1,
    confidence: 0.35,
  },
  {
    name: 'Unknown Item B',
    before_count: 1,
    after_count: 0,
    change: -1,
    confidence: 0.28,
  },
];

const zeroDelta: DeltaEntry[] = [
  {
    name: 'Coca-Cola 330ml',
    sku: 'CC330',
    before_count: 5,
    after_count: 5,
    change: 0,
    confidence: 0.95,
  },
  {
    name: 'Sprite 330ml',
    sku: 'SP330',
    before_count: 3,
    after_count: 3,
    change: 0,
    confidence: 0.90,
  },
];

describe('InventoryDeltaTable', () => {
  it('renders delta rows with item names', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    expect(screen.getByText('Coca-Cola 330ml')).toBeInTheDocument();
    expect(screen.getByText('Sprite 330ml')).toBeInTheDocument();
    expect(screen.getByText('Water 500ml')).toBeInTheDocument();
  });

  it('renders SKU when present', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    expect(screen.getByText('CC330')).toBeInTheDocument();
    expect(screen.getByText('SP330')).toBeInTheDocument();
  });

  it('renders before and after counts', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    // Coca-Cola: before=5, after=3
    const row0 = screen.getByTestId('delta-row-0');
    expect(row0).toHaveTextContent('5');
    expect(row0).toHaveTextContent('3');
  });

  it('renders negative change with minus sign', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    expect(screen.getByText('-2')).toBeInTheDocument();
  });

  it('renders positive change with plus sign', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders confidence badges', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    const badges = screen.getAllByTestId(/confidence-badge-/);
    expect(badges).toHaveLength(3);
    // All items have confidence >= 0.8, so all should be "High"
    expect(badges[0]).toHaveTextContent('High');
    expect(badges[1]).toHaveTextContent('High');
    expect(badges[2]).toHaveTextContent('High');
  });

  it('renders "No change" for zero-change rows when all are zero', () => {
    render(<InventoryDeltaTable delta={zeroDelta} />);

    const noChangeElements = screen.getAllByText('No change');
    expect(noChangeElements).toHaveLength(2);
  });

  it('shows empty message when delta is empty', () => {
    render(<InventoryDeltaTable delta={[]} />);

    expect(screen.getByTestId('inventory-delta-empty')).toBeInTheDocument();
    expect(screen.getByText('No changes detected')).toBeInTheDocument();
  });

  it('shows low confidence banner when average confidence < 0.5', () => {
    render(<InventoryDeltaTable delta={lowConfidenceDelta} />);

    expect(screen.getByTestId('low-confidence-banner')).toBeInTheDocument();
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument();
  });

  it('does not show low confidence banner when average >= 0.5', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    expect(screen.queryByTestId('low-confidence-banner')).not.toBeInTheDocument();
  });

  it('renders Low confidence badge for items below 0.5', () => {
    render(<InventoryDeltaTable delta={lowConfidenceDelta} />);

    const badges = screen.getAllByTestId(/confidence-badge-/);
    expect(badges[0]).toHaveTextContent('Low');
    expect(badges[1]).toHaveTextContent('Low');
  });

  it('has data-testid="inventory-delta-table"', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    expect(screen.getByTestId('inventory-delta-table')).toBeInTheDocument();
  });

  it('renders correct number of rows', () => {
    render(<InventoryDeltaTable delta={mockDelta} />);

    const rows = screen.getAllByTestId(/delta-row-/);
    expect(rows).toHaveLength(3);
  });
});
