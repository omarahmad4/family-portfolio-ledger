# Robinhood Import Notes

V1 uses CSV imports rather than relying on automatic sync.

The normalizer currently accepts several likely column names:
- Symbol / Instrument / Ticker
- Activity Type / Trans Code / Type / Description
- Trade Date / Process Date / Date / Activity Date
- Quantity / Qty / Shares
- Price / Share Price / Average Price
- Amount / Net Amount / Total / Value
- Fee / Fees / Reg Fee

Once a real Robinhood CSV sample is available, update `lib/robinhood-import/normalize.ts` and add fixtures in `tests/import`.
