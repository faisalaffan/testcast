/**
 * Upload Test Artifacts to S3
 *
 * This script uploads allure-results and playwright-report to S3
 * for CI/CD pipeline artifact storage.
 *
 * Usage: npx tsx scripts/upload-to-s3.ts
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  BucketLocationConstraint,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

interface UploadConfig {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  project: string;
  branch: string;
  buildId: string;
}

interface UploadResult {
  key: string;
  url: string;
  success: boolean;
  error?: string;
}

const DEFAULT_CONFIG: UploadConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: (process.env.S3_BUCKET || 'kangaroo-health-test-artifacts').replace(/^\//, ''),
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.AWS_ENDPOINT,
  project: process.env.CI_PROJECT_NAME || 'e2e-playwright',
  branch: process.env.CI_COMMIT_REF_NAME || 'local',
  buildId: process.env.CI_PIPELINE_ID || `local-${Date.now()}`,
};

function getS3Client(config: UploadConfig): S3Client {
  const clientConfig: any = {
    region: config.region,
  };

  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  }

  // Support MinIO/S3-compatible endpoint
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    clientConfig.forcePathStyle = true; // Required for MinIO
  }

  return new S3Client(clientConfig);
}

function getBaseKey(config: UploadConfig): string {
  return `artifacts/${config.project}/${config.branch}/${config.buildId}`;
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function uploadFile(
  client: S3Client,
  config: UploadConfig,
  localPath: string,
  remoteKey: string,
  contentType = 'application/octet-stream'
): Promise<UploadResult> {
  try {
    if (!fs.existsSync(localPath)) {
      return {
        key: remoteKey,
        url: '',
        success: false,
        error: `File not found: ${localPath}`,
      };
    }

    const fileContent = fs.readFileSync(localPath);

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: remoteKey,
        Body: fileContent,
        ContentType: contentType,
      })
    );

    const url = config.endpoint
      ? `${config.endpoint}/${config.bucket}/${remoteKey}`
      : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${remoteKey}`;

    console.log(`[S3] Uploaded: ${localPath} -> ${remoteKey}`);

    return {
      key: remoteKey,
      url,
      success: true,
    };
  } catch (error: any) {
    console.error(`[S3] Failed to upload ${localPath}:`, error.message);
    return {
      key: remoteKey,
      url: '',
      success: false,
      error: error.message,
    };
  }
}

async function uploadDirectory(
  client: S3Client,
  config: UploadConfig,
  localDir: string,
  baseKey: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  if (!(await directoryExists(localDir))) {
    console.warn(`[S3] Directory not found: ${localDir}`);
    return results;
  }

  const files = fs.readdirSync(localDir, { withFileTypes: true });

  for (const file of files) {
    const localPath = path.join(localDir, file.name);
    const remoteKey = `${baseKey}/${file.name}`;

    if (file.isDirectory()) {
      const subResults = await uploadDirectory(client, config, localPath, remoteKey);
      results.push(...subResults);
    } else {
      const contentType = file.name.endsWith('.html')
        ? 'text/html'
        : file.name.endsWith('.json')
          ? 'application/json'
          : 'application/octet-stream';

      const result = await uploadFile(client, config, localPath, remoteKey, contentType);
      results.push(result);
    }
  }

  return results;
}

async function ensureBucketExists(
  client: S3Client,
  bucket: string,
  region: string
): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`[S3] Bucket ${bucket} does not exist, creating...`);
      try {
        const createParams: {
          Bucket: string;
          CreateBucketConfiguration?: { LocationConstraint: BucketLocationConstraint };
        } = {
          Bucket: bucket,
        };
        if (region !== 'us-east-1') {
          createParams.CreateBucketConfiguration = {
            LocationConstraint: region as BucketLocationConstraint,
          };
        }
        await client.send(new CreateBucketCommand(createParams));
        console.log(`[S3] Bucket ${bucket} created successfully`);
        return true;
      } catch (createError: any) {
        console.error('[S3] Failed to create bucket:', createError.message);
        return false;
      }
    }
    console.warn('[S3] Could not verify bucket exists:', error.message);
    return true; // Continue anyway, may be permission issue
  }
}

async function main() {
  console.log('===========================================');
  console.log('  S3 Artifact Upload Script');
  console.log('===========================================');
  console.log('');

  const config = DEFAULT_CONFIG;

  // Check if auto-upload is enabled (skip in CI where it's handled separately)
  const autoUploadEnabled = process.env.S3_AUTO_UPLOAD === 'true';
  const isCI = process.env.CI === 'true';

  if (!autoUploadEnabled && !isCI) {
    console.log('[S3] Auto-upload is disabled. Set S3_AUTO_UPLOAD=true in .env to enable.');
    console.log('[S3] Skipping S3 upload...');
    return;
  }

  // Check if AWS credentials are configured
  if (!config.accessKeyId || !config.secretAccessKey) {
    console.warn(
      '[S3] AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
    );
    console.warn('[S3] Skipping S3 upload...');
    return;
  }

  console.log(`[Config] Region: ${config.region}`);
  console.log(`[Config] Bucket: ${config.bucket}`);
  console.log(`[Config] Project: ${config.project}`);
  console.log(`[Config] Branch: ${config.branch}`);
  console.log(`[Config] Build ID: ${config.buildId}`);
  console.log('');

  const client = getS3Client(config);

  // Ensure bucket exists (create if needed)
  await ensureBucketExists(client, config.bucket, config.region);

  const baseKey = getBaseKey(config);
  const results: UploadResult[] = [];

  // Upload allure-results
  const allureResultsPath = path.resolve(process.cwd(), 'allure-results');
  if (await directoryExists(allureResultsPath)) {
    console.log('[S3] Uploading allure-results...');
    const allureKey = `${baseKey}/allure-results`;
    const allureResults = await uploadDirectory(client, config, allureResultsPath, allureKey);
    results.push(...allureResults);
  } else {
    console.warn('[S3] allure-results directory not found, skipping...');
  }

  // Upload playwright-report
  const playwrightReportPath = path.resolve(process.cwd(), 'playwright-report');
  if (await directoryExists(playwrightReportPath)) {
    console.log('[S3] Uploading playwright-report...');
    const reportKey = `${baseKey}/playwright-report`;
    const reportResults = await uploadDirectory(client, config, playwrightReportPath, reportKey);
    results.push(...reportResults);
  } else {
    console.warn('[S3] playwright-report directory not found, skipping...');
  }

  // Upload test-results/excel-report
  const excelReportPath = path.resolve(process.cwd(), 'test-results', 'excel-report');
  if (await directoryExists(excelReportPath)) {
    console.log('[S3] Uploading test-results/excel-report...');
    const excelKey = `${baseKey}/test-results/excel-report`;
    const excelResults = await uploadDirectory(client, config, excelReportPath, excelKey);
    results.push(...excelResults);
  } else {
    console.warn('[S3] test-results/excel-report not found, skipping...');
  }

  // Upload test-results/playwright-json-results.json
  const jsonResultsPath = path.resolve(
    process.cwd(),
    'test-results',
    'playwright-json-results.json'
  );
  if (fs.existsSync(jsonResultsPath)) {
    console.log('[S3] Uploading test-results/playwright-json-results.json...');
    const jsonKey = `${baseKey}/test-results/playwright-json-results.json`;
    const jsonResult = await uploadFile(
      client,
      config,
      jsonResultsPath,
      jsonKey,
      'application/json'
    );
    results.push(jsonResult);
  } else {
    console.warn('[S3] test-results/playwright-json-results.json not found, skipping...');
  }

  // Summary
  console.log('');
  console.log('===========================================');
  console.log('  Upload Summary');
  console.log('===========================================');

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`Total files: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) {
    console.log('');
    console.log('Failed uploads:');
    for (const r of results.filter((r) => !r.success)) {
      console.log(`  - ${r.key}: ${r.error}`);
    }
  }

  // Generate summary URL
  const baseUrl = config.endpoint
    ? `${config.endpoint}/${config.bucket}`
    : `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
  const _summaryUrl = `${baseUrl}/${baseKey}/index.html`;
  console.log('');
  console.log(`[S3] Base artifacts URL: ${baseUrl}/${baseKey}/`);

  // Return exit code based on success
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('[S3] Fatal error:', error);
  process.exit(1);
});
