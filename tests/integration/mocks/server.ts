/**
 * MSW Server Setup (T025)
 * Server instance for Node.js test environment
 */

import { setupServer } from 'msw/node';
import { allHandlers, handlers } from './handlers';

// Create the server instance with all handlers (legacy + V1 + diagnostics)
export const server = setupServer(...allHandlers);

// Export for direct use in tests
export { handlers, allHandlers };
