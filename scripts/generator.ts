import { CSV_COLUMNS } from '../src/lib/types.ts';
import type { Claim, ClaimType, Country, Status } from '../src/lib/types.ts';
import { ASSESSORS, ICD10_CODES, INSURERS, NAME_POOLS } from '../src/lib/referenceData.ts';

/** Seed cố định → dataset tái lập được (commit CSV vào repo, test đối chiếu). */
export const DATASET_SEED = 20240901;

const TOTAL_CLAIMS = 5000;
const TOTAL_POLICIES = 2400;

/* ---------- PRNG & sampling helpers ---------- */

/** mulberry32 — PRNG seeded, đủ tốt cho mục đích mô phỏng. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedIndex(rng: () => number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Gamma(k=2, θ) qua tổng 2 exponential — phân phối lệch phải cho processing time. */
function gammaK2(rng: () => number, theta: number): number {
  return -theta * Math.log(rng() * rng() || Number.MIN_VALUE);
}

/** Log-normal qua Box-Muller — "most small, few large" cho amounts. */
function logNormal(rng: () => number, mu: number, sigma: number): number {
  const u1 = rng() || Number.MIN_VALUE;
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(mu + sigma * z);
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/* ---------- Tham số phân phối (PLAN §1.4) ---------- */

const CLAIM_TYPE_WEIGHTS: { type: ClaimType; weight: number }[] = [
  { type: 'OUTPATIENT', weight: 60 },
  { type: 'DENTAL', weight: 18 },
  { type: 'INPATIENT', weight: 14 },
  { type: 'MATERNITY', weight: 8 },
];

/** Log-normal theo claim type: median = e^mu (outpatient rẻ, inpatient/maternity đắt). */
const AMOUNT_PARAMS: Record<ClaimType, { mu: number; sigma: number }> = {
  OUTPATIENT: { mu: Math.log(3000), sigma: 0.9 },
  DENTAL: { mu: Math.log(5000), sigma: 0.8 },
  INPATIENT: { mu: Math.log(80000), sigma: 1.0 },
  MATERNITY: { mu: Math.log(60000), sigma: 0.6 },
};

/**
 * Approval rate trên claims đã quyết định theo insurer.
 * Với 77% claims đã quyết định, các mức này tạo rejection rate khoảng 15%
 * trên toàn bộ dataset, đồng thời vẫn giữ khác biệt rõ giữa insurers.
 */
const INSURER_APPROVAL: Record<string, number> = {
  [INSURERS[0]]: 0.75,
  [INSURERS[1]]: 0.8,
  [INSURERS[2]]: 0.85,
};

const COUNTRY_WEIGHTS: { country: Country; weight: number }[] = [
  { country: 'Thailand', weight: 40 },
  { country: 'Vietnam', weight: 35 },
  { country: 'Hong Kong', weight: 25 },
];

/** Seasonality nhẹ: đỉnh Q1/Q4 để line chart không phẳng. */
const MONTH_WEIGHTS = [11, 9, 8, 8, 8, 7, 8, 8, 8, 9, 10, 12];
const DAYS_IN_MONTH_2024 = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/* ---------- Generator ---------- */

interface Policy {
  policy_id: string;
  member_name: string;
  country: Country;
  insurer: string;
}

function makePolicies(rng: () => number): Policy[] {
  const policies: Policy[] = [];
  for (let i = 1; i <= TOTAL_POLICIES; i++) {
    const { country } = COUNTRY_WEIGHTS[weightedIndex(rng, COUNTRY_WEIGHTS.map((c) => c.weight))];
    const pool = NAME_POOLS[country];
    const first = pool.first[Math.floor(rng() * pool.first.length)];
    const last = pool.last[Math.floor(rng() * pool.last.length)];
    // VN: pool.first đã là họ tên đầy đủ; HK: họ đứng trước; TH: tên trước họ
    const member_name =
      country === 'Vietnam' ? first : country === 'Hong Kong' ? `${last} ${first}` : `${first} ${last}`;
    policies.push({
      policy_id: `POL-${String(i).padStart(5, '0')}`,
      member_name,
      country,
      insurer: INSURERS[weightedIndex(rng, [40, 35, 25])],
    });
  }
  return policies;
}

function pickSubmittedDate(rng: () => number): string {
  const monthIdx = weightedIndex(rng, MONTH_WEIGHTS);
  const day = 1 + Math.floor(rng() * DAYS_IN_MONTH_2024[monthIdx]);
  return `2024-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateClaims(seed: number): Claim[] {
  const rng = mulberry32(seed);
  const policies = makePolicies(rng);
  const claims: Claim[] = [];

  for (let i = 1; i <= TOTAL_CLAIMS; i++) {
    const policy = policies[Math.floor(rng() * policies.length)];
    const claim_type = CLAIM_TYPE_WEIGHTS[weightedIndex(rng, CLAIM_TYPE_WEIGHTS.map((c) => c.weight))].type;

    const eligible = ICD10_CODES.filter((e) => e.claimTypes.includes(claim_type));
    const diagnosis = eligible[weightedIndex(rng, eligible.map((e) => e.weight))];

    const { mu, sigma } = AMOUNT_PARAMS[claim_type];
    const submitted_amount = Math.round(clamp(logNormal(rng, mu, sigma), 500, 2_000_000));

    // 77% đã quyết định (approve/reject theo rate của insurer), 11% pending, 12% in review
    let status: Status;
    const r = rng();
    if (r < 0.77) {
      status = rng() < INSURER_APPROVAL[policy.insurer] ? 'APPROVED' : 'REJECTED';
    } else if (r < 0.88) {
      status = 'PENDING';
    } else {
      status = 'IN_REVIEW';
    }

    // Quy ước §1.3-2: chỉ APPROVED có tiền duyệt (70–100% submitted, mô phỏng partial approval)
    const approved_amount =
      status === 'APPROVED' ? Math.round(submitted_amount * (0.7 + 0.3 * rng())) : 0;

    const submitted_date = pickSubmittedDate(rng);
    // Quy ước §1.3-3: processed_date null khi PENDING; gamma mean ~6 + 1 ngày → trung bình ~7
    const processed_date =
      status === 'PENDING'
        ? null
        : addDays(submitted_date, clamp(1 + Math.round(gammaK2(rng, 3)), 1, 30));

    claims.push({
      claim_id: `CLM-${String(i).padStart(5, '0')}`,
      policy_id: policy.policy_id,
      member_name: policy.member_name,
      claim_type,
      diagnosis_icd10: diagnosis.code,
      submitted_amount,
      approved_amount,
      status,
      submitted_date,
      processed_date,
      assessor: ASSESSORS[weightedIndex(rng, [24, 22, 20, 18, 16])],
      insurer: policy.insurer,
      country: policy.country,
    });
  }
  return claims;
}

/* ---------- CSV ---------- */

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(claims: Claim[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const c of claims) {
    lines.push(
      CSV_COLUMNS.map((col) => {
        const v = c[col];
        return v === null ? '' : escapeCsv(String(v));
      }).join(','),
    );
  }
  return lines.join('\n') + '\n';
}
