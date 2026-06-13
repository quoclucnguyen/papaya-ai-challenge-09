import { describe, expect, it } from 'vitest';
import { applyDrilldown, paginate, sortClaims } from '../tableOps';
import { makeClaim } from './helpers';

describe('applyDrilldown', () => {
  const claims = [
    makeClaim({ claim_id: 'CLM-A', diagnosis_icd10: 'J06.9' }),
    makeClaim({ claim_id: 'CLM-B', diagnosis_icd10: 'I10' }),
  ];
  it('null → giữ nguyên; có code → chỉ claims của diagnosis đó', () => {
    expect(applyDrilldown(claims, null)).toHaveLength(2);
    expect(applyDrilldown(claims, 'I10').map((c) => c.claim_id)).toEqual(['CLM-B']);
  });
});

describe('sortClaims', () => {
  const claims = [
    makeClaim({ claim_id: 'CLM-B', submitted_amount: 500, submitted_date: '2024-03-01', processed_date: '2024-03-10', member_name: 'Beta' }),
    makeClaim({ claim_id: 'CLM-A', submitted_amount: 9000, submitted_date: '2024-01-01', processed_date: null, member_name: 'alpha' }),
    makeClaim({ claim_id: 'CLM-C', submitted_amount: 700, submitted_date: '2024-12-01', processed_date: '2024-12-05', member_name: 'Gamma' }),
  ];

  it('sort số asc/desc', () => {
    expect(sortClaims(claims, 'submitted_amount', 'asc').map((c) => c.submitted_amount)).toEqual([500, 700, 9000]);
    expect(sortClaims(claims, 'submitted_amount', 'desc').map((c) => c.submitted_amount)).toEqual([9000, 700, 500]);
  });

  it('sort chuỗi không phân biệt hoa thường', () => {
    expect(sortClaims(claims, 'member_name', 'asc').map((c) => c.member_name)).toEqual(['alpha', 'Beta', 'Gamma']);
  });

  it('sort date; processed_date null luôn xuống cuối cả 2 chiều', () => {
    expect(sortClaims(claims, 'processed_date', 'asc').map((c) => c.claim_id)).toEqual(['CLM-B', 'CLM-C', 'CLM-A']);
    expect(sortClaims(claims, 'processed_date', 'desc').map((c) => c.claim_id)).toEqual(['CLM-C', 'CLM-B', 'CLM-A']);
  });

  it('không mutate mảng gốc', () => {
    const before = claims.map((c) => c.claim_id);
    sortClaims(claims, 'submitted_amount', 'asc');
    expect(claims.map((c) => c.claim_id)).toEqual(before);
  });
});

describe('paginate', () => {
  const claims = Array.from({ length: 25 }, () => makeClaim());

  it('chia trang đúng, trang cuối lẻ', () => {
    expect(paginate(claims, 1, 10).rows).toHaveLength(10);
    expect(paginate(claims, 3, 10).rows).toHaveLength(5);
    expect(paginate(claims, 1, 10).totalPages).toBe(3);
    expect(paginate(claims, 1, 10).total).toBe(25);
  });

  it('page vượt biên được clamp về trang hợp lệ', () => {
    expect(paginate(claims, 99, 10).rows).toHaveLength(5); // clamp về trang 3
    expect(paginate(claims, 0, 10).rows).toHaveLength(10); // clamp về trang 1
  });

  it('tập rỗng → 1 trang rỗng, không chia 0', () => {
    const r = paginate([], 1, 10);
    expect(r.rows).toEqual([]);
    expect(r.totalPages).toBe(1);
  });
});
