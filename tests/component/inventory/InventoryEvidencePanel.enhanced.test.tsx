/**
 * InventoryEvidencePanel Enhanced Tests
 * Feature: 055-session-review-drilldown (T016)
 *
 * Tests for partial evidence states with descriptive placeholder messages.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventoryEvidencePanel } from '@/presentation/components/inventory/InventoryEvidencePanel';
import type { EvidenceImages } from '@/domain/types/inventory';

const beforeOnlyEvidence: EvidenceImages = {
  before_image_url: 'https://example.com/before.jpg',
};

const afterOnlyEvidence: EvidenceImages = {
  after_image_url: 'https://example.com/after.jpg',
};

const bothEvidence: EvidenceImages = {
  before_image_url: 'https://example.com/before.jpg',
  after_image_url: 'https://example.com/after.jpg',
};

describe('InventoryEvidencePanel - Partial Evidence States', () => {
  it('shows "Before image not captured" when before_image_url is missing', () => {
    render(<InventoryEvidencePanel evidence={afterOnlyEvidence} />);

    expect(screen.getByTestId('evidence-before-missing')).toBeInTheDocument();
    expect(screen.getByText('Before image not captured')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-after')).toBeInTheDocument();
  });

  it('shows "After image not captured" when after_image_url is missing', () => {
    render(<InventoryEvidencePanel evidence={beforeOnlyEvidence} />);

    expect(screen.getByTestId('evidence-after-missing')).toBeInTheDocument();
    expect(screen.getByText('After image not captured')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-before')).toBeInTheDocument();
  });

  it('shows overall message when both images missing', () => {
    render(<InventoryEvidencePanel evidence={null} />);

    expect(screen.getByTestId('evidence-no-images')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-no-images')).toHaveTextContent('No evidence images available for this session');
  });

  it('shows both images when both present', () => {
    render(<InventoryEvidencePanel evidence={bothEvidence} />);

    expect(screen.getByTestId('evidence-before')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-after')).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-before-missing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('evidence-after-missing')).not.toBeInTheDocument();
  });
});
