/**
 * InventoryDeltaTable Component Tests
 * Feature: 047-inventory-delta-viewer (T012)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventoryDeltaTable } from '@/presentation/components/inventory/InventoryDeltaTable';
import { normalizeDelta } from '@/infrastructure/api/inventory-delta-adapter';
import type { DeltaEntry } from '@/domain/types/inventory';
import {
  mockCategorizedDelta,
  mockInventoryRunCategorizedMixed,
} from '../../mocks/inventory-delta-fixtures';
import type { CategorizedDelta } from '@/infrastructure/api/inventory-delta-schemas';

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

// ============================================================================
// Categorized Delta Rendering (Feature 052 — T010)
// ============================================================================

describe('InventoryDeltaTable — Categorized Delta (via normalizeDelta)', () => {
  it('renders all 4 categories from full categorized delta', () => {
    const normalized = normalizeDelta(mockCategorizedDelta)!;
    render(<InventoryDeltaTable delta={normalized} />);

    expect(screen.getByText('Fanta 330ml')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola 330ml')).toBeInTheDocument();
    expect(screen.getByText('Sprite 330ml')).toBeInTheDocument();
    expect(screen.getByText('Unidentified item near bottom shelf')).toBeInTheDocument();
  });

  it('renders correct counts for added items (before=0)', () => {
    const normalized = normalizeDelta(mockCategorizedDelta)!;
    render(<InventoryDeltaTable delta={normalized} />);

    // Fanta added: before=0, after=2, change=+2
    const row0 = screen.getByTestId('delta-row-0');
    expect(row0).toHaveTextContent('0');
    expect(row0).toHaveTextContent('2');
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders correct counts for removed items (after=0)', () => {
    const normalized = normalizeDelta(mockCategorizedDelta)!;
    render(<InventoryDeltaTable delta={normalized} />);

    // Coca-Cola removed: before=2, after=0, change=-2
    const row1 = screen.getByTestId('delta-row-1');
    expect(row1).toHaveTextContent('0');
    expect(row1).toHaveTextContent('-2');
  });

  it('renders changed_qty items with correct before/after', () => {
    const normalized = normalizeDelta(mockCategorizedDelta)!;
    render(<InventoryDeltaTable delta={normalized} />);

    // Sprite changed: before=3, after=1
    const row2 = screen.getByTestId('delta-row-2');
    expect(row2).toHaveTextContent('3');
    expect(row2).toHaveTextContent('1');
  });

  it('renders unknown items with zero counts', () => {
    const normalized = normalizeDelta(mockCategorizedDelta)!;
    render(<InventoryDeltaTable delta={normalized} />);

    const row3 = screen.getByTestId('delta-row-3');
    expect(row3).toHaveTextContent('Unidentified item near bottom shelf');
  });

  it('renders confidence badges for all normalized entries', () => {
    const normalized = normalizeDelta(mockCategorizedDelta)!;
    render(<InventoryDeltaTable delta={normalized} />);

    const badges = screen.getAllByTestId(/confidence-badge-/);
    expect(badges).toHaveLength(4);
    // Fanta 0.88 → High, Coca-Cola 0.95 → High, Sprite 0.85 → High, unknown 0.35 → Low
    expect(badges[0]).toHaveTextContent('High');
    expect(badges[1]).toHaveTextContent('High');
    expect(badges[2]).toHaveTextContent('High');
    expect(badges[3]).toHaveTextContent('Low');
  });

  it('renders changed_qty-only categorized delta correctly', () => {
    const delta = mockInventoryRunCategorizedMixed.delta as CategorizedDelta;
    const normalized = normalizeDelta(delta)!;
    render(<InventoryDeltaTable delta={normalized} />);

    expect(screen.getByText('Coca-Cola 330ml')).toBeInTheDocument();
    expect(screen.getByText('Sprite 330ml')).toBeInTheDocument();
    const rows = screen.getAllByTestId(/delta-row-/);
    expect(rows).toHaveLength(2);
  });

  it('renders empty message for empty categorized delta', () => {
    const emptyCategorized: CategorizedDelta = {
      added: [],
      removed: [],
      changed_qty: [],
      unknown: [],
    };
    const normalized = normalizeDelta(emptyCategorized)!;
    render(<InventoryDeltaTable delta={normalized} />);

    expect(screen.getByTestId('inventory-delta-empty')).toBeInTheDocument();
    expect(screen.getByText('No changes detected')).toBeInTheDocument();
  });
});

// ============================================================================
// T011: Mixed Changes with Sign Formatting and Confidence Tiers
// ============================================================================

describe('InventoryDeltaTable — Mixed Changes Formatting (T011)', () => {
  const mixedDelta: DeltaEntry[] = [
    { name: 'Added Item', before_count: 0, after_count: 3, change: 3, confidence: 0.92 },
    { name: 'Removed Item', before_count: 4, after_count: 0, change: -4, confidence: 0.45 },
    { name: 'Changed Item', before_count: 5, after_count: 8, change: 3, confidence: 0.72 },
  ];

  it('renders positive change with + prefix', () => {
    render(<InventoryDeltaTable delta={mixedDelta} />);
    expect(screen.getAllByText('+3')).toHaveLength(2);
  });

  it('renders negative change with - prefix', () => {
    render(<InventoryDeltaTable delta={mixedDelta} />);
    expect(screen.getByText('-4')).toBeInTheDocument();
  });

  it('renders High confidence badge for >= 0.8', () => {
    render(<InventoryDeltaTable delta={mixedDelta} />);
    expect(screen.getByTestId('confidence-badge-0')).toHaveTextContent('High');
  });

  it('renders Medium confidence badge for 0.5-0.79', () => {
    render(<InventoryDeltaTable delta={mixedDelta} />);
    expect(screen.getByTestId('confidence-badge-2')).toHaveTextContent('Medium');
  });

  it('renders Low confidence badge for < 0.5', () => {
    render(<InventoryDeltaTable delta={mixedDelta} />);
    expect(screen.getByTestId('confidence-badge-1')).toHaveTextContent('Low');
  });
});

// ============================================================================
// T012: Zero-Delta Fixture Rendering
// ============================================================================

describe('InventoryDeltaTable — Zero Delta (T012)', () => {
  it('renders "No change" text for every row when all changes are zero', () => {
    render(<InventoryDeltaTable delta={zeroDelta} />);
    const noChangeElements = screen.getAllByText('No change');
    expect(noChangeElements).toHaveLength(2);
  });

  it('does not render an empty table when zero delta has items', () => {
    render(<InventoryDeltaTable delta={zeroDelta} />);
    expect(screen.queryByTestId('inventory-delta-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('inventory-delta-table')).toBeInTheDocument();
  });

  it('renders "No changes detected" message for truly empty delta', () => {
    render(<InventoryDeltaTable delta={[]} />);
    expect(screen.getByText('No changes detected')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-delta-empty')).toBeInTheDocument();
  });
});
