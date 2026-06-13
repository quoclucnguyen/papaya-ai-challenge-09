import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATASET_SEED, generateClaims, toCsv } from '../generator.ts';
import { ICD10_CODES, INSURERS, ASSESSORS } from '../../src/lib/referenceData.ts';
import { COUNTRIES } from '../../src/lib/types.ts';

const claims = generateClaims(DATASET_SEED);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

describe('generator — kích thước & format', () => {
  it('sinh đúng 5,000 claims', () => {
    expect(claims).toHaveLength(5000);
  });

  it('claim_id dạng CLM-NNNNN và duy nhất', () => {
    const ids = new Set(claims.map((c) => c.claim_id));
    expect(ids.size).toBe(5000);
    for (const c of claims) expect(c.claim_id).toMatch(/^CLM-\d{5}$/);
  });

  it('policy_id dạng POL-NNNNN, ít hơn 5,000 policy distinct (1 policy nhiều claims)', () => {
    const ids = new Set(claims.map((c) => c.policy_id));
    expect(ids.size).toBeGreaterThan(1000);
    expect(ids.size).toBeLessThan(5000);
    for (const c of claims) expect(c.policy_id).toMatch(/^POL-\d{5}$/);
  });

  it('chỉ dùng đúng 20 mã ICD-10, 3 insurer, 5 assessor, 3 nước đã khai báo', () => {
    const codes = new Set(claims.map((c) => c.diagnosis_icd10));
    expect(codes.size).toBe(ICD10_CODES.length);
    expect(new Set(claims.map((c) => c.insurer))).toEqual(new Set(INSURERS));
    expect(new Set(claims.map((c) => c.assessor))).toEqual(new Set(ASSESSORS));
    expect(new Set(claims.map((c) => c.country))).toEqual(new Set(COUNTRIES));
  });

  it('diagnosis khớp claim_type (dental chỉ nhận mã Kxx nha khoa, maternity nhận O8x…)', () => {
    const byCode = new Map(ICD10_CODES.map((e) => [e.code, e]));
    for (const c of claims) {
      expect(byCode.get(c.diagnosis_icd10)!.claimTypes).toContain(c.claim_type);
    }
  });
});

describe('generator — phân phối realistic', () => {
  it('outpatient chiếm đa số (>50%)', () => {
    const n = claims.filter((c) => c.claim_type === 'OUTPATIENT').length;
    expect(n / claims.length).toBeGreaterThan(0.5);
  });

  it('rejection rate trên toàn bộ claims ~15% (13–17%)', () => {
    const rejected = claims.filter((c) => c.status === 'REJECTED').length;
    const rate = rejected / claims.length;
    expect(rate).toBeGreaterThan(0.13);
    expect(rate).toBeLessThan(0.17);
  });

  it('processing time trung bình ~7 ngày (6–8), nằm trong [1, 30]', () => {
    const days = claims
      .filter((c) => c.processed_date !== null)
      .map((c) => daysBetween(c.submitted_date, c.processed_date!));
    expect(mean(days)).toBeGreaterThan(6);
    expect(mean(days)).toBeLessThan(8);
    expect(Math.min(...days)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...days)).toBeLessThanOrEqual(30);
  });

  it('submitted_amount trong [500, 2,000,000] và lệch phải (median < mean)', () => {
    const amounts = claims.map((c) => c.submitted_amount);
    expect(Math.min(...amounts)).toBeGreaterThanOrEqual(500);
    expect(Math.max(...amounts)).toBeLessThanOrEqual(2_000_000);
    expect(median(amounts)).toBeLessThan(mean(amounts) * 0.75);
  });

  it('submitted_date phủ đủ 12 tháng 2024', () => {
    const months = new Set(claims.map((c) => c.submitted_date.slice(0, 7)));
    for (let m = 1; m <= 12; m++) {
      expect(months).toContain(`2024-${String(m).padStart(2, '0')}`);
    }
    for (const c of claims) expect(c.submitted_date.slice(0, 4)).toBe('2024');
  });
});

describe('generator — ràng buộc nghiệp vụ (quy ước PLAN §1.3)', () => {
  it('REJECTED/PENDING/IN_REVIEW → approved_amount = 0; APPROVED → 0 < approved ≤ submitted', () => {
    for (const c of claims) {
      if (c.status === 'APPROVED') {
        expect(c.approved_amount).toBeGreaterThan(0);
        expect(c.approved_amount).toBeLessThanOrEqual(c.submitted_amount);
      } else {
        expect(c.approved_amount).toBe(0);
      }
    }
  });

  it('PENDING → processed_date null; còn lại processed − submitted ∈ [1, 30]', () => {
    for (const c of claims) {
      if (c.status === 'PENDING') {
        expect(c.processed_date).toBeNull();
      } else {
        expect(c.processed_date).not.toBeNull();
        const d = daysBetween(c.submitted_date, c.processed_date!);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(30);
      }
    }
  });

  it('mỗi insurer có approval rate khác nhau rõ rệt (chart grouped bar có ý nghĩa)', () => {
    const rates = [...INSURERS].map((ins) => {
      const decided = claims.filter(
        (c) => c.insurer === ins && (c.status === 'APPROVED' || c.status === 'REJECTED'),
      );
      return decided.filter((c) => c.status === 'APPROVED').length / decided.length;
    });
    const spread = Math.max(...rates) - Math.min(...rates);
    expect(spread).toBeGreaterThan(0.05);
  });
});

describe('generator — tái lập & file đã commit', () => {
  it('cùng seed → 2 lần chạy ra dataset giống hệt nhau', () => {
    expect(generateClaims(DATASET_SEED)).toEqual(claims);
  });

  it('public/data/claims.csv khớp với generator hiện tại (chạy npm run generate-data nếu fail)', () => {
    const csvPath = join(__dirname, '..', '..', 'public', 'data', 'claims.csv');
    expect(existsSync(csvPath), 'claims.csv chưa được sinh — chạy npm run generate-data').toBe(true);
    const onDisk = readFileSync(csvPath, 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(toCsv(claims));
  });
});
