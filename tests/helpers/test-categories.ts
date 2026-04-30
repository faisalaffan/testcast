// Test category tags for smoke/sanity/regression gating
export const TestTags = {
  CRITICAL: '@critical',
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  SANITY: '@sanity',
  FLAKY: '@flaky',
} as const;

// Test priority levels
export const TestPriority = {
  P0_CRITICAL: 'P0', // Core flows - always run
  P1_HIGH: 'P1', // Important features
  P2_MEDIUM: 'P2', // Standard features
  P3_LOW: 'P3', // Edge cases
} as const;
