# LedgerAlpha (Pooled Portfolio Ledger)

A local-first, zero-cost pooled investment tracker and ledger-based accounting dashboard. It enables tracking true economic ownership and decision scoring for a single brokerage account (like Robinhood) whose capital is pooled across multiple partners (Partner 1, Partner 2, and Partner 3).

---

## 1. Key Design Features

- **Unitized Fund Pool Model**: Tracks cash deposits/withdrawals to establish and update ownership units. Individual asset trades (buys/sells) are conducted by the portfolio as a whole; individual ownership shares of assets flow dynamically from their current share of total outstanding pool units.
- **FIFO Lot Resolution**: Decouples sales and trims using First In, First Out lot matching to accurately calculate realized gains/losses and decision grades.
- **Decision Scorecards**: Grades investment purchases against active benchmarks (e.g. SPY, QQQ, BTC) on the exact date of purchase to assign performance grades (`A` to `F`).
- **Robinhood CSV Importer**: Previews and reconciles CSV transaction sheets directly to the ledger, complete with duplicate detection.
- **Local-First & Free**: Runs locally using a Next.js server, SQLite database, and free pricing feeds via the `yahoo-finance2` Node package.

---

## 2. Project Architecture & Documentation

All core designs and models are located in the [docs/](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/docs/) directory:
- [docs/prd/01_product_vision.md](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/docs/prd/01_product_vision.md): Executive summary and feature scope.
- [docs/prd/02_accounting_model.md](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/docs/prd/02_accounting_model.md): Detailed mathematical models of the unitized pool ledger.
- [docs/prd/03_data_model.md](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/docs/prd/03_data_model.md): Schema relationships, databases, and Prisma structures.
- [docs/prd/04_market_data_sync.md](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/docs/prd/04_market_data_sync.md): Yahoo Finance price synchronization details.

Standardized prompts and workspace templates are structured in:
- [docs/prompts/](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/docs/prompts/): Reusable guidelines for AI coding tasks.
- [docs/templates/](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/docs/templates/): Blueprint documents for plans, investigations, and pull requests.

Workspace rules and instructions for coding assistants are configured in [.agents/AGENTS.md](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/.agents/AGENTS.md).

---

## 3. Quick Start

### Setup Environment
```bash
cp .env.example .env
npm install
```

### Database Initialization
Apply migrations and seed the SQLite database with partner records:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### Verification
Run the unit test suite and code quality checks:
```bash
npm test
npm run lint
```

### Run Locally
Launch the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.
