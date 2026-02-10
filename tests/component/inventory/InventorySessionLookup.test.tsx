/**
 * InventorySessionLookup Component Tests
 * Feature: 048-inventory-review (T019)
 *
 * Tests input rendering, validation, lookup flow, loading/error states,
 * and clearing behavior.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../../setup/test-utils';
import { InventorySessionLookup } from '@/presentation/components/inventory/InventorySessionLookup';
import { mockInventoryRunNeedsReview } from '../../mocks/inventory-delta-fixtures';

const BASE_URL = '/api';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setupSessionHandler(data: unknown) {
  server.use(
    http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, () => {
      return HttpResponse.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    })
  );
}

function setupNotFoundHandler() {
  server.use(
    http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, () => {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INVENTORY_NOT_FOUND', message: 'Not found', retryable: false },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    })
  );
}

describe('InventorySessionLookup', () => {
  it('renders input field with placeholder and search button', () => {
    renderWithProviders(<InventorySessionLookup onRunFound={vi.fn()} />);

    expect(screen.getByTestId('session-lookup')).toBeInTheDocument();
    expect(screen.getByTestId('session-lookup-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter session ID...')).toBeInTheDocument();
    expect(screen.getByTestId('session-lookup-submit')).toBeInTheDocument();
  });

  it('shows error when submitting empty input', async () => {
    renderWithProviders(<InventorySessionLookup onRunFound={vi.fn()} />);

    await userEvent.click(screen.getByTestId('session-lookup-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('session-lookup-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Please enter a session ID')).toBeInTheDocument();
  });

  it('shows error when submitting whitespace-only input', async () => {
    renderWithProviders(<InventorySessionLookup onRunFound={vi.fn()} />);

    await userEvent.type(screen.getByTestId('session-lookup-input'), '   ');
    await userEvent.click(screen.getByTestId('session-lookup-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('session-lookup-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Please enter a session ID')).toBeInTheDocument();
  });

  it('calls onRunFound when a valid session is found', async () => {
    setupSessionHandler(mockInventoryRunNeedsReview);
    const onRunFound = vi.fn();

    renderWithProviders(<InventorySessionLookup onRunFound={onRunFound} />);

    await userEvent.type(screen.getByTestId('session-lookup-input'), 'sess-test-123');
    await userEvent.click(screen.getByTestId('session-lookup-submit'));

    await waitFor(() => {
      expect(onRunFound).toHaveBeenCalledTimes(1);
    });

    expect(onRunFound).toHaveBeenCalledWith(
      expect.objectContaining({ run_id: mockInventoryRunNeedsReview.run_id })
    );
  });

  it('trims whitespace from session ID before lookup', async () => {
    let capturedSessionId = '';
    server.use(
      http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, ({ params }) => {
        capturedSessionId = params['sessionId'] as string;
        return HttpResponse.json({
          success: true,
          data: mockInventoryRunNeedsReview,
          timestamp: new Date().toISOString(),
        });
      })
    );

    const onRunFound = vi.fn();
    renderWithProviders(<InventorySessionLookup onRunFound={onRunFound} />);

    await userEvent.type(screen.getByTestId('session-lookup-input'), '  sess-test-123  ');
    await userEvent.click(screen.getByTestId('session-lookup-submit'));

    await waitFor(() => {
      expect(onRunFound).toHaveBeenCalledTimes(1);
    });

    expect(capturedSessionId).toBe('sess-test-123');
  });

  it('shows not-found error for invalid session', async () => {
    setupNotFoundHandler();
    const onRunFound = vi.fn();

    renderWithProviders(<InventorySessionLookup onRunFound={onRunFound} />);

    await userEvent.type(screen.getByTestId('session-lookup-input'), 'nonexistent-session');
    await userEvent.click(screen.getByTestId('session-lookup-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('session-lookup-error')).toBeInTheDocument();
    });

    expect(screen.getByText('No inventory analysis found for this session')).toBeInTheDocument();
    expect(onRunFound).not.toHaveBeenCalled();
  });

  it('clears error when input changes', async () => {
    renderWithProviders(<InventorySessionLookup onRunFound={vi.fn()} />);

    // Trigger empty validation error
    await userEvent.click(screen.getByTestId('session-lookup-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('session-lookup-error')).toBeInTheDocument();
    });

    // Type something to clear error
    await userEvent.type(screen.getByTestId('session-lookup-input'), 'a');

    expect(screen.queryByTestId('session-lookup-error')).not.toBeInTheDocument();
  });

  it('disables input while loading', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, async () => {
        await new Promise(() => {}); // Never resolves
      })
    );

    renderWithProviders(<InventorySessionLookup onRunFound={vi.fn()} />);

    await userEvent.type(screen.getByTestId('session-lookup-input'), 'sess-test-123');
    await userEvent.click(screen.getByTestId('session-lookup-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('session-lookup-input')).toBeDisabled();
    });
    expect(screen.getByTestId('session-lookup-submit')).toBeDisabled();
  });
});
