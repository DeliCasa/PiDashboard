/**
 * MSW Server Setup (T025)
 * Server instance for Node.js test environment
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the server instance with default handlers
export const server = setupServer(...handlers);

// Export for direct use in tests
export { handlers };
