import { type LDClient, init } from '@launchdarkly/node-server-sdk';
import { test as base } from '@playwright/test';

/**
 * Feature Flags Fixture
 * Provides LaunchDarkly integration for feature flag testing
 */

export interface FeatureFlagFixtures {
  featureFlags: {
    getFlag: (flagKey: string, defaultValue?: unknown) => Promise<unknown>;
    getAllFlags: () => Promise<Record<string, unknown>>;
    setFlagOverride: (flagKey: string, value: unknown) => void;
    clearOverrides: () => void;
  };
  ldClient: LDClient | null;
}

// Flag overrides for testing
const flagOverrides: Map<string, unknown> = new Map();
let ldClient: LDClient | null = null;

export const featureFlagFixture = base.extend<FeatureFlagFixtures>({
  featureFlags: async (_, use) => {
    const clientId = process.env.LD_CLIENT_ID;

    // Initialize LaunchDarkly if configured
    if (clientId && process.env.LD_CLIENT_SECRET) {
      try {
        ldClient = init(clientId);
        await ldClient.waitForInitialization({ timeout: 5000 });
        console.log('[FeatureFlags] LaunchDarkly client initialized');
      } catch {
        console.warn('[FeatureFlags] Could not initialize LaunchDarkly, using overrides only');
      }
    }

    const flags = {
      getFlag: async (flagKey: string, defaultValue: unknown = false): Promise<unknown> => {
        // Check override first
        if (flagOverrides.has(flagKey)) {
          return flagOverrides.get(flagKey);
        }

        // Check LaunchDarkly
        if (ldClient) {
          try {
            const user = {
              key: 'test-user',
              email: 'test@example.com',
            };
            const value = await ldClient.variation(flagKey, user, defaultValue as boolean);
            return value;
          } catch {
            console.warn(`[FeatureFlags] Error getting flag ${flagKey}`);
            return defaultValue;
          }
        }

        // Fallback to environment variable
        const envKey = `FF_${flagKey.toUpperCase().replace(/-/g, '_')}`;
        const envValue = process.env[envKey];
        if (envValue !== undefined) {
          return envValue === 'true' || envValue === '1';
        }

        return defaultValue;
      },

      getAllFlags: async (): Promise<Record<string, unknown>> => {
        if (!ldClient) {
          return Object.fromEntries(flagOverrides);
        }

        try {
          const user = {
            key: 'test-user',
            email: 'test@example.com',
          };
          const allFlags = await ldClient.allFlagsState(user);
          return allFlags.toJSON() as Record<string, unknown>;
        } catch {
          console.warn('[FeatureFlags] Error getting all flags');
          return Object.fromEntries(flagOverrides);
        }
      },

      setFlagOverride: (flagKey: string, value: unknown) => {
        flagOverrides.set(flagKey, value);
        console.log(`[FeatureFlags] Override set: ${flagKey} = ${value}`);
      },

      clearOverrides: () => {
        flagOverrides.clear();
        console.log('[FeatureFlags] All overrides cleared');
      },
    };

    await use(flags);

    // Cleanup
    if (ldClient) {
      await ldClient.close();
      ldClient = null;
    }
    flagOverrides.clear();
  },

  ldClient: async (_, use) => {
    await use(ldClient);
  },
});

/**
 * Helper decorator for tests that require specific flag states
 */
export function withFeatureFlag(flagKey: string, value: unknown) {
  return async (
    { featureFlags }: { featureFlags: FeatureFlagFixtures['featureFlags'] },
    test: () => Promise<void>
  ) => {
    // Store original override if any
    const hadOverride = flagOverrides.has(flagKey);
    const originalValue = flagOverrides.get(flagKey);

    try {
      // Set the override
      featureFlags.setFlagOverride(flagKey, value);
      // Run the test
      await test();
    } finally {
      // Restore original state
      if (hadOverride) {
        featureFlags.setFlagOverride(flagKey, originalValue as boolean);
      } else {
        flagOverrides.delete(flagKey);
      }
    }
  };
}
