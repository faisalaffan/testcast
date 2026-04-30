/**
 * Enterprise Excel Report Generator for Playwright E2E Tests
 *
 * Reads Playwright JSON output and generates structured Excel report with:
 * - Executive Summary
 * - Test Results Detail (per-TC, per-browser)
 * - Browser Matrix
 * - Flaky History
 * - Coverage Map
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import XLSX from 'xlsx';

// Types
interface TestResult {
  id: string;
  title: string;
  suite: string;
  browser: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  tags: string[];
  error?: string;
  retry: number;
  location: string;
  tracePath?: string;
  screenshotPath?: string;
}

interface RunMetadata {
  runId: string;
  environment: string;
  branch: string;
  triggeredBy: string;
  commitSha: string;
  timestamp: string;
  browsers: string[];
  totalDuration: number;
}

interface FlakyRecord {
  testId: string;
  runs: boolean[]; // true = passed, false = failed
}

// Configuration
const PLAYWRIGHT_JSON = 'reports/test-results/playwright-json-results.json';
const HISTORY_FILE = '.test-flaky-history.json';
const OUTPUT_DIR = 'test-results/excel-report';
const ENV_NAME = process.env.TEST_ENV || 'Staging';
const BRANCH_NAME = process.env.CI_COMMIT_REF_NAME || process.env.GIT_BRANCH || 'local';
const TRIGGERED_BY = process.env.CI_PIPELINE_URL ? 'GitLab CI' : 'Local';
const COMMIT_SHA = process.env.CI_COMMIT_SHA || 'local';

function generateRunId(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const runNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${dateStr}-${runNum}`;
}

function loadFlakyHistory(): Record<string, FlakyRecord> {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveFlakyHistory(history: Record<string, FlakyRecord>) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function updateFlakyHistory(testId: string, passed: boolean): FlakyRecord {
  const history = loadFlakyHistory();

  if (!history[testId]) {
    history[testId] = { testId, runs: [] };
  }

  // Add current result
  history[testId].runs.push(passed);

  // Keep only last 10 runs
  if (history[testId].runs.length > 10) {
    history[testId].runs = history[testId].runs.slice(-10);
  }

  saveFlakyHistory(history);
  return history[testId];
}

function extractTcId(title: string): string {
  const match = title.match(/(TC-\d+[a-z]?)/i);
  return match ? match[1] : title.substring(0, 20);
}

interface JsonSpec {
  title: string;
  ok: boolean;
  tags: string[];
  tests: Array<{
    results: Array<{
      status: string;
      duration: number;
      errors: Array<{ message: string }>;
      retry: number;
      projectName: string;
      attachments: Array<{ name: string; path?: string }>;
    }>;
  }>;
}

interface JsonSuite {
  title: string;
  file?: string;
  suites?: JsonSuite[];
  specs?: JsonSpec[];
}

function parseSuites(suites: JsonSuite[], browser: string, testResults: TestResult[]): void {
  for (const suite of suites) {
    const suiteName = suite.title || 'Root';

    // Handle specs (actual test cases)
    if (suite.specs) {
      for (const spec of suite.specs) {
        const tags = spec.tags || [];

        for (const test of spec.tests) {
          for (const result of test.results) {
            const status = result.status as TestResult['status'];
            const error = result.errors.length > 0 ? result.errors[0].message : undefined;

            const traceAttachment = result.attachments.find((a) => a.name === 'trace');
            const screenshotAttachment = result.attachments.find((a) => a.name === 'screenshot');

            const testResult: TestResult = {
              id: extractTcId(spec.title),
              title: spec.title,
              suite: suiteName,
              browser: result.projectName || browser,
              status,
              duration: result.duration,
              tags,
              error,
              retry: result.retry,
              location: suite.file || '',
              tracePath: traceAttachment?.path,
              screenshotPath: screenshotAttachment?.path,
            };

            testResults.push(testResult);

            // Update flaky history
            updateFlakyHistory(`${suite.file}::${spec.title}`, status === 'passed');
          }
        }
      }
    }

    // Recurse into nested suites
    if (suite.suites) {
      parseSuites(suite.suites, browser, testResults);
    }
  }
}

function generateReport() {
  console.log('[Enterprise Reporter] Starting report generation...');

  // Read Playwright JSON results
  let jsonData: any;
  try {
    jsonData = JSON.parse(fs.readFileSync(PLAYWRIGHT_JSON, 'utf-8'));
  } catch (e) {
    console.error('[Enterprise Reporter] Error reading JSON results:', e);
    console.log('[Enterprise Reporter] Please run: npx playwright test');
    return;
  }

  const stats = jsonData.stats || {};
  const suites = jsonData.suites || [];
  const browsers = new Set<string>();

  // Extract unique browsers from JSON
  if (jsonData.config?.projects) {
    for (const p of jsonData.config.projects) {
      if (p.name) browsers.add(p.name);
    }
  }

  const metadata: RunMetadata = {
    runId: generateRunId(),
    environment: ENV_NAME,
    branch: BRANCH_NAME,
    triggeredBy: TRIGGERED_BY,
    commitSha: COMMIT_SHA.substring(0, 8),
    timestamp: new Date().toISOString(),
    browsers: Array.from(browsers),
    totalDuration: stats.duration || 0,
  };

  // Parse all test results
  const testResults: TestResult[] = [];
  parseSuites(suites, 'unknown', testResults);

  // Sort by TC ID (extract numeric part for proper ordering)
  testResults.sort((a, b) => {
    const numA = Number.parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = Number.parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // ============ SHEET 1: Executive Summary ============
  const passedCount = testResults.filter((t) => t.status === 'passed').length;
  const failedCount = testResults.filter((t) => t.status === 'failed').length;
  const flakyCount = testResults.filter((t) => {
    const history = loadFlakyHistory()[`${t.location}::${t.title}`];
    return history && history.runs.filter((r: boolean) => !r).length >= 3;
  }).length;
  const passRate =
    testResults.length > 0 ? ((passedCount / testResults.length) * 100).toFixed(1) : '0';

  const execSummary = [
    ['E2E TEST EXECUTION REPORT'],
    [],
    ['Run ID', metadata.runId],
    ['Environment', metadata.environment],
    ['Branch', metadata.branch],
    ['Triggered By', metadata.triggeredBy],
    ['Commit SHA', metadata.commitSha],
    ['Timestamp', metadata.timestamp],
    [],
    ['SUMMARY'],
    ['Total Test Cases', testResults.length],
    ['Passed', `${passedCount} (${passRate}%)`],
    ['Failed', failedCount],
    ['Flaky', flakyCount],
    ['Skipped', testResults.filter((t) => t.status === 'skipped').length],
    ['Total Duration', `${(metadata.totalDuration / 1000).toFixed(1)}s`],
    ['Browsers Tested', metadata.browsers.join(', ')],
  ];

  const execSheet = XLSX.utils.aoa_to_sheet(execSummary);
  execSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, execSheet, '📊 Executive Summary');

  // ============ SHEET 2: Test Results Detail ============
  const detailHeaders = [
    'TC ID',
    'Suite',
    'Title',
    'Browser',
    'Status',
    'Duration (ms)',
    'Tags',
    'Error Message',
    'Trace URL',
    'Retries',
  ];
  const detailData: (string | number | null)[][] = [detailHeaders];

  for (const t of testResults) {
    detailData.push([
      String(t.id),
      String(t.suite),
      String(t.title),
      String(t.browser),
      String(t.status.toUpperCase()),
      t.duration,
      t.tags.join(', '),
      t.error || '',
      t.tracePath ? path.basename(t.tracePath) : '',
      t.retry,
    ]);
  }

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet['!cols'] = [
    { wch: 12 }, // TC ID
    { wch: 25 }, // Suite
    { wch: 50 }, // Title
    { wch: 12 }, // Browser
    { wch: 10 }, // Status
    { wch: 12 }, // Duration
    { wch: 20 }, // Tags
    { wch: 50 }, // Error
    { wch: 25 }, // Trace
    { wch: 8 }, // Retries
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, '📋 Test Results Detail');

  // ============ SHEET 3: Browser Matrix ============
  const matrixHeaders = ['TC ID', 'Suite', 'Chromium', 'Firefox', 'WebKit', 'Consistent?', 'Notes'];
  const matrixData = [matrixHeaders];

  // Group by TC ID
  const tcGroups = new Map<string, TestResult[]>();
  for (const t of testResults) {
    if (!tcGroups.has(t.id)) {
      tcGroups.set(t.id, []);
    }
    tcGroups.get(t.id)?.push(t);
  }

  for (const [tcId, tests] of tcGroups) {
    const byBrowser = new Map<string, string>();
    let suite = '';

    for (const t of tests) {
      byBrowser.set(
        t.browser,
        t.status === 'passed' ? 'PASS' : t.status === 'failed' ? 'FAIL' : t.status.toUpperCase()
      );
      suite = t.suite;
    }

    const chromium = byBrowser.get('chromium') || 'N/A';
    const firefox = byBrowser.get('firefox') || 'N/A';
    const webkit = byBrowser.get('webkit') || 'N/A';
    const consistent = chromium === firefox && firefox === webkit ? '✅ Yes' : '❌ No';

    matrixData.push([tcId, suite, chromium, firefox, webkit, consistent, '']);
  }

  const matrixSheet = XLSX.utils.aoa_to_sheet(matrixData);
  matrixSheet['!cols'] = [
    { wch: 12 }, // TC ID
    { wch: 25 }, // Suite
    { wch: 12 }, // Chromium
    { wch: 12 }, // Firefox
    { wch: 12 }, // WebKit
    { wch: 12 }, // Consistent
    { wch: 20 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, matrixSheet, '🔲 Browser Matrix');

  // ============ SHEET 4: Flaky History ============
  const flakyHeaders = [
    'TC ID',
    'Suite',
    'Run 1',
    'Run 2',
    'Run 3',
    'Run 4',
    'Run 5',
    'Run 6',
    'Run 7',
    'Run 8',
    'Run 9',
    'Run 10',
    'Flaky Rate',
    'Status',
  ];
  const flakyData: (string | number)[][] = [flakyHeaders];

  const history = loadFlakyHistory();
  // Sort entries by TC ID for proper ordering
  const sortedEntries = Object.entries(history).sort((a, b) => {
    const tcIdA = a[0].split('::')[1] || a[0];
    const tcIdB = b[0].split('::')[1] || b[0];
    const numA = Number.parseInt(tcIdA.replace(/\D/g, ''), 10) || 0;
    const numB = Number.parseInt(tcIdB.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  for (const [testId, record] of sortedEntries) {
    const parts = testId.split('::');
    const tcId = parts.length > 1 ? extractTcId(parts[1]) : testId.substring(0, 15);
    const fileName = parts.length > 1 ? parts[0] : '';
    const suite = fileName.includes('/')
      ? fileName.split('/').pop()?.replace('.spec.ts', '') || ''
      : '';

    const runResults: (string | number)[] = [];
    for (let i = 0; i < 10; i++) {
      if (i < record.runs.length) {
        runResults.push(record.runs[i] ? 'PASS' : 'FAIL');
      } else {
        runResults.push('-');
      }
    }

    const totalFails = record.runs.filter((r: boolean) => !r).length;
    const flakyRate =
      record.runs.length > 0 ? Math.round((totalFails / record.runs.length) * 100) : 0;
    const isFlaky = flakyRate >= 30;

    flakyData.push([
      tcId as string | number,
      suite as string | number,
      ...runResults.map((r) => r as string | number),
      `${flakyRate}%` as string | number,
      (isFlaky ? '⚠️ FLaky' : '✅ Stable') as string | number,
    ]);
  }

  const flakySheet = XLSX.utils.aoa_to_sheet(flakyData);
  const flakyCols = [
    { wch: 12 },
    { wch: 25 },
    ...Array(10).fill({ wch: 8 }),
    { wch: 10 },
    { wch: 12 },
  ];
  flakySheet['!cols'] = flakyCols;
  XLSX.utils.book_append_sheet(wb, flakySheet, '⚠️ Flaky History');

  // ============ SHEET 5: Coverage Map ============
  const coverageHeaders = [
    'Feature/Suite',
    'TC IDs',
    'Critical Coverage',
    'Last Run Status',
    'Notes',
  ];
  const coverageData = [coverageHeaders];

  // Group by suite
  const suiteGroups = new Map<string, TestResult[]>();
  for (const t of testResults) {
    if (!suiteGroups.has(t.suite)) {
      suiteGroups.set(t.suite, []);
    }
    suiteGroups.get(t.suite)?.push(t);
  }

  for (const [suite, tests] of suiteGroups) {
    const tcIds = [...new Set(tests.map((t) => t.id))].join(', ');
    const critical = tests
      .filter((t) => t.tags.includes('critical'))
      .map((t) => t.id)
      .join(', ');
    const passedCount = tests.filter((t) => t.status === 'passed').length;
    const failedCount = tests.filter((t) => t.status === 'failed').length;
    const skippedCount = tests.filter((t) => t.status === 'skipped').length;
    const status =
      failedCount > 0 ? '❌ Has Failures' : passedCount > 0 ? '✅ All Pass' : '⚠️ All Skipped';

    coverageData.push([
      suite,
      tcIds || 'N/A',
      critical || '-',
      status,
      `Passed: ${passedCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`,
    ]);
  }

  const coverageSheet = XLSX.utils.aoa_to_sheet(coverageData);
  coverageSheet['!cols'] = [
    { wch: 25 }, // Feature
    { wch: 30 }, // TC IDs
    { wch: 25 }, // Critical
    { wch: 15 }, // Status
    { wch: 20 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, coverageSheet, '🗺️ Coverage Map');

  // Write file
  const excelPath = path.join(OUTPUT_DIR, 'enterprise-test-report.xlsx');
  XLSX.writeFile(wb, excelPath);

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('[Enterprise Reporter] Report generated successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📁 Output: ${excelPath}`);
  console.log('');
  console.log('📊 Sheets:');
  console.log('   1. Executive Summary  - High-level metrics & pass/fail');
  console.log('   2. Test Results Detail - Per-TC breakdown with errors');
  console.log('   3. Browser Matrix     - Cross-browser consistency');
  console.log('   4. Flaky History      - 10-run trend per test');
  console.log('   5. Coverage Map       - Feature coverage overview');
  console.log('');
  console.log(
    `📈 Summary: ${testResults.length} tests, ${passedCount} passed, ${failedCount} failed, ${flakyCount} flaky`
  );
}

// Run
generateReport();
