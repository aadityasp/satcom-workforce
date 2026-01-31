/**
 * E2E Test Setup
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Global beforeAll/afterAll hooks
beforeAll(async () => {
  // Setup test database connection
  console.log('Setting up E2E tests...');
});

afterAll(async () => {
  // Cleanup
  console.log('Cleaning up E2E tests...');
});
