export const flakyConfig = {
  // Number of retries for flaky tests
  maxRetries: 2,

  // Threshold before moving test to @flaky quarantine
  quarantineThreshold: 3,

  // Delay between retries in ms
  retryDelay: 1000,

  // Pattern for quarantined tests
  quarantinedPattern: /@flaky/,
} as const;

// Decorator-like helper for marking flaky tests
export function flaky(maxRetries: number = flakyConfig.maxRetries) {
  return (target: Function) => {
    // Attach metadata for test runner to read
    (target as any).__flaky = true;
    (target as any).__maxRetries = maxRetries;
    return target;
  };
}
