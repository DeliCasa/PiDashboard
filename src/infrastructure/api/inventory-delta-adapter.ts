/**
 * Inventory Delta Adapter
 * Feature: 052-delta-viewer-e2e
 *
 * Normalizes BridgeServer's dual delta format (flat v1.0 / categorized v2.0)
 * into the flat DeltaEntry[] format consumed by InventoryDeltaTable.
 */

import type {
  CategorizedDelta,
  DeltaEntry,
} from './inventory-delta-schemas';

/**
 * Type guard: checks whether a delta value is a CategorizedDelta object
 * (has `added` key) vs. a flat DeltaEntry[] array.
 */
export function isCategorizedDelta(
  delta: DeltaEntry[] | CategorizedDelta | null | undefined
): delta is CategorizedDelta {
  if (delta == null) return false;
  if (Array.isArray(delta)) return false;
  return typeof delta === 'object' && 'added' in delta;
}

/**
 * Converts a CategorizedDelta into a flat DeltaEntry[] for display.
 *
 * Mapping rules (from data-model.md):
 * - added[i]       → { name, before_count: 0, after_count: qty, change: +qty, confidence }
 * - removed[i]     → { name, before_count: qty, after_count: 0, change: -qty, confidence }
 * - changed_qty[i] → { name, before_count: from_qty, after_count: to_qty, change: to_qty - from_qty, confidence }
 * - unknown[i]     → { name: note, before_count: 0, after_count: 0, change: 0, confidence }
 */
function categorizedToFlat(delta: CategorizedDelta): DeltaEntry[] {
  const entries: DeltaEntry[] = [];

  for (const item of delta.added) {
    entries.push({
      name: item.name,
      before_count: 0,
      after_count: item.qty,
      change: item.qty,
      confidence: item.confidence,
    });
  }

  for (const item of delta.removed) {
    entries.push({
      name: item.name,
      before_count: item.qty,
      after_count: 0,
      change: -item.qty,
      confidence: item.confidence,
    });
  }

  for (const item of delta.changed_qty) {
    entries.push({
      name: item.name,
      before_count: item.from_qty,
      after_count: item.to_qty,
      change: item.to_qty - item.from_qty,
      confidence: item.confidence,
    });
  }

  for (const item of delta.unknown) {
    entries.push({
      name: item.note,
      before_count: 0,
      after_count: 0,
      change: 0,
      confidence: item.confidence,
    });
  }

  return entries;
}

/**
 * Normalizes a delta value from the API response into a flat DeltaEntry[].
 *
 * - If null/undefined → returns null (no delta available)
 * - If already a flat array → returns as-is
 * - If categorized object → converts to flat DeltaEntry[]
 */
export function normalizeDelta(
  delta: DeltaEntry[] | CategorizedDelta | null | undefined
): DeltaEntry[] | null {
  if (delta == null) return null;
  if (isCategorizedDelta(delta)) return categorizedToFlat(delta);
  return delta;
}
