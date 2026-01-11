/**
 * Contract Test Types
 * Feature: 005-testing-research-and-hardening
 *
 * Types for contract testing infrastructure
 */

import type { z } from 'zod';

/**
 * Track schema validation outcomes
 */
export interface ContractValidationResult {
  endpoint: string;
  schema: string;
  timestamp: string;
  success: boolean;
  errors?: Array<{
    path: string;
    message: string;
    expected: string;
    received: string;
  }>;
  mockData: unknown;
}

/**
 * Map MSW handlers to schemas
 */
export interface MswHandlerContract {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  schema: z.ZodSchema;
  scenarioVariants: string[];
}

/**
 * Contract test options
 */
export interface ContractTestOptions {
  /** Validate response matches schema */
  validateResponse?: boolean;
  /** Validate request body */
  validateRequest?: boolean;
  /** Custom timeout */
  timeout?: number;
}

/**
 * Contract test assertion helpers
 */
export interface ContractAssertions {
  /** Assert mock data matches schema */
  mockMatchesSchema: <T>(
    schema: z.ZodSchema<T>,
    mockData: unknown
  ) => ContractValidationResult;

  /** Assert all scenario variants match schema */
  allVariantsMatchSchema: <T>(
    schema: z.ZodSchema<T>,
    variants: Record<string, unknown>
  ) => ContractValidationResult[];
}
