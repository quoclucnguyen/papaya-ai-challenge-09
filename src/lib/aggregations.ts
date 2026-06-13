import { CLAIM_TYPES, STATUSES } from './types';
import type { Claim, ClaimType, Status } from './types';
import { ICD10_CODES } from './referenceData';
import { processingDays } from './kpis';

const pad2 = (n: number) => String(n).padStart(2, '0');
const isDecided = (c: Claim) => c.status === 'APPROVED' || c.status === 'REJECTED';

/* ---------- Claims by status ---------- */

export function groupByStatus(claims: Claim[]): { status: Status; count: number }[] {
  const counts = new Map<Status, number>(STATUSES.map((s) => [s, 0]));
  for (const c of claims) counts.set(c.status, counts.get(c.status)! + 1);
  return STATUSES.map((status) => ({ status, count: counts.get(status)! }));
}

/* ---------- Claims over time ---------- */

/** ISO week (tuần bắt đầu Thứ 2, tuần 1 chứa Thứ 5 đầu tiên của năm) → "2025-W01". */
export function isoWeekLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDay() || 7; // CN = 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // dời về Thứ 5 của tuần này → ISO year đúng ở biên năm
  const isoYear = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(isoYear, 0, 1)) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${pad2(week)}`;
}

/** Thứ 2 của tuần chứa isoDate — dùng để enumerate tuần liên tục. */
function mondayOf(isoDate: string): Date {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
  return d;
}

export type TimeGranularity = 'week' | 'month';

/** Đếm claims theo submitted_date, lấp period trống bằng 0 để trục thời gian liên tục. */
export function claimsOverTime(
  claims: Claim[],
  granularity: TimeGranularity,
): { period: string; count: number }[] {
  if (claims.length === 0) return [];
  const dates = claims.map((c) => c.submitted_date);
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));

  const counts = new Map<string, number>();
  const labelOf = granularity === 'week' ? isoWeekLabel : (d: string) => d.slice(0, 7);
  for (const c of claims) {
    const label = labelOf(c.submitted_date);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const periods: string[] = [];
  if (granularity === 'week') {
    const cursor = mondayOf(min);
    const end = mondayOf(max);
    while (cursor.getTime() <= end.getTime()) {
      periods.push(isoWeekLabel(cursor.toISOString().slice(0, 10)));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  } else {
    let [y, m] = [Number(min.slice(0, 4)), Number(min.slice(5, 7))];
    const [endY, endM] = [Number(max.slice(0, 4)), Number(max.slice(5, 7))];
    while (y < endY || (y === endY && m <= endM)) {
      periods.push(`${y}-${pad2(m)}`);
      m += 1;
      if (m > 12) [y, m] = [y + 1, 1];
    }
  }
  return periods.map((period) => ({ period, count: counts.get(period) ?? 0 }));
}

/* ---------- Top diagnoses ---------- */

const DESCRIPTIONS = new Map(ICD10_CODES.map((e) => [e.code, e.description]));

function aggregateByDiagnosis(claims: Claim[], valueOf: (c: Claim) => number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const c of claims) {
    totals.set(c.diagnosis_icd10, (totals.get(c.diagnosis_icd10) ?? 0) + valueOf(c));
  }
  return totals;
}

function topN(totals: Map<string, number>, n: number): { code: string; value: number }[] {
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([code, value]) => ({ code, value }));
}

export function topDiagnosesByFrequency(
  claims: Claim[],
  n: number,
): { code: string; description: string; count: number }[] {
  return topN(aggregateByDiagnosis(claims, () => 1), n).map(({ code, value }) => ({
    code,
    description: DESCRIPTIONS.get(code) ?? code,
    count: value,
  }));
}

/** "Total cost" = tổng approved_amount — chi phí insurer thực chi trả (quy ước §1.3-4). */
export function topDiagnosesByCost(
  claims: Claim[],
  n: number,
): { code: string; description: string; total: number }[] {
  return topN(aggregateByDiagnosis(claims, (c) => c.approved_amount), n).map(({ code, value }) => ({
    code,
    description: DESCRIPTIONS.get(code) ?? code,
    total: value,
  }));
}

/* ---------- Processing time histogram ---------- */

/** Bin 3 ngày trên [1, 30], tính mọi claim có processed_date (quy ước §1.3-3). */
export function processingTimeHistogram(claims: Claim[]): { label: string; count: number }[] {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 3 + 1}–${i * 3 + 3}`,
    count: 0,
  }));
  for (const c of claims) {
    if (c.processed_date === null) continue;
    const days = processingDays(c);
    const idx = Math.min(9, Math.max(0, Math.floor((days - 1) / 3)));
    bins[idx].count += 1;
  }
  return bins;
}

/* ---------- Approval rate by insurer ---------- */

export interface InsurerApprovalRow {
  insurer: string;
  /** Rate per claim type — null khi type đó không có claim đã quyết định */
  rates: Record<ClaimType, number | null>;
  overall: number;
  decidedCount: number;
}

/** Grouped bar: nhóm theo insurer, bar theo claim type; chỉ insurer có claim đã quyết định. */
export function approvalRateByInsurer(claims: Claim[]): InsurerApprovalRow[] {
  const byInsurer = new Map<string, Claim[]>();
  for (const c of claims) {
    if (!isDecided(c)) continue;
    if (!byInsurer.has(c.insurer)) byInsurer.set(c.insurer, []);
    byInsurer.get(c.insurer)!.push(c);
  }
  return [...byInsurer.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([insurer, decided]) => {
      const rates = {} as Record<ClaimType, number | null>;
      for (const type of CLAIM_TYPES) {
        const ofType = decided.filter((c) => c.claim_type === type);
        rates[type] =
          ofType.length === 0
            ? null
            : ofType.filter((c) => c.status === 'APPROVED').length / ofType.length;
      }
      return {
        insurer,
        rates,
        overall: decided.filter((c) => c.status === 'APPROVED').length / decided.length,
        decidedCount: decided.length,
      };
    });
}
