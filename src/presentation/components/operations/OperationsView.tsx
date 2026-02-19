/**
 * OperationsView Component - Operations Panel
 * Feature: 057-live-ops-viewer (Phase 5)
 *
 * Top-level component composing the operations tab with
 * session list + camera health in split layout, and session detail drill-down.
 */

import { useState } from 'react';
import { SessionListView } from './SessionListView';
import { CameraHealthDashboard } from './CameraHealthDashboard';
import { SessionDetailView } from './SessionDetailView';

export function OperationsView() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  if (selectedSessionId) {
    return (
      <SessionDetailView
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div data-testid="operations-view" className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
      <div className="lg:col-span-2">
        <SessionListView onSessionSelect={setSelectedSessionId} />
      </div>
      <div className="lg:col-span-1">
        <CameraHealthDashboard />
      </div>
    </div>
  );
}
