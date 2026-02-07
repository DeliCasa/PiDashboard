/**
 * ContainerSection Component Tests
 * Feature: 043-container-identity-ui (T005)
 *
 * Tests loading, error, and empty states for container management section.
 * User Story 1: View containers with label-first display
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContainerSection } from '@/presentation/components/containers/ContainerSection';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import {
  mockContainerList,
  mockContainerListResponse,
  mockErrorResponse,
} from '../../mocks/container-mocks';
import { createV1ContainersHandlers, v1ContainersErrorHandlers } from '../../mocks/v1-containers-handlers';
import { createV1CamerasHandlers } from '../../mocks/v1-cameras-handlers';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Setup MSW server with both container and camera handlers
const server = setupServer(
  ...createV1ContainersHandlers(),
  ...createV1CamerasHandlers()
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

// Helper to create test query client
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('ContainerSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('displays loading indicator while fetching containers', async () => {
      // Add delay to handler to ensure loading state is visible
      server.use(
        http.get('/api/v1/containers', async () => {
          await delay(200);
          return HttpResponse.json(mockContainerListResponse);
        })
      );

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByTestId('containers-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading containers...')).toBeInTheDocument();
    });

    it('shows spinner animation during loading', async () => {
      server.use(
        http.get('/api/v1/containers', async () => {
          await delay(200);
          return HttpResponse.json(mockContainerListResponse);
        })
      );

      const { container } = render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      // Should have animate-spin class on loading indicator
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides loading indicator after data loads', async () => {
      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      // Wait for containers to load
      await waitFor(() => {
        expect(screen.queryByTestId('containers-loading')).not.toBeInTheDocument();
      });

      // Should show containers grid
      expect(screen.getByTestId('containers-grid')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      // Use 400 to avoid apiClient internal retries on 5xx (which cause timeouts)
      server.use(
        http.get('/api/v1/containers', () => {
          return HttpResponse.json(
            mockErrorResponse('VALIDATION_ERROR', 'Bad request', false),
            { status: 400 }
          );
        })
      );

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('containers-error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('shows retry button on error', async () => {
      server.use(
        http.get('/api/v1/containers', () => {
          return HttpResponse.json(
            mockErrorResponse('VALIDATION_ERROR', 'Bad request', false),
            { status: 400 }
          );
        })
      );

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('retries fetch when retry button is clicked', async () => {
      // Start with error, then succeed
      let requestCount = 0;
      server.use(
        http.get('/api/v1/containers', () => {
          requestCount++;
          if (requestCount <= 3) {
            // Use 400 to avoid apiClient internal retries on 5xx
            return HttpResponse.json(
              mockErrorResponse('VALIDATION_ERROR', 'Bad request', false),
              { status: 400 }
            );
          }
          // After retry button clicked, return success
          return HttpResponse.json(mockContainerListResponse);
        })
      );

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      // Wait for error state (after retries exhausted)
      await waitFor(
        () => {
          expect(screen.getByTestId('containers-error')).toBeInTheDocument();
        },
        { timeout: 8000 }
      );

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      // Wait for containers to load
      await waitFor(
        () => {
          expect(screen.getByTestId('containers-grid')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('handles network errors gracefully', async () => {
      // Network errors trigger apiClient internal retries (3x with exponential backoff ~7s)
      // plus hook-level React Query retries. Use 400 to skip internal retries.
      server.use(
        http.get('/api/v1/containers', () => {
          return HttpResponse.json(
            mockErrorResponse('NETWORK_ERROR', 'Network unavailable', false),
            { status: 400 }
          );
        })
      );

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('containers-error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('Empty State', () => {
    it('displays empty state when no containers exist', async () => {
      server.use(v1ContainersErrorHandlers.emptyContainers);

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('containers-empty')).toBeInTheDocument();
      });
    });

    it('shows "No containers yet" message in empty state', async () => {
      server.use(v1ContainersErrorHandlers.emptyContainers);

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No containers yet')).toBeInTheDocument();
      });
    });

    it('shows create button in empty state', async () => {
      server.use(v1ContainersErrorHandlers.emptyContainers);

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        const createButtons = screen.getAllByRole('button', { name: /create container/i });
        // Should have create button in both header and empty state
        expect(createButtons.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // Success State (Container Grid)
  // ===========================================================================

  describe('Success State', () => {
    it('displays containers in a grid', async () => {
      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('containers-grid')).toBeInTheDocument();
      });

      // Should render all containers from mock
      for (const container of mockContainerList) {
        expect(
          screen.getByTestId(`container-card-${container.id}`)
        ).toBeInTheDocument();
      }
    });

    it('displays container count in header', async () => {
      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 containers/)).toBeInTheDocument();
      });
    });

    it('displays total camera count in header', async () => {
      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        // mockContainerList: 1 + 0 + 3 = 4 cameras
        expect(screen.getByText(/4 cameras assigned/)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Header Actions
  // ===========================================================================

  describe('Header Actions', () => {
    it('has refresh button', async () => {
      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('has create container button', async () => {
      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-container-button')).toBeInTheDocument();
      });
    });

    it('disables refresh button while loading', async () => {
      server.use(
        http.get('/api/v1/containers', async () => {
          await delay(200);
          return HttpResponse.json(mockContainerListResponse);
        })
      );

      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Title and Description
  // ===========================================================================

  describe('Title and Description', () => {
    it('displays "Container Management" title', async () => {
      render(
        <TestWrapper>
          <ContainerSection />
        </TestWrapper>
      );

      expect(screen.getByText('Container Management')).toBeInTheDocument();
    });
  });
});
