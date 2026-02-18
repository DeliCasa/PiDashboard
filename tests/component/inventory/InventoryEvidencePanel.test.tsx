/**
 * InventoryEvidencePanel Component Tests
 * Feature: 047-inventory-delta-viewer (T018)
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryEvidencePanel } from '@/presentation/components/inventory/InventoryEvidencePanel';
import type { EvidenceImages } from '@/domain/types/inventory';

const fullEvidence: EvidenceImages = {
  before_image_url: 'https://example.com/before.jpg',
  after_image_url: 'https://example.com/after.jpg',
  overlays: {
    before: [
      {
        label: 'Coca-Cola (5)',
        bounding_box: { x: 10, y: 20, width: 50, height: 80 },
        confidence: 0.95,
      },
    ],
    after: [
      {
        label: 'Coca-Cola (3)',
        bounding_box: { x: 10, y: 20, width: 50, height: 80 },
        confidence: 0.92,
      },
    ],
  },
};

const afterOnlyEvidence: EvidenceImages = {
  after_image_url: 'https://example.com/after.jpg',
};

const noOverlayEvidence: EvidenceImages = {
  before_image_url: 'https://example.com/before.jpg',
  after_image_url: 'https://example.com/after.jpg',
};

describe('InventoryEvidencePanel', () => {
  it('renders both images side-by-side with labels', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-before')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-after')).toBeInTheDocument();
  });

  it('renders single image with placeholder for missing before', () => {
    render(<InventoryEvidencePanel evidence={afterOnlyEvidence} />);

    expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-after')).toBeInTheDocument();
    // Before image should not be present, placeholder shown instead
    expect(screen.queryByTestId('evidence-before')).not.toBeInTheDocument();
  });

  it('shows "No evidence images" when evidence is null', () => {
    render(<InventoryEvidencePanel evidence={null} />);

    expect(screen.getByTestId('evidence-no-images')).toBeInTheDocument();
    expect(screen.getByText('No evidence images available for this session')).toBeInTheDocument();
  });

  it('shows "No evidence images" when no URLs present', () => {
    render(<InventoryEvidencePanel evidence={{}} />);

    expect(screen.getByTestId('evidence-no-images')).toBeInTheDocument();
  });

  it('shows overlay toggle when overlays data present', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    expect(screen.getByTestId('overlay-toggle')).toBeInTheDocument();
    expect(screen.getByText('Show overlays')).toBeInTheDocument();
  });

  it('does not show overlay toggle when no overlays data', () => {
    render(<InventoryEvidencePanel evidence={noOverlayEvidence} />);

    expect(screen.queryByTestId('overlay-toggle')).not.toBeInTheDocument();
  });

  it('shows bounding box divs when overlay toggled on', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Initially no overlays visible
    expect(screen.queryByTestId('overlay-before-0')).not.toBeInTheDocument();

    // Toggle overlays on
    fireEvent.click(screen.getByTestId('overlay-toggle'));

    expect(screen.getByTestId('overlay-before-0')).toBeInTheDocument();
    expect(screen.getByTestId('overlay-after-0')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola (5)')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola (3)')).toBeInTheDocument();
  });

  it('opens fullscreen dialog on image click', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Simulate load to show images
    fireEvent.load(screen.getByTestId('evidence-before'));
    fireEvent.load(screen.getByTestId('evidence-after'));

    fireEvent.click(screen.getByTestId('evidence-before'));

    expect(screen.getByTestId('evidence-modal')).toBeInTheDocument();
  });

  it('shows loading skeletons before images load', () => {
    const { container } = render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Skeleton should be present for images that haven't loaded
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('hides skeletons after images load', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Fire load events
    fireEvent.load(screen.getByTestId('evidence-before'));
    fireEvent.load(screen.getByTestId('evidence-after'));

    // Images should be visible (not hidden)
    expect(screen.getByTestId('evidence-before')).not.toHaveClass('hidden');
    expect(screen.getByTestId('evidence-after')).not.toHaveClass('hidden');
  });
});
