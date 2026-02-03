# Quick Start: DEV Observability Panels

**Feature**: 038-dev-observability-panels
**Date**: 2026-01-25

## Overview

This feature adds a DEV Diagnostics tab to PiDashboard for operators to quickly assess system health. The implementation follows existing dashboard patterns with React Query hooks, Zod schema validation, and shadcn/ui components.

## Prerequisites

- Node.js 20+ with npm
- PiDashboard development environment set up
- Access to DEV Dokku BridgeServer
- SSH access to PiOrchestrator (for local development)

## Local Development Setup

### 1. Start SSH Tunnel (for API proxy)

```bash
# In terminal 1: SSH tunnel to PiOrchestrator
ssh -L 8082:localhost:8082 pi
```

### 2. Start Development Server

```bash
# In terminal 2: Start Vite dev server
npm run dev
```

### 3. Access Dashboard

Open http://localhost:5173 and navigate to the DEV Diagnostics tab (stethoscope icon).

## Implementation Guide

### Step 1: Create Zod Schemas

Create `src/infrastructure/api/diagnostics-schemas.ts`:

```typescript
import { z } from 'zod';

// Service health status enum
export const ServiceStatusSchema = z.enum([
  'healthy',
  'degraded',
  'unhealthy',
  'timeout',
  'unknown',
]);

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

// Check result for sub-checks
export const CheckResultSchema = z.object({
  status: z.enum(['healthy', 'error']),
  message: z.string().optional(),
});

// Service health response
export const ServiceHealthSchema = z.object({
  service_name: z.string(),
  status: ServiceStatusSchema,
  last_checked: z.string(),
  response_time_ms: z.number().optional(),
  error_message: z.string().optional(),
  checks: z.record(CheckResultSchema).optional(),
});

export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;

// Session status enum
export const SessionStatusSchema = z.enum(['active', 'completed', 'cancelled']);

// Session entity
export const SessionSchema = z.object({
  id: z.string(),
  delivery_id: z.string().optional(),
  started_at: z.string(),
  status: SessionStatusSchema,
  capture_count: z.number().int().min(0),
  last_capture_at: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// Evidence capture entity
export const EvidenceCaptureSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  captured_at: z.string(),
  camera_id: z.string(),
  thumbnail_url: z.string().url(),
  full_url: z.string().url(),
  expires_at: z.string(),
  size_bytes: z.number().optional(),
  content_type: z.string().optional(),
});

export type EvidenceCapture = z.infer<typeof EvidenceCaptureSchema>;
```

### Step 2: Create API Client

Create `src/infrastructure/api/diagnostics.ts`:

```typescript
import { apiClient } from './client';
import { safeParseWithErrors } from './schemas';
import { ServiceHealthSchema, type ServiceHealth } from './diagnostics-schemas';

export const diagnosticsApi = {
  getBridgeServerHealth: async (): Promise<ServiceHealth> => {
    const startTime = performance.now();
    try {
      const response = await apiClient.get('/dashboard/diagnostics/bridgeserver');
      const responseTime = performance.now() - startTime;

      return {
        service_name: 'bridgeserver',
        status: response.status === 'healthy' ? 'healthy' : 'unhealthy',
        last_checked: new Date().toISOString(),
        response_time_ms: responseTime,
        checks: response.checks,
      };
    } catch (error) {
      return {
        service_name: 'bridgeserver',
        status: 'unhealthy',
        last_checked: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Similar implementations for PiOrchestrator and MinIO...
};
```

### Step 3: Create React Query Hooks

Create `src/application/hooks/useDiagnostics.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { diagnosticsApi } from '@/infrastructure/api/diagnostics';
import { queryKeys } from '@/lib/queryClient';

export function useHealthChecks(enabled = true, pollingInterval = 5000) {
  return useQuery({
    queryKey: queryKeys.diagnosticsHealth(),
    queryFn: diagnosticsApi.getAllHealthChecks,
    enabled,
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
  });
}

export function useSessions(enabled = true, pollingInterval = 10000) {
  return useQuery({
    queryKey: queryKeys.diagnosticsSessions(),
    queryFn: diagnosticsApi.getSessions,
    enabled,
    refetchInterval: pollingInterval,
  });
}
```

### Step 4: Create Components

Create `src/presentation/components/diagnostics/DiagnosticsSection.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Stethoscope } from 'lucide-react';
import { useHealthChecks, useSessions } from '@/application/hooks/useDiagnostics';
import { ServiceHealthCard } from './ServiceHealthCard';
import { SessionsPanel } from './SessionsPanel';

export function DiagnosticsSection() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useHealthChecks();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();

  return (
    <div className="space-y-4" data-testid="diagnostics-section">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Service Health
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchHealth()}
            data-testid="refresh-health"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div>Loading health checks...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {health?.services.map((service) => (
                <ServiceHealthCard key={service.service_name} health={service} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SessionsPanel sessions={sessions} isLoading={sessionsLoading} />
    </div>
  );
}
```

### Step 5: Add Tab to App.tsx

Update `src/App.tsx` to include the new tab:

```typescript
import { Stethoscope } from 'lucide-react';
import { DiagnosticsSection } from './presentation/components/diagnostics/DiagnosticsSection';

// In the Tabs component:
<TabsTrigger value="diagnostics" data-testid="tab-diagnostics">
  <Stethoscope className="h-4 w-4" />
</TabsTrigger>

// In TabsContent:
<TabsContent value="diagnostics">
  <ErrorBoundary>
    <DiagnosticsSection />
  </ErrorBoundary>
</TabsContent>
```

## Testing

### Run Unit Tests

```bash
npm test -- tests/unit/api/diagnostics.test.ts
```

### Run Component Tests

```bash
npm test -- tests/component/diagnostics/
```

### Run Contract Tests

```bash
npm test -- tests/integration/contracts/diagnostics.contract.test.ts
```

### Run E2E Tests

```bash
npx playwright test tests/e2e/diagnostics.spec.ts --project=chromium
```

## Key Patterns

### Health Status Color Coding

| Status | Color | Tailwind Class |
|--------|-------|----------------|
| healthy | Green | `text-green-500 bg-green-500/10` |
| degraded | Yellow | `text-yellow-500 bg-yellow-500/10` |
| unhealthy | Red | `text-red-500 bg-red-500/10` |
| timeout | Orange | `text-orange-500 bg-orange-500/10` |
| unknown | Gray | `text-muted-foreground bg-muted` |

### Stale Capture Detection

```typescript
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isStaleCapture(lastCaptureAt: string | undefined): boolean {
  if (!lastCaptureAt) return false;
  const lastCapture = new Date(lastCaptureAt).getTime();
  return Date.now() - lastCapture > STALE_THRESHOLD_MS;
}
```

### Presigned URL Refresh

```typescript
function useEvidenceThumbnail(evidence: EvidenceCapture) {
  const [url, setUrl] = useState(evidence.thumbnail_url);

  useEffect(() => {
    const expiresAt = new Date(evidence.expires_at).getTime();
    const refreshAt = expiresAt - 60000; // Refresh 1 minute before expiry
    const timeout = setTimeout(async () => {
      const newUrl = await diagnosticsApi.refreshPresignedUrl(evidence.id);
      setUrl(newUrl);
    }, refreshAt - Date.now());

    return () => clearTimeout(timeout);
  }, [evidence]);

  return url;
}
```

## File Structure

```
src/
├── infrastructure/api/
│   ├── diagnostics-schemas.ts    # Zod schemas
│   ├── diagnostics.ts            # API client
│   ├── sessions.ts               # Sessions API
│   └── evidence.ts               # Evidence API
├── application/hooks/
│   ├── useDiagnostics.ts         # Health check hooks
│   ├── useSessions.ts            # Session hooks
│   └── useEvidence.ts            # Evidence hooks
└── presentation/components/diagnostics/
    ├── DiagnosticsSection.tsx    # Main tab
    ├── ServiceHealthCard.tsx     # Health indicator
    ├── SessionsPanel.tsx         # Sessions list
    ├── EvidencePanel.tsx         # Evidence gallery
    └── EvidenceThumbnail.tsx     # Thumbnail component

tests/
├── unit/api/
│   └── diagnostics.test.ts
├── component/diagnostics/
│   ├── DiagnosticsSection.test.tsx
│   └── SessionsPanel.test.tsx
├── integration/contracts/
│   └── diagnostics.contract.test.ts
└── e2e/
    └── diagnostics.spec.ts
```

## Documentation

Create `docs/dev-diagnostics.md` for operator documentation covering:
- Accessing the DEV Diagnostics page
- Understanding health indicators
- Troubleshooting service failures
- Session monitoring guide
- Evidence viewing guide
