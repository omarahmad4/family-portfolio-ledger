export type AssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'CASH';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL' | 'FEE' | 'SPLIT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
export type BenchmarkType = 'SPY' | 'QQQ' | 'BTC' | 'ETH' | 'CASH' | 'PORTFOLIO';

export interface OwnerInput {
  id: string;
  name: string;
}

export interface AssetInput {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  tradeDate: string;
  assetId?: string;
  assetSymbol?: string;
  quantity?: number;
  price?: number;
  grossAmount: number;
  fee?: number;
  allocations: Array<{
    ownerId: string;
    percentage: number;
    amount: number;
    quantity?: number;
  }>;
}

export interface HoldingSummary {
  ownerId: string;
  assetId: string;
  quantity: number;
  costBasis: number;
  marketValue: number;
  unrealizedGainLoss: number;
  unrealizedReturnPct: number | null;
}

export interface PriceMap {
  [assetId: string]: number;
}
