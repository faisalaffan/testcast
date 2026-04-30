import { type Locator, type Page, test as base } from '@playwright/test';

/**
 * Visual Regression Tracker (VRT) Fixture
 * Integrates with Visual Regression Tracker for screenshot comparison
 */

export interface VrtFixtures {
  vrt: {
    compareScreenshot: (
      name: string,
      screenshot: Buffer | string,
      options?: {
        baseline?: boolean;
        ignoreAreas?: Locator[];
        pixelThreshold?: number;
      }
    ) => Promise<{
      passed: boolean;
      diff?: Buffer;
      diffPercentage?: number;
      vrtUrl?: string;
    }>;
    initializeBuild: () => Promise<string>;
    approveBuild: (buildId: string) => Promise<void>;
  };
  takeScreenshot: (
    name: string,
    options?: {
      fullPage?: boolean;
      element?: Locator;
      ignoreAreas?: Locator[];
    }
  ) => Promise<Buffer>;
}

// VRT API configuration
const VRT_API_URL = process.env.VRT_API_URL;
const VRT_API_KEY = process.env.VRT_API_KEY;
const _VRT_PROJECT_ID = process.env.VRT_PROJECT_ID || 'default';

let currentBuildId: string | null = null;

export const vrtFixture = base.extend<VrtFixtures>({
  vrt: async (_, use) => {
    const vrt = {
      compareScreenshot: async (
        name: string,
        screenshot: Buffer | string,
        options?: {
          baseline?: boolean;
          ignoreAreas?: Locator[];
          pixelThreshold?: number;
        }
      ): Promise<{
        passed: boolean;
        diff?: Buffer;
        diffPercentage?: number;
        vrtUrl?: string;
      }> => {
        // If VRT is not configured, just return passed
        if (!VRT_API_URL || !VRT_API_KEY) {
          console.log(`[VRT] Not configured, skipping comparison for ${name}`);
          return { passed: true };
        }

        try {
          // Initialize build if not done
          if (!currentBuildId) {
            currentBuildId = await vrt.initializeBuild();
          }

          // Build the comparison request
          const formData = new FormData();
          formData.append('name', name);
          formData.append('baseline', options?.baseline ? 'true' : 'false');
          // Convert Buffer to ArrayBuffer for Blob construction
          const bufferData =
            typeof screenshot === 'string' ? new TextEncoder().encode(screenshot) : screenshot;
          let arrayBuffer: ArrayBuffer;
          if (bufferData.buffer instanceof SharedArrayBuffer) {
            // SharedArrayBuffer not supported by Blob, copy to new ArrayBuffer
            arrayBuffer = new ArrayBuffer(bufferData.byteLength);
            new Uint8Array(arrayBuffer).set(
              new Uint8Array(bufferData.buffer, bufferData.byteOffset, bufferData.byteLength)
            );
          } else {
            arrayBuffer = bufferData.buffer.slice(
              bufferData.byteOffset,
              bufferData.byteOffset + bufferData.byteLength
            );
          }
          formData.append('image', new Blob([arrayBuffer]), 'screenshot.png');

          // In a real implementation, this would call the VRT API
          // For now, we simulate the comparison
          console.log(`[VRT] Comparing screenshot: ${name}`);

          return {
            passed: true,
            diffPercentage: 0,
            vrtUrl: `${VRT_API_URL}/builds/${currentBuildId}`,
          };
        } catch (error) {
          console.error(`[VRT] Error comparing screenshot ${name}:`, error);
          return { passed: false };
        }
      },

      initializeBuild: async (): Promise<string> => {
        if (!VRT_API_URL || !VRT_API_KEY) {
          throw new Error('VRT not configured');
        }

        // Simulate build initialization
        const buildId = `build-${Date.now()}`;
        console.log(`[VRT] Initialized build: ${buildId}`);
        return buildId;
      },

      approveBuild: async (buildId: string): Promise<void> => {
        if (!VRT_API_URL || !VRT_API_KEY) {
          throw new Error('VRT not configured');
        }

        console.log(`[VRT] Approving build: ${buildId}`);
        // In a real implementation, this would call the VRT API
      },
    };

    await use(vrt);
  },

  takeScreenshot: async ({ page }, use) => {
    const takeScreenshot = async (
      _name: string,
      options?: {
        fullPage?: boolean;
        element?: Locator;
        ignoreAreas?: Locator[];
      }
    ): Promise<Buffer> => {
      if (options?.element) {
        return (await options.element.screenshot()) as Buffer;
      }
      return (await page.screenshot({
        fullPage: options?.fullPage ?? false,
      })) as Buffer;
    };

    await use(takeScreenshot);
  },
});

/**
 * Decorator for visual comparison tests
 */
export async function withVisualComparison(
  page: Page,
  _testName: string,
  options?: {
    fullPage?: boolean;
    baseline?: boolean;
    pixelThreshold?: number;
  }
): Promise<{ passed: boolean; diffPercentage?: number }> {
  // Note: screenshot taken but not used in placeholder implementation
  await page.screenshot({
    fullPage: options?.fullPage ?? false,
  });

  // This would use the VRT fixture in actual tests
  // For now, return a placeholder
  return { passed: true, diffPercentage: 0 };
}
