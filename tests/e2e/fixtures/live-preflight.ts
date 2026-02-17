/**
 * Live E2E Preflight Check Utility
 * Feature: 054-live-dashboard-inventory-validation
 *
 * Probes a real backend to determine whether live tests can proceed.
 * Returns a structured result with skip reasons for clean Playwright output.
 */

export interface PreflightResult {
  canRun: boolean;
  skipReason?: string;
  containerIds: string[];
  baseUrl: string;
  reviewableContainerId?: string;
}

/**
 * Check if a live backend is reachable and has inventory data.
 *
 * Probes:
 * 1. GET /api/v1/containers — reachability + container list
 * 2. GET /api/v1/containers/{id}/inventory/latest — inventory data availability
 *
 * @param baseUrl - The deployment URL to check (e.g., https://raspberrypi.tail345cd5.ts.net)
 * @returns PreflightResult with canRun status and skip reason if applicable
 */
export async function checkLiveBackend(baseUrl: string): Promise<PreflightResult> {
  const fail = (skipReason: string): PreflightResult => ({
    canRun: false,
    skipReason,
    containerIds: [],
    baseUrl,
  });

  // Use LIVE_TEST_CONTAINER_ID if specified
  const targetContainerId = process.env.LIVE_TEST_CONTAINER_ID;

  // Step 1: Check backend reachability via containers endpoint
  let containersResponse: Response;
  try {
    containersResponse = await fetch(`${baseUrl}/api/v1/containers`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return fail(`Backend unreachable at ${baseUrl}`);
  }

  if (containersResponse.status === 404) {
    return fail('Containers API not available (404)');
  }
  if (containersResponse.status === 503) {
    return fail('Backend returned 503 — service unavailable');
  }
  if (!containersResponse.ok) {
    return fail(`Backend returned ${containersResponse.status} on /api/v1/containers`);
  }

  let containersData: { data?: { containers?: Array<{ id: string }> } };
  try {
    containersData = await containersResponse.json();
  } catch {
    return fail('Backend returned invalid JSON on /api/v1/containers');
  }

  const containers = containersData?.data?.containers ?? [];
  if (containers.length === 0) {
    return fail('No containers found');
  }

  const containerIds = containers.map((c) => c.id);

  // If a specific container is targeted, verify it exists
  const checkContainerId = targetContainerId ?? containerIds[0];
  if (targetContainerId && !containerIds.includes(targetContainerId)) {
    return fail(`LIVE_TEST_CONTAINER_ID "${targetContainerId}" not found in container list`);
  }

  // Step 2: Check inventory data availability
  let inventoryResponse: Response;
  try {
    inventoryResponse = await fetch(
      `${baseUrl}/api/v1/containers/${checkContainerId}/inventory/latest`,
      { signal: AbortSignal.timeout(5000) },
    );
  } catch {
    return fail(`Inventory API unreachable for container ${checkContainerId}`);
  }

  if (inventoryResponse.status === 404) {
    return fail(`No inventory data for container ${checkContainerId}`);
  }
  if (!inventoryResponse.ok) {
    return fail(
      `Inventory API returned ${inventoryResponse.status} for container ${checkContainerId}`,
    );
  }

  let inventoryData: { data?: { review?: unknown; status?: string } };
  try {
    inventoryData = await inventoryResponse.json();
  } catch {
    return fail('Inventory API returned invalid JSON');
  }

  // Check if the latest run is reviewable (no review yet, status allows it)
  const run = inventoryData?.data;
  const reviewableStatuses = ['needs_review', 'done'];
  const isReviewable =
    run && run.review === null && reviewableStatuses.includes(run.status ?? '');

  return {
    canRun: true,
    containerIds,
    baseUrl,
    reviewableContainerId: isReviewable ? checkContainerId : undefined,
  };
}
