/**
 * Handoff Sentinel - State Management
 * Persistence for tracking handoff detection history
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { HandoffState, HandoffDocument, SeenEntry } from './types.js';
import { calculateContentHash } from './utils.js';

const STATE_FILE = '.handoff-state.json';

/**
 * Get the path to the state file
 */
function getStatePath(): string {
  return path.join(process.cwd(), STATE_FILE);
}

/**
 * Load the detection state from disk
 */
export async function loadState(): Promise<HandoffState> {
  const statePath = getStatePath();

  try {
    const content = await fs.readFile(statePath, 'utf-8');
    const state = JSON.parse(content) as HandoffState;

    // Validate version
    if (state.version !== 1) {
      console.warn(`Warning: State file version ${state.version} may not be compatible`);
    }

    return state;
  } catch {
    // File doesn't exist or is invalid - return empty state
    return {
      version: 1,
      lastRun: '',
      seen: {},
    };
  }
}

/**
 * Save the detection state to disk
 */
export async function saveState(state: HandoffState): Promise<void> {
  const statePath = getStatePath();

  try {
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Silently fail - state persistence is optional
    console.warn('Warning: Could not save handoff state');
  }
}

/**
 * Identify handoffs that are new since the last detection run
 */
export function identifyNewHandoffs(
  handoffs: HandoffDocument[],
  state: HandoffState
): HandoffDocument[] {
  const newHandoffs: HandoffDocument[] = [];

  for (const handoff of handoffs) {
    const id = handoff.frontmatter.handoff_id;
    const seenEntry = state.seen[id];

    if (!seenEntry) {
      // Never seen before
      newHandoffs.push(handoff);
    } else {
      // Check if content changed
      const currentHash = calculateContentHash(handoff.content);
      if (seenEntry.contentHash !== currentHash) {
        newHandoffs.push(handoff);
      }
    }
  }

  return newHandoffs;
}

/**
 * Check if a specific handoff's content has changed since last seen
 */
export function hasContentChanged(
  handoff: HandoffDocument,
  state: HandoffState
): boolean {
  const id = handoff.frontmatter.handoff_id;
  const seenEntry = state.seen[id];

  if (!seenEntry) {
    return true; // Never seen = changed
  }

  const currentHash = calculateContentHash(handoff.content);
  return seenEntry.contentHash !== currentHash;
}

/**
 * Get the entry for a specific handoff from state
 */
export function getSeenEntry(
  handoffId: string,
  state: HandoffState
): SeenEntry | undefined {
  return state.seen[handoffId];
}

/**
 * Clear the state file (useful for testing)
 */
export async function clearState(): Promise<void> {
  const statePath = getStatePath();

  try {
    await fs.unlink(statePath);
  } catch {
    // Ignore if file doesn't exist
  }
}
