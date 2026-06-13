import { describe, expect, it } from 'vitest';
import { computeKpis } from '../kpis';
import { makeClaim } from './helpers';

// Fixture biết trước đáp án: 2 APPROVED, 1 REJECTED, 1 PENDING, 1 IN_REVIEW
const fixture = [
  makeClaim({ status: 'APPROVED', submitted_amount: 1000, approved_amount: 800, submitted_date: '2024-01-10', processed_date: '2024-01-17' }), // 7 ngày
  makeClaim({ status: 'REJECTED', submitted_amount: 2000, approved_amount: 0, submitted_date: '2024-02-01', processed_date: '2024-02-04' }), // 3 ngày
  makeClaim({ status: 'PENDING', submitted_amount: 3000, approved_amount: 0, submitted_date: '2024-03-05', processed_date: null }),
  makeClaim({ status: 'IN_REVIEW', submitted_amount: 4000, approved_amount: 0, submitted_date: '2024-04-20', processed_date: '2024-04-25' }),
  makeClaim({ status: 'APPROVED', submitted_amount: 5000, approved_amount: 5000, submitted_date: '2024-12-30', processed_date: '2025-01-10' }), // 11 ngày
];

describe('computeKpis', () => {
  const kpis = computeKpis(fixture);

  it('total claims = số dòng sau filter', () => {
    expect(kpis.totalClaims).toBe(5);
  });

  it('approval rate = APPROVED / (APPROVED + REJECTED), bỏ PENDING/IN_REVIEW khỏi mẫu số (quy ước §1.3-1)', () => {
    expect(kpis.approvalRate).toBeCloseTo(2 / 3, 10);
  });

  it('avg processing time tính mọi claim có processed_date (quy ước §1.3-3)', () => {
    // (7 + 3 + 5 + 11) / 4 = 6.5 — chỉ PENDING không có processed_date
    expect(kpis.avgProcessingDays).toBeCloseTo(6.5, 10);
  });

  it('total approved amount = tổng approved_amount', () => {
    expect(kpis.totalApprovedAmount).toBe(5800);
  });

  it('average claim amount = trung bình submitted_amount mọi status (quy ước §1.3-5)', () => {
    expect(kpis.avgClaimAmount).toBeCloseTo(3000, 10);
  });

  it('tập rỗng → không NaN: rate/avg là null, tổng/đếm là 0', () => {
    const empty = computeKpis([]);
    expect(empty.totalClaims).toBe(0);
    expect(empty.approvalRate).toBeNull();
    expect(empty.avgProcessingDays).toBeNull();
    expect(empty.totalApprovedAmount).toBe(0);
    expect(empty.avgClaimAmount).toBeNull();
  });

  it('chỉ có PENDING/IN_REVIEW → approval rate null; processing vẫn tính IN_REVIEW', () => {
    const pendingOnly = computeKpis([makeClaim({ status: 'PENDING' }), makeClaim({ status: 'IN_REVIEW', processed_date: '2024-06-20' })]);
    expect(pendingOnly.approvalRate).toBeNull();
    expect(pendingOnly.avgProcessingDays).toBe(5);
  });
});
