export function money(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, ...options }).format(value);
}

export function number(value: number, maximumFractionDigits = 6) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function pct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

export function signedMoney(value: number) {
  const formatted = money(Math.abs(value));
  return `${value >= 0 ? '+' : '-'}${formatted}`;
}
