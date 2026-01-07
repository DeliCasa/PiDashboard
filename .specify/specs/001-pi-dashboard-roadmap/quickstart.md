# Quickstart Guide: Pi Dashboard Development

> **Feature**: 001-pi-dashboard-roadmap
> **Created**: 2026-01-06

---

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- PiOrchestrator running on localhost:8082 (for API proxy)
- Modern browser with Web Bluetooth support (Chrome/Chromium for BLE provisioning)

---

## Quick Setup

```bash
# Clone and enter directory
cd /home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:5173
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |
| `npm test` | Run Vitest tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run storybook` | Start Storybook (when configured) |

---

## Project Structure (Hexagonal Architecture)

Per DeliCasa constitution requirements, this project uses hexagonal architecture:

```
src/
├── domain/                   # Core business logic and entities
│   └── types/
│       ├── entities.ts       # Entity type definitions
│       └── api.ts            # API request/response types
├── application/              # Use cases and business orchestration
│   ├── hooks/                # React Query hooks (use cases)
│   │   ├── useSystemStatus.ts
│   │   ├── useWifi.ts
│   │   ├── useDevices.ts
│   │   ├── useCameras.ts
│   │   ├── useDoor.ts
│   │   ├── useLogs.ts
│   │   ├── useConfig.ts
│   │   ├── useOfflineQueue.ts
│   │   └── useAdaptiveThresholds.ts
│   └── stores/               # Zustand stores (client state)
│       ├── testingMode.ts
│       ├── offlineQueue.ts
│       └── thresholds.ts
├── infrastructure/           # External adapters (HTTP, BLE)
│   ├── api/
│   │   ├── client.ts         # Base fetch wrapper
│   │   ├── system.ts         # System API calls
│   │   ├── wifi.ts           # WiFi API calls
│   │   ├── devices.ts        # Device API calls
│   │   ├── cameras.ts        # Camera API calls
│   │   ├── door.ts           # Door API calls
│   │   ├── logs.ts           # Log API calls
│   │   └── config.ts         # Config API calls
│   └── bluetooth/
│       └── provisioning.ts   # Web Bluetooth provisioning
├── presentation/             # UI components and pages
│   └── components/
│       ├── ui/               # shadcn/ui primitives
│       ├── layout/           # Layout (Header, Nav, Container)
│       ├── wifi/             # WiFi configuration
│       ├── devices/          # ESP32 provisioning
│       ├── cameras/          # Camera management
│       ├── door/             # Door control
│       ├── system/           # System monitoring
│       ├── logs/             # Log viewer
│       ├── config/           # Configuration
│       └── network/          # Network diagnostics
├── lib/                      # Shared utilities
│   ├── utils.ts              # cn() and utilities
│   ├── constants.ts          # App constants
│   └── queryClient.ts        # React Query configuration
├── App.tsx
├── main.tsx
└── index.css
```

**Import Rules (Constitution Compliance):**
- Domain MUST NOT import from infrastructure or presentation
- Application imports from domain only
- Infrastructure imports from domain only
- Presentation imports from domain and application
- Cross-layer imports flow inward: presentation → application → domain

---

## Adding a New Feature

### 1. Create Component

```tsx
// src/presentation/components/feature/FeatureSection.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/presentation/components/ui/card';
import { useFeatureData } from '@/application/hooks/useFeatureData';

interface FeatureSectionProps {
  className?: string;
}

export function FeatureSection({ className }: FeatureSectionProps) {
  const { data, isLoading, error } = useFeatureData();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Feature Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Feature content */}
      </CardContent>
    </Card>
  );
}
```

### 2. Create API Service

```typescript
// src/infrastructure/api/feature.ts
import { apiClient } from './client';
import type { FeatureData } from '@/domain/types/entities';

export const featureApi = {
  getData: () => apiClient.get<FeatureData>('/api/feature'),

  updateData: (data: Partial<FeatureData>) =>
    apiClient.post<{ success: boolean }>('/api/feature', data),
};
```

### 3. Create Custom Hook

```typescript
// src/application/hooks/useFeatureData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureApi } from '@/infrastructure/api/feature';

export function useFeatureData() {
  return useQuery({
    queryKey: ['feature'],
    queryFn: featureApi.getData,
    refetchInterval: 5000, // Poll every 5 seconds if needed
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: featureApi.updateData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature'] });
    },
  });
}
```

### 4. Add to Navigation

```tsx
// Update src/App.tsx or navigation component
<TabsTrigger value="feature">
  <FeatureIcon className="h-4 w-4" />
  <span className="hidden sm:inline">Feature</span>
</TabsTrigger>

<TabsContent value="feature">
  <FeatureSection />
</TabsContent>
```

---

## API Service Layer Pattern

```typescript
// src/infrastructure/api/client.ts
const BASE_URL = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## SSE (Server-Sent Events) Pattern

```typescript
// src/application/hooks/useLogs.ts
import { useEffect, useState, useCallback } from 'react';
import type { LogEntry } from '@/domain/types/entities';

export function useLogStream(level?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = new URL('/api/dashboard/logs/stream', window.location.origin);
    if (level) url.searchParams.set('level', level);

    const eventSource = new EventSource(url);

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs((prev) => [...prev.slice(-499), entry]); // Keep last 500
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [level]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, connected, clearLogs };
}
```

---

## Testing Patterns

### Unit Test (Hook)

```typescript
// src/application/hooks/__tests__/useSystemStatus.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSystemStatus } from '../useSystemStatus';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useSystemStatus', () => {
  it('fetches system status', async () => {
    server.use(
      http.get('/api/system/info', () => {
        return HttpResponse.json({
          cpu_usage: 25,
          memory_usage: 40,
          temperature: 55,
        });
      })
    );

    const { result } = renderHook(() => useSystemStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.cpu_usage).toBe(25);
  });
});
```

### Component Test

```typescript
// src/presentation/components/system/__tests__/SystemStatus.test.tsx
import { render, screen } from '@testing-library/react';
import { SystemStatus } from '../SystemStatus';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('SystemStatus', () => {
  it('displays loading state initially', () => {
    renderWithProviders(<SystemStatus />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

---

## Type Definitions Location

All TypeScript types are in `src/domain/types/`:

- `entities.ts` - Domain entities (SystemStatus, Camera, Door, etc.)
- `api.ts` - API request/response types

Import pattern:
```typescript
import type { SystemStatus, Camera } from '@/domain/types/entities';
import type { ApiResponse, ApiError } from '@/domain/types/api';
```

---

## Environment Variables

Development uses Vite's proxy to forward `/api` requests to PiOrchestrator:

```typescript
// vite.config.ts (already configured)
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8082',
      changeOrigin: true,
    },
  },
}
```

No `.env` file needed for basic development.

---

## Deployment to Pi

```bash
# Build production assets
npm run build

# Copy to Pi
scp -r dist/* pi:/home/pi/PiOrchestrator/web/dashboard/

# Or via rsync for incremental updates
rsync -avz --delete dist/ pi:/home/pi/PiOrchestrator/web/dashboard/
```

---

## Troubleshooting

### API 404 Errors
- Ensure PiOrchestrator is running on port 8082
- Check Vite proxy configuration in `vite.config.ts`

### Web Bluetooth Not Working
- Use Chrome/Chromium browser
- Check browser permissions for Bluetooth
- Fallback: Use backend provisioning via `/api/devices/:address/provision`

### HMR Not Updating
- Clear browser cache
- Restart Vite dev server

### TypeScript Errors
- Run `npm run type-check` for full error list
- Ensure strict mode is enabled in `tsconfig.json`
