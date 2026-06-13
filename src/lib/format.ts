const nf = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtInt = (n: number): string => nf.format(n);

export const fmtMoney = (n: number): string => nf.format(Math.round(n));

export const fmtMoneyCompact = (n: number): string => compact.format(n);

/** 0.853 → "85.3%"; null → "—" */
export const fmtPercent = (rate: number | null): string =>
  rate === null ? '—' : `${(rate * 100).toFixed(1)}%`;

export const fmtDays = (d: number | null): string => (d === null ? '—' : `${d.toFixed(1)} days`);
