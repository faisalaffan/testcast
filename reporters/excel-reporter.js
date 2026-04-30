const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: () => m[k] };
        }
        Object.defineProperty(o, k2, desc);
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? (o, v) => {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : (o, v) => {
        o.default = v;
      });
const __importStar =
  (this && this.__importStar) ||
  (() => {
    let ownKeys = (o) => {
      ownKeys =
        Object.getOwnPropertyNames ||
        ((o) => {
          const ar = [];
          for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        });
      return ownKeys(o);
    };
    return (mod) => {
      if (mod?.__esModule) return mod;
      const result = {};
      if (mod != null)
        for (let k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
const fs = __importStar(require('node:fs'));
const path = __importStar(require('node:path'));
const HISTORY_FILE = '.test-history.json';
const OUTPUT_DIR = 'test-results/excel-report';
class ExcelReporter {
  constructor() {
    this.results = new Map();
    this.testHistory = new Map();
    this.allTests = [];
    // Load history from previous runs
    this.loadHistory();
  }
  loadHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        for (const [key, value] of Object.entries(data)) {
          this.testHistory.set(key, value);
        }
      }
    } catch {
      // Ignore if file doesn't exist or is corrupted
    }
  }
  saveHistory() {
    const data = {};
    this.testHistory.forEach((value, key) => {
      data[key] = value;
    });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
  }
  onBegin(config, _suite) {
    this.config = config;
    this.startTime = new Date();
    console.log(`[Excel Reporter] Starting test run at ${this.startTime.toISOString()}`);
  }
  onTestBegin(_test) {
    // Nothing needed here
  }
  onTestEnd(test, result) {
    const testId = `${test.location.file}::${test.title}`;
    // Update history for flakiness tracking
    let history = this.testHistory.get(testId);
    if (!history) {
      history = {
        testId,
        name: test.title,
        passedRuns: 0,
        failedRuns: 0,
        lastRun: '',
        lastStatus: 'skipped',
      };
      this.testHistory.set(testId, history);
    }
    history.lastRun = new Date().toISOString();
    history.lastStatus = result.status;
    if (result.status === 'passed') {
      history.passedRuns++;
    } else if (result.status === 'failed') {
      history.failedRuns++;
    }
    const history2 = this.testHistory.get(testId);
    const flakyThreshold = 3; // Mark as flaky if failed 3+ times in last 10 runs
    const totalRuns = history2 ? history2.passedRuns + history2.failedRuns : 0;
    const isFlaky = history2 && history2.failedRuns >= flakyThreshold && totalRuns > 0;
    // Get retry count
    const retryCount = result.retries;
    const status = result.status;
    // Parse attachments for screenshots
    const attachments = result.attachments
      .filter((a) => a.body || a.path)
      .map((a) => ({
        name: a.name,
        contentType: a.contentType,
        path: a.path,
      }));
    const parsed = {
      testId,
      testName: test.title,
      suiteName: test.parent?.title || 'Root',
      status,
      duration: result.duration,
      retries: retryCount,
      startTime: result.startTime,
      endTime: result.errors.length > 0 ? undefined : undefined,
      errors: result.errors.map((e) => e.message),
      attachments,
      flakiness: isFlaky ? 'FLaky' : 'Stable',
      flakinessScore: history2 ? Math.round((history2.failedRuns / totalRuns) * 100) : 0,
      totalRuns: totalRuns,
      lastFailed: history2?.lastStatus === 'failed' ? history2.lastRun : undefined,
    };
    this.results.set(testId, parsed);
    this.allTests.push(parsed);
  }
  sortTestsByTcId() {
    // Sort by TC ID (extract numeric part for proper ordering)
    this.allTests.sort((a, b) => {
      if (!a || !a.testName) return 1;
      if (!b || !b.testName) return -1;
      const numA = Number.parseInt(a.testName.replace(/\D/g, ''), 10) || 0;
      const numB = Number.parseInt(b.testName.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }
  onEnd(result) {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    // Sort tests by TC ID for better readability
    this.sortTestsByTcId();
    // Generate CSV
    this.generateCSV();
    // Generate Excel
    this.generateExcel(result, duration);
    // Save updated history
    this.saveHistory();
    console.log(`[Excel Reporter] Report generated at ${OUTPUT_DIR}`);
    console.log(`[Excel Reporter] Total tests: ${this.allTests.length}`);
    console.log(
      `[Excel Reporter] Passed: ${this.allTests.filter((t) => t.status === 'passed').length}`
    );
    console.log(
      `[Excel Reporter] Failed: ${this.allTests.filter((t) => t.status === 'failed').length}`
    );
  }
  generateCSV() {
    const headers = [
      'Test Name',
      'Suite',
      'Status',
      'Duration (ms)',
      'Retries',
      'Flakiness',
      'Flakiness Score (%)',
      'Last Run',
      'Total Runs',
      'Last Failed',
      'Errors',
    ];
    // Filter out any undefined/null entries
    const validTests = this.allTests.filter((t) => t?.testName);
    const rows = validTests.map((t) => [
      this.escapeCSV(t.testName || 'Unknown'),
      this.escapeCSV(t.suiteName || 'Unknown'),
      (t.status || 'unknown').toUpperCase(),
      (t.duration || 0).toString(),
      (t.retries || 0).toString(),
      t.flakiness || 'Unknown',
      (t.flakinessScore || 0).toString(),
      t.lastFailed || 'N/A',
      (t.totalRuns || 0).toString(),
      t.errors && t.errors.length > 0 ? this.escapeCSV(t.errors.join('; ')) : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'test-results.csv'), csv, 'utf-8');
    console.log(`[Excel Reporter] CSV saved to ${OUTPUT_DIR}/test-results.csv`);
  }
  escapeCSV(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  generateExcel(_result, totalDuration) {
    // Use dynamic import for xlsx to avoid bundling issues
    // xlsx library will be installed separately
    try {
      // We'll create a simple Excel file using the xlsx package
      // For now, we'll use a simplified approach with CSV that Excel can open
      const xlsx = require('xlsx');
      // Summary sheet data
      const summaryData = [
        ['E2E Test Execution Summary'],
        [],
        ['Generated At', new Date().toISOString()],
        ['Total Tests', this.allTests.length.toString()],
        ['Passed', this.allTests.filter((t) => t.status === 'passed').length.toString()],
        ['Failed', this.allTests.filter((t) => t.status === 'failed').length.toString()],
        ['Skipped', this.allTests.filter((t) => t.status === 'skipped').length.toString()],
        ['Pass Rate', `${this.calculatePassRate()}%`],
        ['Total Duration (ms)', totalDuration.toString()],
        ['Browsers Tested', this.config.projects.map((p) => p.name).join(', ')],
        [],
        ['Flaky Tests', this.allTests.filter((t) => t.flakiness === 'FLaky').length.toString()],
      ];
      // Test results data - filter out invalid entries first
      const validTests = this.allTests.filter((t) => t?.testName);
      const testData = [
        [
          'Test Name',
          'Suite',
          'Status',
          'Duration (ms)',
          'Retries',
          'Flakiness',
          'Flakiness Score (%)',
          'Total Runs',
          'Last Failed',
          'Error Details',
        ],
        ...validTests.map((t) => [
          t.testName || 'Unknown',
          t.suiteName || 'Unknown',
          (t.status || 'unknown').toUpperCase(),
          t.duration || 0,
          t.retries || 0,
          t.flakiness || 'Unknown',
          t.flakinessScore || 0,
          t.totalRuns || 0,
          t.lastFailed || 'N/A',
          t.errors ? t.errors.join('; ') : '',
        ]),
      ];
      // Create workbook
      const wb = xlsx.utils.book_new();
      // Add Summary sheet
      const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
      xlsx.utils.book_append_sheet(wb, summarySheet, 'Summary');
      // Add Test Results sheet
      const testSheet = xlsx.utils.aoa_to_sheet(testData);
      // Set column widths for better readability
      testSheet['!cols'] = [
        { wch: 50 }, // Test Name
        { wch: 20 }, // Suite
        { wch: 10 }, // Status
        { wch: 15 }, // Duration
        { wch: 10 }, // Retries
        { wch: 12 }, // Flakiness
        { wch: 18 }, // Flakiness Score
        { wch: 12 }, // Total Runs
        { wch: 25 }, // Last Failed
        { wch: 50 }, // Error Details
      ];
      xlsx.utils.book_append_sheet(wb, testSheet, 'Test Results');
      // Add Flaky Tests sheet (if any)
      const flakyTests = this.allTests.filter((t) => t.flakiness === 'FLaky');
      if (flakyTests.length > 0) {
        const flakyData = [
          ['⚠️ FLaky Tests - Require Attention'],
          [],
          ['Test Name', 'Suite', 'Flakiness Score (%)', 'Failed Runs', 'Total Runs', 'Last Failed'],
          ...flakyTests.map((t) => [
            t.testName,
            t.suiteName,
            t.flakinessScore,
            this.testHistory.get(t.testId)?.failedRuns || 0,
            t.totalRuns,
            t.lastFailed || 'N/A',
          ]),
        ];
        const flakySheet = xlsx.utils.aoa_to_sheet(flakyData);
        xlsx.utils.book_append_sheet(wb, flakySheet, '⚠️ Flaky Tests');
      }
      // Write file
      xlsx.writeFile(wb, path.join(OUTPUT_DIR, 'test-results.xlsx'));
      console.log(`[Excel Reporter] Excel saved to ${OUTPUT_DIR}/test-results.xlsx`);
    } catch (_e) {
      // If xlsx is not installed, just use CSV
      console.warn('[Excel Reporter] xlsx package not found, Excel file not generated');
      console.warn('[Excel Reporter] Please run: npm install xlsx --save-dev');
    }
  }
  calculatePassRate() {
    const passed = this.allTests.filter((t) => t.status === 'passed').length;
    const total = this.allTests.length;
    if (total === 0) return '0';
    return ((passed / total) * 100).toFixed(1);
  }
}
exports.default = ExcelReporter;
