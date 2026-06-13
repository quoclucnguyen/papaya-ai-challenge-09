import type { Claim } from './types';

/** Drill-down từ chart diagnosis — filter riêng của table, áp SAU global filters (quy ước §1.3-9). */
export function applyDrilldown(claims: Claim[], diagnosisCode: string | null): Claim[] {
  return diagnosisCode === null ? claims : claims.filter((c) => c.diagnosis_icd10 === diagnosisCode);
}

export type SortDir = 'asc' | 'desc';

const NUMERIC_KEYS: ReadonlySet<keyof Claim> = new Set(['submitted_amount', 'approved_amount']);

/** Sort ổn định, không mutate; null (processed_date) luôn xuống cuối bất kể chiều sort. */
export function sortClaims(claims: Claim[], key: keyof Claim, dir: SortDir): Claim[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...claims].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (NUMERIC_KEYS.has(key)) return sign * ((va as number) - (vb as number));
    // ISO date so sánh được như chuỗi; chuỗi thường so không phân biệt hoa thường
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    return sign * (sa < sb ? -1 : sa > sb ? 1 : 0);
  });
}

export interface Page<T> {
  rows: T[];
  page: number;
  totalPages: number;
  total: number;
}

/** Page 1-based, clamp về [1, totalPages] để đổi filter không rơi vào trang trống. */
export function paginate(claims: Claim[], page: number, pageSize: number): Page<Claim> {
  const total = claims.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.min(totalPages, Math.max(1, page));
  return {
    rows: claims.slice((clamped - 1) * pageSize, clamped * pageSize),
    page: clamped,
    totalPages,
    total,
  };
}
