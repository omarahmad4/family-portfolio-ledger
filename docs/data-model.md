# Data Model Notes

## Central model
The ledger is the source of truth. Holdings should always be computed from transactions and allocations, not manually edited balances.

## Important tables
- Owner: economic owner inside the family
- Account: external account, initially Robinhood
- Asset: stocks, ETFs, crypto, cash
- Transaction: normalized brokerage activity
- TransactionAllocation: owner split for a transaction
- Lot: FIFO cohort state
- Price: market close/latest data
- BenchmarkSnapshot: SPY/QQQ/BTC/ETH/cash values
- DecisionScore: graded performance of an action

## Allocation rule
Every investment transaction must have allocations that sum to 1.0. Every allocated amount and quantity should be derivable from the parent transaction.
