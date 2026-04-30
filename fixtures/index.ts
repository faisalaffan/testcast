// Fixtures Index
// Export all fixtures merged into a single test object

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { type Page, test as base } from '@playwright/test';
import mysql from 'mysql2/promise';
import * as XLSX from 'xlsx';

// ============== TYPE DEFINITIONS ==============
interface AuthFixtures {
  loggedInPage: Page;
  authState: {
    username: string;
    password: string;
    isLoggedIn: boolean;
  };
}

interface DbFixtures {
  dbConnection: mysql.Connection | null;
}

interface FeatureFlagFixtures {
  featureFlags: {
    getFlag: (flagName: string, defaultValue?: boolean) => Promise<boolean>;
    setFlagOverride: (flagName: string, value: boolean) => void;
    clearOverrides: () => void;
  };
}

interface DataFixtures {
  testData: {
    loadFromExcel: (filePath: string, sheetName: string) => Promise<unknown[]>;
    getRecord: (filePath: string, key: string, keyField: string) => Promise<unknown>;
    loadFromCSV: (filePath: string) => Promise<unknown[]>;
  };
}

interface VrtFixtures {
  takeScreenshot: (
    name: string,
    options?: { fullPage?: boolean; threshold?: number }
  ) => Promise<string>;
}

interface TracedStepsFixtures {
  tracedSteps: {
    traceStep: (action: string, fn: () => Promise<void>) => Promise<void>;
    steps: Array<{ action: string; timestamp: Date; status: 'passed' | 'failed' }>;
  };
}

interface S3Fixtures {
  s3Client: S3Client;
  s3Operations: {
    upload: (localPath: string, key: string) => Promise<string>;
    download: (key: string, localPath: string) => Promise<void>;
    getPresignedUrl: (key: string, expiresIn?: number) => Promise<string>;
  };
}

// ============== CONSTANTS ==============
const DEFAULT_USER = process.env.TEST_USERNAME || 'standard_user';
const DEFAULT_PASS = process.env.TEST_PASSWORD || 'secret_sauce';

// ============== FLAG OVERRIDES STORAGE ==============
let flagOverrides: Record<string, boolean> = {};

// ============== S3 CLIENT STORAGE ==============
let s3Client: S3Client | null = null;

// ============== COMBINED FIXTURES ==============
const test = base
  // Auth Fixture
  .extend<AuthFixtures>({
    loggedInPage: async ({ page }, use) => {
      await page.goto('/');
      await page.fill('#user-name', DEFAULT_USER);
      await page.fill('#password', DEFAULT_PASS);
      await page.click('#login-button');
      await page.waitForURL(/\/inventory\.html/, { timeout: 10000 });
      await use(page);
    },
    authState: async ({}, use) => {
      await use({
        username: DEFAULT_USER,
        password: DEFAULT_PASS,
        isLoggedIn: false,
      });
    },
  })
  // Database Fixture
  .extend<DbFixtures>({
    dbConnection: async ({}, use) => {
      let connection: mysql.Connection | null = null;

      if (process.env.DB_HOST) {
        try {
          connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number.parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
          });
          console.log('[DB Fixture] Connected to MySQL database');
        } catch (_error) {
          console.warn('[DB Fixture] Could not connect to database');
        }
      }

      await use(connection);

      if (connection) {
        await connection.end();
      }
    },
  })
  // Feature Flags Fixture
  .extend<FeatureFlagFixtures>({
    featureFlags: [
      async ({}, use) => {
        await use({
          getFlag: async (flagName: string, defaultValue = false): Promise<boolean> => {
            if (flagName in flagOverrides) {
              return flagOverrides[flagName];
            }
            return process.env[`FLAG_${flagName.toUpperCase()}`] === 'true' || defaultValue;
          },
          setFlagOverride: (flagName: string, value: boolean) => {
            flagOverrides[flagName] = value;
          },
          clearOverrides: () => {
            flagOverrides = {};
          },
        });
      },
      { timeout: 0 },
    ],
  })
  // Data Fixture
  .extend<DataFixtures>({
    testData: [
      async ({}, use) => {
        await use({
          loadFromExcel: async (filePath: string, sheetName: string): Promise<unknown[]> => {
            try {
              const workbook = XLSX.readFile(filePath);
              const sheet = workbook.Sheets[sheetName];
              return XLSX.utils.sheet_to_json(sheet);
            } catch (error) {
              console.warn(`[Data Fixture] Could not load Excel file: ${filePath}`, error);
              return [];
            }
          },
          getRecord: async (filePath: string, key: string, keyField: string): Promise<unknown> => {
            try {
              const workbook = XLSX.readFile(filePath);
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(sheet);
              return data.find(
                (row: unknown) => (row as Record<string, unknown>)[keyField] === key
              );
            } catch (error) {
              console.warn(`[Data Fixture] Could not get record from: ${filePath}`, error);
              return null;
            }
          },
          loadFromCSV: async (filePath: string): Promise<unknown[]> => {
            try {
              const workbook = XLSX.readFile(filePath, { type: 'file' });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              return XLSX.utils.sheet_to_json(sheet);
            } catch (error) {
              console.warn(`[Data Fixture] Could not load CSV file: ${filePath}`, error);
              return [];
            }
          },
        });
      },
      { timeout: 0 },
    ],
  })
  // VRT Fixture
  .extend<VrtFixtures>({
    takeScreenshot: async ({ page }, use) => {
      const takeScreenshot = async (
        name: string,
        options?: { fullPage?: boolean; threshold?: number }
      ): Promise<string> => {
        const screenshotDir = 'test-results/vrt-screenshots';
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const fileName = `${name}-${Date.now()}.png`;
        const filePath = path.join(screenshotDir, fileName);
        await page.screenshot({ path: filePath, fullPage: options?.fullPage || false });
        return filePath;
      };

      await use(takeScreenshot);
    },
  })
  // Traced Steps Fixture
  .extend<TracedStepsFixtures>({
    tracedSteps: async ({}, use) => {
      const steps: Array<{
        action: string;
        timestamp: Date;
        status: 'passed' | 'failed';
      }> = [];

      const traceStep = async (action: string, fn: () => Promise<void>) => {
        const startTime = Date.now();
        try {
          await fn();
          steps.push({ action, timestamp: new Date(startTime), status: 'passed' });
        } catch (error) {
          steps.push({ action, timestamp: new Date(startTime), status: 'failed' });
          throw error;
        }
      };

      await use({ traceStep, steps });
    },
  })
  // S3 Fixture
  .extend<S3Fixtures>({
    s3Client: async ({}, use) => {
      const config: any = {
        region: process.env.AWS_REGION || 'us-east-1',
      };

      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
      }

      // Support MinIO/S3-compatible endpoint
      if (process.env.AWS_ENDPOINT) {
        config.endpoint = process.env.AWS_ENDPOINT;
        config.forcePathStyle = true; // Required for MinIO
      }

      if (!process.env.AWS_ACCESS_KEY_ID) {
        console.warn('[S3 Fixture] AWS credentials not configured, skipping...');
        await use(null as any);
        return;
      }

      s3Client = new S3Client(config);
      await use(s3Client);

      // cleanup
      s3Client.destroy();
      s3Client = null;
    },
    s3Operations: async ({ s3Client: client }, use) => {
      // Wait for s3Client to be ready
      const activeClient = client || s3Client;

      const operations = {
        upload: async (localPath: string, key: string): Promise<string> => {
          if (!activeClient) throw new Error('S3 not configured');
          const fs = require('node:fs');
          const buffer = fs.readFileSync(localPath);

          await activeClient.send(
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET || 'testcast-artifacts',
              Key: key,
              Body: buffer,
              ContentType: 'application/octet-stream',
            })
          );

          // Return MinIO or S3 URL based on endpoint
          const baseUrl = process.env.AWS_ENDPOINT
            ? `${process.env.AWS_ENDPOINT}/${process.env.S3_BUCKET || 'testcast-artifacts'}`
            : `https://${process.env.S3_BUCKET || 'testcast-artifacts'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
          return `${baseUrl}/${key}`;
        },

        download: async (key: string, localPath: string): Promise<void> => {
          if (!activeClient) throw new Error('S3 not configured');
          const fs = require('node:fs');
          const response = await activeClient.send(
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET || 'testcast-artifacts',
              Key: key,
            })
          );
          return new Promise((resolve, reject) => {
            const stream = response.Body;
            const writer = fs.createWriteStream(localPath);
            (stream as any).pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        },

        getPresignedUrl: async (key: string, expiresIn = 3600): Promise<string> => {
          if (!activeClient) throw new Error('S3 not configured');
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET || 'testcast-artifacts',
            Key: key,
          });
          return getSignedUrl(activeClient, command, { expiresIn });
        },
      };

      await use(operations);
    },
  });

export { expect } from '@playwright/test';
export { test };
