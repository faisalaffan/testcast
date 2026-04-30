.PHONY: help
.PHONY: install test test-quick test-ui test-chromium test-firefox test-webkit
.PHONY: test-report test-show show-excel show-report show-csv show-allure show-all-report
.PHONY: clean clean-all killport
.PHONY: ci-mr ci-full ci-nightly lint lint-fix format format-check type-check
.PHONY: db_test prepare allure-serve

# Colors
BLUE  := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC    := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

## ─────────────────────────────────────────────
## 📋 HELP
## ─────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(BLUE)%-18s$(NC) %s\n", $$1, $$2}'

## ─────────────────────────────────────────────
## 🚀 INSTALL
## ─────────────────────────────────────────────
install: ## Install Playwright browsers
	@echo "Installing Playwright browsers..."
	pnpm exec playwright install

prepare: ## Install Husky git hooks
	@echo "Installing Husky git hooks..."
	pnpm prepare

## ─────────────────────────────────────────────
## 🧪 TESTS
## ─────────────────────────────────────────────
test: ## Run all tests + generate all reports (HTML + Excel + Allure)
	@echo "$(GREEN)▶ Running tests + generating all reports...$(NC)"
	@mkdir -p logs
	pnpm test 2>&1 | tee "logs/test-output-$(shell date +%Y%m%d-%H%M%S).log"
	@echo "$(GREEN)▶ Generating Excel report...$(NC)"
	pnpm report:excel

test-quick: ## Run all tests only (no report)
	@echo "$(GREEN)▶ Running tests (quick)...$(NC)"
	pnpm test:quick

test-ui: ## Run tests in UI mode (headed, slow)
	@echo "$(GREEN)▶ Running tests in UI mode...$(NC)"
	pnpm test:ui

test-headed: ## Run tests in headed mode
	@echo "$(GREEN)▶ Running tests in headed mode...$(NC)"
	pnpm test:headed

test-chromium: ## Run tests on Chromium only
	@echo "$(GREEN)▶ Running tests on Chromium...$(NC)"
	pnpm test:chromium

test-firefox: ## Run tests on Firefox only
	@echo "$(GREEN)▶ Running tests on Firefox...$(NC)"
	pnpm test:firefox

test-webkit: ## Run tests on WebKit only
	@echo "$(GREEN)▶ Running tests on WebKit...$(NC)"
	pnpm test:webkit

## ─────────────────────────────────────────────
## 🎨 CODE QUALITY
## ─────────────────────────────────────────────
lint: ## Run Biome linter
	@echo "$(GREEN)▶ Running Biome linter...$(NC)"
	pnpm lint

lint-fix: ## Run Biome linter with auto-fix
	@echo "$(GREEN)▶ Running Biome linter with auto-fix...$(NC)"
	pnpm lint:fix

format: ## Format code with Biome
	@echo "$(GREEN)▶ Formatting code with Biome...$(NC)"
	pnpm format

format-check: ## Check code formatting
	@echo "$(GREEN)▶ Checking code formatting...$(NC)"
	pnpm format:check

type-check: ## Run TypeScript type check
	@echo "$(GREEN)▶ Running TypeScript type check...$(NC)"
	pnpm type-check

## ─────────────────────────────────────────────
## 🗄️ DATABASE
## ─────────────────────────────────────────────
db_test: ## Test MySQL database connection
	@echo "$(GREEN)▶ Testing database connection...$(NC)"
	pnpm db:test

## ─────────────────────────────────────────────
## 📊 REPORTS
## ─────────────────────────────────────────────
test-report: ## Run tests + open Playwright HTML report
	@echo "$(GREEN)▶ Running tests + generating HTML report...$(NC)"
	pnpm test && open reports/playwright-report/index.html

test-show: ## Run tests + show all reports (Excel + Allure)
	@echo "$(GREEN)▶ Running tests + generating all reports...$(NC)"
	pnpm test && make show-excel && make show-allure

show-excel: ## Open enterprise Excel report
	@if [ -f test-results/excel-report/enterprise-test-report.xlsx ]; then \
		open test-results/excel-report/enterprise-test-report.xlsx; \
	elif [ -f test-results/excel-report/test-results.xlsx ]; then \
		open test-results/excel-report/test-results.xlsx; \
	else \
		echo "$(YELLOW)⚠ No Excel report found. Run 'make test' first.$(NC)"; \
	fi

show-report: ## Open Playwright HTML report
	@if [ -f reports/playwright-report/index.html ]; then \
		open reports/playwright-report/index.html; \
	else \
		echo "$(YELLOW)⚠ No HTML report found. Run 'make test' first.$(NC)"; \
	fi

show-csv: ## Open CSV report
	@if [ -f test-results/excel-report/test-results.csv ]; then \
		open test-results/excel-report/test-results.csv; \
	else \
		echo "$(YELLOW)⚠ No CSV report found. Run 'make test' first.$(NC)"; \
	fi

show-allure: ## Open Allure report (serve mode)
	@if [ -d reports/allure-results ]; then \
		echo "$(GREEN)▶ Serving Allure report on http://localhost:9090 ...$(NC)"; \
		allure serve reports/allure-results; \
	else \
		echo "$(YELLOW)⚠ No Allure results found. Run 'make test' first.$(NC)"; \
	fi

allure-serve: ## Start Allure serve in background
	@if [ -d allure-results ]; then \
		echo "$(GREEN)▶ Starting Allure serve on http://localhost:9090 ...$(NC)"; \
		nohup allure serve allure-results > /dev/null 2>&1 & \
		echo "Allure started on http://localhost:9090"; \
	else \
		echo "$(YELLOW)⚠ No Allure results found. Run 'make test' first.$(NC)"; \
	fi

show-all-report: ## Open all test reports at once (starts servers + opens browser)
	@echo "$(GREEN)▶ Opening all test reports...$(NC)"
	@echo "$(GREEN)▶ Killing existing servers on ports 9090, 9323, 9324...$(NC)"
	@lsof -ti :9090 2>/dev/null | xargs kill -9 2>/dev/null || true
	@lsof -ti :9323 2>/dev/null | xargs kill -9 2>/dev/null || true
	@lsof -ti :9324 2>/dev/null | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "$(GREEN)▶ Starting Allure server on port 9324...$(NC)"
	@if [ -d reports/allure-results ] && [ "$$(ls -A reports/allure-results 2>/dev/null)" ]; then \
		nohup allure serve reports/allure-results --port 9324 > /tmp/allure-serve.log 2>&1 & \
		ALLURE_PID=$$!; \
		echo "Allure started with PID $$ALLURE_PID"; \
		sleep 3; \
		if lsof -ti :9324 > /dev/null 2>&1; then \
			echo "$(GREEN)✓ Allure serving on http://localhost:9324$(NC)"; \
		else \
			echo "$(YELLOW)⚠ Allure may still be starting. Check http://localhost:9324 in a moment$(NC)"; \
		fi \
	else \
		echo "$(YELLOW)⚠ No Allure results found. Run tests first.$(NC)"; \
	fi
	@echo "$(GREEN)▶ Starting Playwright HTML server on port 9323...$(NC)"
	@if [ -f reports/playwright-report/index.html ]; then \
		cd reports/playwright-report && nohup python3 -m http.server 9323 > /dev/null 2>&1 & \
		PW_PID=$$!; \
		echo "Playwright HTML server started with PID $$PW_PID"; \
	else \
		echo "$(YELLOW)⚠ No Playwright report found. Run 'make test' first.$(NC)"; \
	fi
	@echo "$(GREEN)▶ Opening Excel report...$(NC)"
	@if [ -f test-results/excel-report/enterprise-test-report.xlsx ]; then \
		open test-results/excel-report/enterprise-test-report.xlsx; \
		echo "$(GREEN)✓ Opened Excel report$(NC)"; \
	elif [ -f test-results/excel-report/test-results.xlsx ]; then \
		open test-results/excel-report/test-results.xlsx; \
		echo "$(GREEN)✓ Opened Excel report$(NC)"; \
	else \
		echo "$(YELLOW)⚠ No Excel report found$(NC)"; \
	fi
	@echo "$(GREEN)▶ Opening CSV report...$(NC)"
	@if [ -f test-results/excel-report/test-results.csv ]; then \
		open test-results/excel-report/test-results.csv; \
		echo "$(GREEN)✓ Opened CSV report$(NC)"; \
	else \
		echo "$(YELLOW)⚠ No CSV report found$(NC)"; \
	fi
	@sleep 2
	@echo "$(GREEN)▶ Opening browser tabs...$(NC)"
	@open http://localhost:9324
	@open http://localhost:9323
	@echo ""
	@echo "$(GREEN)═══════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)✅ All reports are now available:$(NC)"
	@echo "$(GREEN)  • Playwright HTML: http://localhost:9323$(NC)"
	@echo "$(GREEN)  • Allure Report:  http://localhost:9324$(NC)"
	@echo "$(GREEN)  • Excel Report:   test-results/excel-report/enterprise-test-report.xlsx$(NC)"
	@echo "$(GREEN)  • CSV Report:     test-results/excel-report/test-results.csv$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════$(NC)"

## ─────────────────────────────────────────────
## 🔌 UTILITIES
## ─────────────────────────────────────────────
killport: ## Kill processes on ports 9090, 9323, 9324
	@echo "$(GREEN)▶ Killing processes on ports 9090, 9323, 9324...$(NC)"
	@lsof -ti :9090 2>/dev/null | xargs kill -9 2>/dev/null && echo "Killed process on port 9090" || echo "No process on port 9090"
	@lsof -ti :9323 2>/dev/null | xargs kill -9 2>/dev/null && echo "Killed process on port 9323" || echo "No process on port 9323"
	@lsof -ti :9324 2>/dev/null | xargs kill -9 2>/dev/null && echo "Killed process on port 9324" || echo "No process on port 9324"
	@echo "$(GREEN)✓ Done$(NC)"

## ─────────────────────────────────────────────
## 🧹 CLEAN
## ─────────────────────────────────────────────
clean: ## Clean test results and reports
	@echo "Cleaning test results and reports..."
	rm -rf reports/allure-results/
	rm -rf reports/allure-report/
	rm -rf test-results/excel-report/
	rm -rf reports/playwright-report/
	rm -rf trace/
	rm -rf logs/
	@echo "$(GREEN)✓ Clean complete$(NC)"

clean-all: ## Clean everything including test history
	@echo "Cleaning everything including test history..."
	rm -rf test-results/
	rm -rf reports/playwright-report/
	rm -rf trace/
	rm -f .test-history.json .test-flaky-history.json
	@echo "$(GREEN)✓ Clean complete - all data wiped$(NC)"

## ─────────────────────────────────────────────
## 🔄 CI/CD
## ─────────────────────────────────────────────
ci-mr: ## GitLab CI - MR sanity check (Chromium only, fast)
	@echo "$(YELLOW)⚡ Running MR sanity check (Chromium only)...$(NC)"
	pnpm test:chromium

ci-full: ## GitLab CI - Full matrix (all browsers)
	@echo "$(YELLOW)⚡ Running full test matrix...$(NC)"
	pnpm test

ci-nightly: ## GitLab CI - Nightly (full + JUnit)
	@echo "$(YELLOW)🌙 Running nightly full suite...$(NC)"
	pnpm exec playwright test --reporter=html,list,junit
