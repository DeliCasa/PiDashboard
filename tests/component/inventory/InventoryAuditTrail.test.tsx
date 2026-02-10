/**
 * InventoryAuditTrail Component Tests
 * Feature: 047-inventory-delta-viewer (T026)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventoryAuditTrail } from '@/presentation/components/inventory/InventoryAuditTrail';
import type { Review } from '@/domain/types/inventory';

const overrideReview: Review = {
  reviewer_id: 'operator-1',
  action: 'override',
  corrections: [
    {
      name: 'Coca-Cola 330ml',
      sku: 'CC330',
      original_count: 3,
      corrected_count: 4,
    },
    {
      name: 'Water 500ml',
      sku: null,
      original_count: 0,
      corrected_count: 2,
      added: true,
    },
    {
      name: 'Expired Juice',
      sku: null,
      original_count: 1,
      corrected_count: 0,
      removed: true,
    },
  ],
  notes: 'Adjusted Coca-Cola count, added missed Water bottles.',
  reviewed_at: '2026-02-09T12:05:00Z',
};

const approveReview: Review = {
  reviewer_id: 'operator-2',
  action: 'approve',
  corrections: [],
  notes: '',
  reviewed_at: '2026-02-09T12:10:00Z',
};

const approveWithNotes: Review = {
  reviewer_id: 'operator-3',
  action: 'approve',
  corrections: [],
  notes: 'Looks good, all items verified manually.',
  reviewed_at: '2026-02-09T12:15:00Z',
};

describe('InventoryAuditTrail', () => {
  it('renders reviewer_id and timestamp for reviewed session', () => {
    render(<InventoryAuditTrail review={overrideReview} />);

    expect(screen.getByTestId('audit-trail')).toBeInTheDocument();
    expect(screen.getByTestId('audit-reviewer')).toHaveTextContent('operator-1');
    expect(screen.getByTestId('audit-timestamp')).toBeInTheDocument();
  });

  it('shows "Corrected" badge for override action', () => {
    render(<InventoryAuditTrail review={overrideReview} />);

    expect(screen.getByTestId('audit-action')).toHaveTextContent('Corrected');
  });

  it('shows "Approved" badge for approve action', () => {
    render(<InventoryAuditTrail review={approveReview} />);

    expect(screen.getByTestId('audit-action')).toHaveTextContent('Approved');
  });

  it('shows corrections table for override action', () => {
    render(<InventoryAuditTrail review={overrideReview} />);

    expect(screen.getByTestId('audit-corrections')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola 330ml')).toBeInTheDocument();
    expect(screen.getByText('Water 500ml')).toBeInTheDocument();
    expect(screen.getByText('Expired Juice')).toBeInTheDocument();
  });

  it('shows added indicator for added items', () => {
    render(<InventoryAuditTrail review={overrideReview} />);

    expect(screen.getByText('+ Added')).toBeInTheDocument();
  });

  it('shows removed indicator for removed items', () => {
    render(<InventoryAuditTrail review={overrideReview} />);

    expect(screen.getByText('- Removed')).toBeInTheDocument();
  });

  it('shows "Approved as-is" note for approve action', () => {
    render(<InventoryAuditTrail review={approveReview} />);

    expect(screen.getByTestId('audit-approved-note')).toBeInTheDocument();
    expect(screen.getByText(/Approved as-is/)).toBeInTheDocument();
  });

  it('does not show corrections table for approve action', () => {
    render(<InventoryAuditTrail review={approveReview} />);

    expect(screen.queryByTestId('audit-corrections')).not.toBeInTheDocument();
  });

  it('shows notes when present', () => {
    render(<InventoryAuditTrail review={overrideReview} />);

    expect(screen.getByTestId('audit-notes')).toBeInTheDocument();
    expect(screen.getByText('Adjusted Coca-Cola count, added missed Water bottles.')).toBeInTheDocument();
  });

  it('shows notes for approve action when present', () => {
    render(<InventoryAuditTrail review={approveWithNotes} />);

    expect(screen.getByTestId('audit-notes')).toBeInTheDocument();
    expect(screen.getByText('Looks good, all items verified manually.')).toBeInTheDocument();
  });

  it('does not show notes section when notes is empty', () => {
    render(<InventoryAuditTrail review={approveReview} />);

    expect(screen.queryByTestId('audit-notes')).not.toBeInTheDocument();
  });

  it('renders nothing when review is null', () => {
    const { container } = render(<InventoryAuditTrail review={null} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when review is undefined', () => {
    const { container } = render(<InventoryAuditTrail review={undefined} />);

    expect(container.innerHTML).toBe('');
  });
});
