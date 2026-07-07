# FamilyAlpha Product Spec

## Product thesis
FamilyAlpha is a local-first portfolio ledger for a shared Robinhood account. It tracks the true economic ownership of each position across family members and evaluates investment decisions against benchmarks.

## V1 goals
- Manual transaction entry
- Robinhood CSV import preview
- Owner allocation for every transaction
- Owner-level holdings and cost basis
- FIFO lot/cohort analysis
- Decision grading vs benchmarks
- Local SQLite database

## Non-goals for V1
- Automatic Robinhood stock sync
- Live trading
- Tax filing advice
- Multi-broker production integrations
- Cloud hosting

## Users
- Omar: primary operator and analyst
- Mom/Dad: passive owners whose balances need to be tracked accurately

## Core question
For every dollar invested: who owned it, what did it become, and did that decision beat the alternative?
