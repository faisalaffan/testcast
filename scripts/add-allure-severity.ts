/**
 * add-allure-severity.ts
 *
 * Post-processor that injects Allure severity labels into test result JSON files
 * based on @p0 / @p1 / @p2 tags found in the actual test spec file.
 *
 * Playwright's allure-playwright reporter does NOT include test tags in the
 * Allure result JSON (they're only visible in Playwright's own output).
 * So we extract the file+line from fullName, read the original .spec.ts file,
 * and pull the tags from the test declaration itself.
 *
 * Tag → Allure Severity mapping:
 *   @p0 or @critical  → CRITICAL  (must-pass gate for any release)
 *   @p1               → NORMAL    (functional/PR gate)
 *   @p2               → MINOR     (edge/boundary, nightly)
 *
 * Run:  npx tsx scripts/add-allure-severity.ts
 * Or automatically via: pnpm test (after tests complete)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ALLURE_RESULTS_DIR = path.resolve(__dirname, '../reports/allure-results');
const ROOT_DIR = path.resolve(__dirname, '..');

// Allure severity levels
type AllureSeverity = 'CRITICAL' | 'NORMAL' | 'MINOR' | 'TRIVIAL' | 'BLOCKER';

function tagToSeverity(title: string): AllureSeverity | undefined {
  const lower = title.toLowerCase();
  if (lower.includes('@p0') || lower.includes('@critical')) return 'CRITICAL';
  if (lower.includes('@p1')) return 'NORMAL';
  if (lower.includes('@p2')) return 'MINOR';
  return undefined;
}

function priorityTagValue(title: string): 'P0' | 'P1' | 'P2' | undefined {
  const lower = title.toLowerCase();
  if (lower.includes('@p0') || lower.includes('@critical')) return 'P0';
  if (lower.includes('@p1')) return 'P1';
  if (lower.includes('@p2')) return 'P2';
  return undefined;
}

interface AllureLabel {
  name: string;
  value: string;
}

interface AllureResult {
  uuid: string;
  historyId?: string;
  status?: string;
  statusDetails?: Record<string, unknown>;
  stage?: string;
  steps?: unknown[];
  attachments?: unknown[];
  parameters?: unknown[];
  labels: AllureLabel[];
  links?: unknown[];
  start?: number;
  testCaseId?: string;
  fullName?: string;
  titlePath?: string[];
  stop?: number;
  name?: string;
}

/**
 * Parse fullName (e.g. "tests/boundary/BoundaryValueTests.spec.ts:110:7")
 * and return { filePath, line }.
 *
 * Format is always: "path/to/file.spec.ts:lineNumber:colNumber"
 * We use second-to-last colon to find the line number separator,
 * because the file path itself never contains colons.
 */
function parseFullName(fullName: string): { filePath: string; line: number } | null {
  const secondLastColon = fullName.lastIndexOf(':', fullName.lastIndexOf(':') - 1);
  if (secondLastColon === -1) return null;

  const lineStr = fullName.slice(secondLastColon + 1, fullName.lastIndexOf(':'));
  const line = Number.parseInt(lineStr, 10);
  if (Number.isNaN(line)) return null;

  const filePath = path.resolve(ROOT_DIR, fullName.slice(0, secondLastColon));
  return { filePath, line };
}

/**
 * Read the spec file near `line` and find the test declaration string.
 * Looks backward from `line` to find `test('` or `test("` then extracts
 * the title (first string argument) which contains the @p0/@p1/@p2 tags.
 */
function extractTestTitleFromFile(filePath: string, line: number): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Search within ±20 lines of the reported line for the test declaration
  const startSearch = Math.max(0, line - 20);
  const endSearch = Math.min(lines.length - 1, line + 5);

  for (let i = startSearch; i <= endSearch; i++) {
    const l = lines[i];
    // Match: test('title @p0', ...) or test("title @p1", ...) or test(`title @p2`, ...)
    const match = l.match(/test\s*\(\s*['"`](.*?)['"`]/);
    if (match) {
      return match[1]; // Return the title string (e.g. "TC-BOUND-004: Maximum postal code length handled @p2")
    }
  }
  return null;
}

function processResultFile(filePath: string): boolean {
  const raw = fs.readFileSync(filePath, 'utf8');
  let result: AllureResult;

  try {
    result = JSON.parse(raw);
  } catch {
    console.error(`  [SKIP] ${path.basename(filePath)} — invalid JSON`);
    return false;
  }

  const fullName = result.fullName || '';
  if (!fullName) {
    console.warn(`  [WARN] ${path.basename(filePath)} — no fullName`);
    return false;
  }

  const parsed = parseFullName(fullName);
  if (!parsed) {
    console.warn(`  [WARN] ${path.basename(filePath)} — could not parse fullName: ${fullName}`);
    return false;
  }

  const testTitle = extractTestTitleFromFile(parsed.filePath, parsed.line);
  if (!testTitle) {
    console.warn(
      `  [WARN] ${path.basename(filePath)} — could not find test declaration in ${parsed.filePath} around line ${parsed.line}`
    );
    return false;
  }

  const severity = tagToSeverity(testTitle);
  if (!severity) {
    console.log(`  [---] ${path.basename(filePath)} — no priority tag in: "${testTitle}"`);
    return false;
  }

  const priorityValue = priorityTagValue(testTitle) as 'P0' | 'P1' | 'P2'; // severity !== undefined means priorityValue is also defined

  // Check if severity label already exists
  const existingSeverityIdx = result.labels.findIndex((l) => l.name === 'severity');
  if (existingSeverityIdx >= 0) {
    const oldValue = result.labels[existingSeverityIdx].value;
    result.labels[existingSeverityIdx].value = severity;
    console.log(`  [UPD] ${path.basename(filePath)} — severity ${oldValue} → ${severity}`);
  } else {
    result.labels.push({ name: 'severity', value: severity });
    console.log(
      `  [ADD] ${path.basename(filePath)} — severity: ${severity} (from tag in: "${testTitle.trim()}")`
    );
  }

  // Also add priority label for filtering
  const existingPriorityIdx = result.labels.findIndex((l) => l.name === 'priority');
  if (existingPriorityIdx < 0) {
    result.labels.push({ name: 'priority', value: priorityValue });
  } else {
    result.labels[existingPriorityIdx].value = priorityValue;
  }

  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
  return true;
}

function main(): void {
  console.log('\n[Allure Severity Post-Processor]');
  console.log('='.repeat(50));

  if (!fs.existsSync(ALLURE_RESULTS_DIR)) {
    console.warn(`[WARN] Allure results directory not found: ${ALLURE_RESULTS_DIR}`);
    console.warn('[WARN] Run tests first before this script.');
    process.exit(0);
  }

  const files = fs.readdirSync(ALLURE_RESULTS_DIR).filter((f) => f.endsWith('-result.json'));

  if (files.length === 0) {
    console.warn('[WARN] No result JSON files found.');
    process.exit(0);
  }

  console.log(`[INFO] Found ${files.length} result files. Processing...`);

  let modified = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(ALLURE_RESULTS_DIR, file);
    const changed = processResultFile(filePath);
    if (changed) modified++;
    else skipped++;
  }

  console.log('='.repeat(50));
  console.log(`[DONE] Modified: ${modified} | Skipped: ${skipped}`);
  console.log('[INFO] Allure severity labels injected.\n');
}

main();
