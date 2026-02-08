/**
 * Diagnostics Components Index
 * Features: 038-dev-observability-panels, 042-diagnostics-integration
 */

// Feature 038: DEV Observability Panels
export { DiagnosticsSection } from './DiagnosticsSection';
export { ServiceHealthCard } from './ServiceHealthCard';
export { SessionsPanel } from './SessionsPanel';
export { SessionCard } from './SessionCard';
export { EvidencePanel } from './EvidencePanel';
export { EvidenceThumbnail } from './EvidenceThumbnail';
export { EvidencePreviewModal } from './EvidencePreviewModal';

// Feature 042: Camera Diagnostics
export {
  ConnectionQualityBadge,
  ConnectionQualityFromRssi,
} from './ConnectionQualityBadge';

// Re-export utility from lib for backwards compatibility
export { getConnectionQuality } from '@/lib/connection-quality';
export { DiagnosticsPanel } from './DiagnosticsPanel';
export { DiagnosticsUnavailable } from './DiagnosticsUnavailable';
