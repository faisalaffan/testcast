<p align="center">
  <a href="README.md">🇬🇧 Read in English</a>
</p>

<p align="center">
  <img src="assets/01_BANNER_DARK.png" alt="TestCast Banner" width="100%">
</p>

<p align="center">
  <img src="assets/02_LOGO.png" alt="TestCast Logo" width="180">
</p>

# TestCast — E2E Test Boilerplate

Boilerplate E2E test level enterprise yang dibangun dengan Playwright + TypeScript. TestCast menyediakan framework siap produksi untuk otomatisasi pengujian, saat ini menargetkan [SauceDemo](https://www.saucedemo.com/) sebagai aplikasi demo.

---

## 🚀 Mulai Cepat — Hanya 4 Perintah

```bash
# 1. Bersihkan laporan & artifact sebelumnya
make clean

# 2. Jalankan semua test + generate semua laporan (HTML + Excel + Allure)
make test

# 3. Buka SEMUA laporan sekaligus (Playwright HTML + Allure + Excel + CSV)
make show-all-report

# ─── Selesai! ───────────────────────────────────────────────────────

# Bonus: Hapus semuanya termasuk riwayat flaky
make clean-all
```

> **Tanpa konfigurasi** — langsung jalan. Test mengakses situs live SauceDemo di `https://www.saucedemo.com/`.

---

## ✨ Fitur Unggulan

### 🎯 Quality Gates — Prioritas Test P0/P1/P2

| Tag | Severitas | Tujuan | Gate |
|-----|-----------|--------|------|
| `@p0` atau `@critical` | KRITIS | Wajib lulus untuk setiap rilis | **Blokir rilis** |
| `@p1` | NORMAL | Gate fungsional/PR | **Wajib PR** |
| `@p2` | MINOR | Kasus edge/boundary | Hanya nightly |

**Eksekusi pintar:**
```bash
pnpm test --grep "@p0"     # Hanya test kritis (gate cepat)
pnpm test --grep "@p1"     # Test fungsional standar
pnpm test --grep "@p0"     # Gate pipeline sebelum merge
```

Test otomatis ditandai dengan severity Allure berdasarkan tag `@p0`/`@p1`/`@p2` di judul test.

---

### 📊 Sistem Multi-Reporter

Menghasilkan **5 format laporan** secara bersamaan:

| Reporter | Output | Tujuan |
|---------|--------|--------|
| Playwright HTML | `reports/playwright-report/` | Debug local development |
| Allure | `reports/allure-results/` | Analisis tren CI |
| Excel | `test-results/excel-report/enterprise-test-report.xlsx` | Ringkasan eksekutif |
| CSV | `test-results/excel-report/test-results.csv` | Pemrosesan data |
| JSON | `reports/test-results/playwright-json-results.json` | Pipeline integrasi |

**Laporan Excel enterprise dengan 5 sheet:**
1. **Executive Summary** — Metrik tingkat tinggi, pass/fail, jumlah flaky, durasi
2. **Test Results Detail** — Breakdown per-TC dengan error, trace, retry
3. **Browser Matrix** — Cek konsistensi lintas browser
4. **Flaky History** — Tren 10-run per test, skor stabilitas
5. **Coverage Map** — Ringkasan cakupan fitur dengan status

---

### 🔄 Flaky Test Intelligence

Melacak reliabilitas test selama **10 run berturut-turut**:

- Flaky rate ≥30% → ditandai ⚠️ Flaky
- Flaky rate <30% → ditandai ✅ Stable
- Riwayat disimpan di `.test-flaky-history.json`
- Deteksi flaky otomatis di laporan Excel

```bash
# Lihat test flaky
make show-excel   # Sheet Flaky History
```

---

### ☁️ Manajemen Artifact S3

Upload otomatis artifact test ke S3/MinIO:

- **Hasil Allure** → `artifacts/{project}/{branch}/{buildId}/allure-results/`
- **Laporan Playwright** → `artifacts/{project}/{branch}/{buildId}/playwright-report/`
- **Laporan Excel** → `artifacts/{project}/{branch}/{buildId}/test-results/excel-report/`
- **Hasil JSON** → `artifacts/{project}/{branch}/{buildId}/test-results/`

Global teardown memastikan pembersihan S3 setelah test selesai.

---

### 🗄️ Fixture Validasi Database

Koneksi MySQL langsung untuk verifikasi backend:

```typescript
test('verifikasi cart di database', async ({ dbConnection }) => {
  const [rows] = await dbConnection.query('SELECT * FROM carts WHERE user_id = ?', [userId]);
  expect(rows.length).toBeGreaterThan(0);
});
```

Mendukung kredensial DB kustom via `.env`:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=test_db
```

---

### 📋 Data-Driven Testing

Muat data test dari Excel atau CSV:

```typescript
test('verifikasi harga', async ({ testData }) => {
  const prices = await testData.loadFromExcel('./test-data/prices.xlsx', 'Sheet1');
  for (const item of prices) {
    // validasi harga
  }
});
```

---

### 🚩 Feature Flags dengan Override

Override feature flags dalam test:

```typescript
test('flow checkout baru', async ({ featureFlags }) => {
  await featureFlags.setFlagOverride('new_checkout', true);
  // Test fitur baru
  featureFlags.clearOverrides();
});
```

Pola environment variable: `FLAG_{FLAGNAME}` = `true`/`false`

---

### 📸 Visual Regression Testing (VRT)

Perbandingan screenshot dengan integrasi Visual Regression Tracker:

```typescript
test('UI checkout', async ({ vrt, takeScreenshot }) => {
  const screenshot = await takeScreenshot('checkout-page', { fullPage: true });
  const result = await vrt.compareScreenshot('checkout-page', screenshot);
  expect(result.passed).toBe(true);
});
```

Mendukung baseline capture, pixel threshold, dan ignore areas.

---

### 🧪 Traced Steps dengan Screenshot

Setiap langkah test otomatis menangkap screenshot untuk analisis kegagalan:

```typescript
import { test, expect } from '../../fixtures/traced-steps';

test('flow checkout @p0 @smoke', async ({ page }) => {
  await page.click('.checkout-button');  // screenshot diambil
  await page.fill('#postal-code', '12345');  // screenshot diambil
});
```

---

### 🔐 Fixture Test Terautentikasi

Halaman pra-autentikasi untuk eksekusi test lebih cepat:

```typescript
test('halaman inventory', async ({ loggedInPage }) => {
  // Sudah login sebagai standard_user
  await expect(loggedInPage.locator('.inventory_item')).toHaveCount(6);
});
```

---

### 🌐 Dukungan Lintas Environment

Beralih antara DEV/STAGING/PROD dengan mulus:

```bash
NODE_ENV=DEV    pnpm test    # Menggunakan https://www.saucedemo.com
NODE_ENV=STAGING pnpm test   # Menggunakan staging.saucedemo.com
NODE_ENV=PROD   pnpm test    # Menggunakan production
```

---

### 🔧 Mode Eksekusi

| Mode | Perintah | Kasus Penggunaan |
|------|---------|----------|
| **Full** | `make test` | Suite test lengkap + semua laporan |
| **Quick** | `make test-quick` | Jalan cepat, tanpa laporan |
| **UI** | `make test-ui` | Mode headed dengan slow motion |
| **Headed** | `make test-headed` | Browser terlihat |
| **Single browser** | `make test-chromium` | Hanya Chromium |
| **Retry** | `CI=true pnpm test` | 2 retry saat gagal |

---

### 🏗️ CI/CD Ready

Pipeline siap pakai untuk GitLab CI dan GitHub Actions:

| Perintah | Pipeline | Browser |
|---------|---------|----------|
| `make ci-mr` | MR sanity check | Hanya Chromium |
| `make ci-full` | Full matrix | Chromium + Firefox + WebKit |
| `make ci-nightly` | Nightly run | Full + output JUnit |

---

### 🪝 Git Hooks (Husky + lint-staged)

Pengecekan kualitas kode otomatis sebelum commit:
- Linter + formatter Biome
- Type checking TypeScript
- Mencegah kode buruk masuk ke codebase

```bash
pnpm prepare   # Pasang git hooks
```

---

### 📈 Performance Monitoring

Test performa bawaan mengukur:
- Waktu respons login
- Waktu muat halaman
- Latensi operasi cart
- Durasi flow checkout

---

### 🔍 6 Tipe User Tercakup

Semua persona user SauceDemo dengan perilaku berbeda:

| User | Yang Diuji |
|------|---------------|
| `standard_user` | Happy path, semua fitur berfungsi |
| `locked_out_user` | Penanganan error autentikasi |
| `problem_user` | Bug subtotal checkout (bug diketahui) |
| `error_user` | Penanganan error render produk |
| `visual_user` | Bug tampilan harga (bug diketahui) |
| `performance_glitch_user` | Timing performa login |

---

### 🐛 Verifikasi Bug yang Diketahui

Cakupan bug intensional untuk regression testing:
1. `problem_user` — Subtotal digandakan saat checkout
2. `visual_user` — Harga inventory salah
3. `error_user` — Deskripsi produk gagal dirender
4. `performance_glitch_user` — Delay login 2000ms

---

### 🎬 Trace, Screenshot & Video saat Gagal

Penangkapan otomatis saat test gagal:
- **Trace** — Trace eksekusi penuh (dapat diputar ulang di Playwright)
- **Screenshot** — Status halaman saat gagal
- **Video** — Rekaman jalannya test

Konfigurasi via environment:
```bash
PW_TRACE=retain-on-failure   # Trace saat gagal
PW_SCREENSHOT=on              # Selalu screenshot
PW_VIDEO=retain-on-failure   # Video saat gagal
```

---

## 📋 Panduan Setup Langkah demi Langkah

### Prasyarat
- **Node.js 18+**
- **pnpm** (`npm install -g pnpm`)
- **macOS/Linux** (CI juga mendukung Windows via WSL)

### Langkah 1 — Install Dependencies

```bash
pnpm install
```

### Langkah 2 — Install Playwright Browser

```bash
pnpm exec playwright install
```

### Langkah 3 — (Opsional) Install Git Hooks

```bash
pnpm prepare
```

### Langkah 4 — Jalankan Test

```bash
make test
```

Ini akan:
- Menjalankan semua 282+ test terhadap https://www.saucedemo.com/
- Menghasilkan laporan HTML Playwright
- Menghasilkan laporan Excel enterprise
- Menghasilkan hasil laporan Allure
- Mencatat output ke `logs/`

### Langkah 5 — Lihat Laporan

```bash
make show-all-report
```

Membuka semuanya sekaligus:
- **Playwright HTML** → `http://localhost:9323`
- **Allure Report** → `http://localhost:9324`
- **Excel Report** → `test-results/excel-report/enterprise-test-report.xlsx`
- **CSV Report** → `test-results/excel-report/test-results.csv`

---

## 🎯 Kasus Penggunaan Umum

### Jalankan Hanya Test P0 (Jalur Kritis)
```bash
pnpm test --grep "@p0"
```

### Jalankan Hanya Test P1
```bash
pnpm test --grep "@p1"
```

### Jalankan Suite Test Tertentu
```bash
pnpm test tests/login/
pnpm test tests/checkout/
pnpm test tests/integration/
```

### Jalankan dalam Mode UI (headed, slow motion)
```bash
make test-ui
```

### Jalankan Cepat Tanpa Laporan
```bash
make test-quick
```

### Cek Kualitas Kode
```bash
make lint        # Jalankan linter
make lint-fix    # Perbaiki otomatis
make format      # Format kode
make type-check  # Cek TypeScript
```

---

## 🧹 Perintah Pembersihan

| Perintah | Fungsinya |
|---------|-------------|
| `make clean` | Menghapus semua laporan test dan artifact (allure-results, playwright-report, test-results, trace, logs) |
| `make clean-all` | Menghapus semua di atas + file riwayat flaky/test |
| `make killport` | Mematikan server yang berjalan di port 9090, 9323, 9324 |

---

## 📊 Lokasi Laporan

| Laporan | Path | Perintah |
|--------|------|---------|
| Playwright HTML | `reports/playwright-report/index.html` | `make show-report` |
| Excel | `test-results/excel-report/enterprise-test-report.xlsx` | `make show-excel` |
| Allure | `reports/allure-results/` | `make show-allure` |
| CSV | `test-results/excel-report/test-results.csv` | (otomatis terbuka dengan `show-all-report`) |

---

## 📁 Struktur Project

```
/
├── tests/                     # 282+ test specs
│   ├── smoke/                # P0 smoke tests
│   ├── login/                 # Flow login
│   ├── cart/                  # Operasi cart
│   ├── checkout/              # Flow checkout
│   ├── inventory/             # Daftar produk
│   ├── product/               # Detail produk
│   ├── pricing/               # Akurasi harga
│   ├── security/              # Keamanan auth & session
│   ├── performance/           # Waktu muat & respons
│   ├── exception/             # Penanganan error
│   ├── negative/              # Input tidak valid
│   ├── boundary/             # Nilai batas
│   ├── corner/               # Kombinasi ekstrem
│   ├── integration/           # Workflow multi-halaman
│   ├── user-journeys/        # Perjalanan E2E lintas user
│   ├── user-types/           # Semua 6 variasi user
│   └── bug-verification/     # Regresi bug yang diketahui
│
├── pages/                     # Page Object Models
├── fixtures/                  # Playwright fixtures
├── test-data/                 # Data test & tipe user
├── reporters/                  # Excel reporter
├── scripts/                   # Skrip CI/CD
├── infra/k8s/                # Konfigurasi Kubernetes
├── reports/                   # Laporan yang dihasilkan
├── Makefile                   # Semua perintah
└── playwright.config.ts       # Konfigurasi test runner
```

---

## 🧪 Suite Test

| Suite | Direktori | Prioritas |
|-------|-----------|---------|
| Login | `tests/login/` | P1 |
| Cart Operations | `tests/cart/` | P1 |
| Checkout Flow | `tests/checkout/` | P1 |
| Inventory | `tests/inventory/` | P1 |
| Product Detail | `tests/product/` | P1 |
| Pricing | `tests/pricing/` | P1 |
| Security | `tests/security/` | P1 |
| Performance | `tests/performance/` | P1 |
| Exception Handling | `tests/exception/` | P1 |
| Negative Input | `tests/negative/` | P2 |
| Boundary Values | `tests/boundary/` | P2 |
| Corner Cases | `tests/corner/` | P2 |
| Full Lifecycle | `tests/integration/` | P0 |
| User Types | `tests/user-types/` | P0 |
| User Journeys | `tests/user-journeys/` | P0 |
| Bug Verification | `tests/bug-verification/` | P2 |

---

## 👤 Tipe User

| User | Kredensial | Perilaku |
|------|-------------|----------|
| `standard_user` | `standard_user` / `secret_sauce` | Happy path — semua fitur berfungsi dengan benar |
| `locked_out_user` | `locked_out_user` / `secret_sauce` | Diblokir dari login |
| `problem_user` | `problem_user` / `secret_sauce` | Subtotal checkout digandakan (bug diketahui) |
| `error_user` | `error_user` / `secret_sauce` | Detail produk menampilkan error render |
| `visual_user` | `visual_user` / `secret_sauce` | Harga inventory salah, gambar rusak |
| `performance_glitch_user` | `performance_glitch_user` / `secret_sauce` | Login butuh 2000ms |

---

## ⚙️ Konfigurasi Environment

```bash
# .env (salin dari .env.example jika tersedia)
NODE_ENV=DEV
BASE_URL_DEV=https://www.saucedemo.com
BASE_URL_STAGING=https://staging.saucedemo.com
BASE_URL_PROD=https://www.saucedemo.com

# Opsional — aktifkan sesuai kebutuhan
VRT_API_URL=
VRT_API_KEY=
LD_CLIENT_ID=
LD_CLIENT_SECRET=
DB_HOST=localhost
DB_PORT=3306
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=test_db
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=testcast-artifacts
```

---

## 🔧 Semua Perintah Makefile

```bash
# Instalasi
make install          # Install Playwright browsers
make prepare          # Install Husky git hooks

# Testing
make test            # Jalankan semua test + semua laporan
make test-quick      # Jalankan test saja, tanpa laporan
make test-ui         # Mode UI (headed, slow)
make test-headed     # Jalankan dalam mode headed
make test-chromium   # Hanya Chromium
make test-firefox    # Hanya Firefox
make test-webkit     # Hanya WebKit

# Kualitas Kode
make lint            # Jalankan Biome linter
make lint-fix        # Perbaiki otomatis masalah lint
make format          # Format kode dengan Biome
make format-check    # Cek formatting
make type-check      # Cek TypeScript

# Laporan
make show-report       # Buka laporan Playwright HTML
make show-excel       # Buka laporan Excel
make show-csv         # Buka laporan CSV
make show-allure      # Buka laporan Allure (mode serve)
make show-all-report   # Buka SEMUA laporan sekaligus

# Utilitas
make killport          # Matikan proses di port 9090, 9323, 9324

# Pembersihan
make clean            # Bersihkan hasil test dan laporan
make clean-all        # Bersihkan semuanya termasuk riwayat test

# CI/CD
make ci-mr            # GitLab CI — MR sanity check (Chromium only)
make ci-full          # GitLab CI — Full matrix (semua browser)
make ci-nightly       # GitLab CI — Nightly (full + JUnit)

# Database
make db_test          # Test koneksi database MySQL
```

---

## 🐛 Bug yang Diketahui (Target Test Intensional)

Ini adalah **masalah yang diketahui di SauceDemo** yang diverifikasi oleh test khusus bug:

1. **Bug checkout `problem_user`** — Subtotal digandakan di ringkasan checkout
2. **Bug harga `visual_user`** — Inventory menampilkan harga salah (cart benar)
3. **Bug render `error_user`** — Deskripsi detail produk gagal dirender
4. **Login lambat `performance_glitch_user`** — Delay login 2000ms

---

## 🔌 Referensi Fixture

| Fixture | Tujuan |
|---------|---------|
| `page` | Halaman Playwright (dari `@playwright/test`) |
| `loggedInPage` | Halaman pra-autentikasi |
| `authState` | Info auth untuk debugging |
| `testData` | Pemuatan data Excel/CSV |
| `featureFlags` | Override feature flag |
| `dbConnection` | Koneksi MySQL |
| `s3Operations` | Upload/download artifact S3 |
| `takeScreenshot` | Tangkapan screenshot VRT |

### Penggunaan

```typescript
// Import dari fixtures — BUKAN dari @playwright/test langsung
import { test, expect } from '../../fixtures/traced-steps';
import { LoginPage } from '../../pages/LoginPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

// Auth fixture
test('seharusnya login', async ({ loggedInPage }) => {
  await expect(loggedInPage.locator('.app_logo')).toBeVisible();
});

// Pemuatan data Excel
test('seharusnya memuat data test', async ({ testData }) => {
  const users = await testData.loadFromExcel('./test-data/test-users.xlsx', 'Sheet1');
});
```

> **Penting**: Test di subdirektori (mis. `tests/boundary/`) harus menggunakan `../../fixtures/traced-steps` — bukan `../fixtures` atau `fixtures/traced-steps`.

---

## 📸 Pratinjau Laporan Test

### Playwright HTML Report
![Playwright Test Report](docs/playwright-test-report.png)

### Playwright Test Result
![Playwright Test Result](docs/playwright-test-result.png)

### Allure Report
![Allure Report](docs/allure-report-1.png)

### Playwright Trace Viewer
![Playwright Trace Viewer](docs/playwright-trace-viewer-1.png)

---

## Lisensi

MIT
