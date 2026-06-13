import type { Claim, Filters } from './types';

/**
 * Single source of truth cho global filters — mọi KPI/chart/table đều derive
 * từ kết quả của hàm này (PLAN §1.5). Mảng rỗng = không lọc chiều đó;
 * date range áp lên submitted_date, inclusive 2 đầu (quy ước §1.3-6).
 */
export function applyFilters(claims: Claim[], f: Filters): Claim[] {
  return claims.filter(
    (c) =>
      (f.dateFrom === null || c.submitted_date >= f.dateFrom) &&
      (f.dateTo === null || c.submitted_date <= f.dateTo) &&
      (f.claimTypes.length === 0 || f.claimTypes.includes(c.claim_type)) &&
      (f.insurers.length === 0 || f.insurers.includes(c.insurer)) &&
      (f.countries.length === 0 || f.countries.includes(c.country)) &&
      (f.statuses.length === 0 || f.statuses.includes(c.status)),
  );
}
