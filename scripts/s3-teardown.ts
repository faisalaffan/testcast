/**
 * S3 Teardown - Runs after all Playwright tests complete
 * Auto-uploads test artifacts to S3 and cleans up local files if enabled
 */

import 'dotenv/config';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface TeardownOptions {
  uploadToS3: boolean;
  cleanupLocal: boolean;
  cleanupExceptExcel: boolean;
}

function getTeardownOptions(): TeardownOptions {
  return {
    uploadToS3: process.env.S3_AUTO_UPLOAD === 'true' || process.env.CI === 'true',
    cleanupLocal: process.env.CLEANUP_LOCAL === 'true',
    cleanupExceptExcel: process.env.CLEANUP_EXCEPT_EXCEL !== 'false', // default true
  };
}

async function cleanupTestResults(cleanupExceptExcel: boolean): Promise<void> {
  const testResultsPath = path.resolve(__dirname, '..', 'test-results');

  if (!fs.existsSync(testResultsPath)) {
    console.log('[Cleanup] test-results/ does not exist, skipping cleanup');
    return;
  }

  console.log('[Cleanup] Starting cleanup of test-results/...');

  try {
    const entries = fs.readdirSync(testResultsPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(testResultsPath, entry.name);

      if (entry.isDirectory()) {
        // Always delete all run directories (date-runId format)
        if (entry.name.match(/^\d{4}-\d{2}-\d{2}-\d{3}$/)) {
          fs.rmSync(entryPath, { recursive: true, force: true });
          console.log(`[Cleanup] Deleted: ${entry.name}/`);
          continue;
        }

        // For excel-report, handle based on cleanupExceptExcel
        if (entry.name === 'excel-report') {
          if (cleanupExceptExcel) {
            console.log(`[Cleanup] Preserving: ${entry.name}/ (CLEANUP_EXCEPT_EXCEL=true)`);
          } else {
            fs.rmSync(entryPath, { recursive: true, force: true });
            console.log(`[Cleanup] Deleted: ${entry.name}/`);
          }
          continue;
        }

        // Delete other directories
        fs.rmSync(entryPath, { recursive: true, force: true });
        console.log(`[Cleanup] Deleted: ${entry.name}/`);
      } else if (entry.isFile()) {
        // Delete json results file at root
        if (entry.name === 'playwright-json-results.json') {
          fs.unlinkSync(entryPath);
          console.log(`[Cleanup] Deleted: ${entry.name}`);
        }
      }
    }

    console.log('[Cleanup] test-results/ cleanup completed');
  } catch (error: any) {
    console.error('[Cleanup] Error during test-results/ cleanup:', error.message);
  }
}

async function globalTeardown() {
  const options = getTeardownOptions();

  // If both upload and cleanup are disabled, exit early
  if (!options.uploadToS3 && !options.cleanupLocal) {
    console.log('[Teardown] Both S3 upload and local cleanup are disabled. Skipping...');
    return;
  }

  // Check if AWS credentials are configured (only needed for upload)
  if (
    options.uploadToS3 &&
    (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
  ) {
    console.warn('[Teardown] AWS credentials not configured. Skipping S3 upload...');
    // Still do cleanup if enabled
    if (options.cleanupLocal) {
      await cleanupTestResults(options.cleanupExceptExcel);
    }
    return;
  }

  // Upload to S3 if enabled
  let _uploadSuccess = false;
  if (options.uploadToS3) {
    console.log('[Teardown] Starting S3 upload...');

    _uploadSuccess = await new Promise<boolean>((resolve) => {
      const scriptPath = path.resolve(__dirname, 'upload-to-s3.ts');
      const child = spawn('pnpm', ['exec', 'tsx', scriptPath], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.warn('[Teardown] S3 upload exited with code:', code);
          resolve(false);
        } else {
          console.log('[Teardown] S3 upload completed');
          resolve(true);
        }
      });

      child.on('error', (err) => {
        console.error('[Teardown] Failed to spawn upload script:', err);
        resolve(false);
      });
    });
  }

  // Cleanup local files if enabled
  // Only cleanup test-results/{runId}/ directories (screenshots, videos, traces)
  // Keep playwright-report/ and allure-results/ locally - S3 is backup
  if (options.cleanupLocal) {
    await cleanupTestResults(options.cleanupExceptExcel);
  }
}

export default globalTeardown;
