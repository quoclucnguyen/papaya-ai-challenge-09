import { describe, expect, it } from 'vitest';
import {
  approvalRateByInsurer,
  claimsOverTime,
  groupByStatus,
  isoWeekLabel,
  processingTimeHistogram,
  topDiagnosesByCost,
  topDiagnosesByFrequency,
} from '../aggregations';
import { makeClaim } from './helpers';

describe('groupByStatus', () => {
  it('đếm đủ 4 status theo thứ tự cố định, status vắng = 0', () => {
    const claims = [
      makeClaim({ status: 'APPROVED' }),
      makeClaim({ status: 'APPROVED' }),
      makeClaim({ status: 'REJECTED' }),
    ];
    expect(groupByStatus(claims)).toEqual([
      { status: 'APPROVED', count: 2 },
      { status: 'REJECTED', count: 1 },
      { status: 'PENDING', count: 0 },
      { status: 'IN_REVIEW', count: 0 },
    ]);
  });
});

describe('isoWeekLabel', () => {
  it('biên năm: 30/12/2024 (Thứ 2) thuộc 2025-W01', () => {
    expect(isoWeekLabel('2024-12-30')).toBe('2025-W01');
  });
  it('01/01/2024 (Thứ 2) thuộc 2024-W01', () => {
    expect(isoWeekLabel('2024-01-01')).toBe('2024-W01');
  });
  it('biên tháng giữa năm: 31/03/2024 (CN) vẫn thuộc tuần của 25/03', () => {
    expect(isoWeekLabel('2024-03-31')).toBe('2024-W13');
    expect(isoWeekLabel('2024-03-25')).toBe('2024-W13');
  });
});

describe('claimsOverTime', () => {
  it('group theo tháng, lấp tháng trống bằng 0 (line không nhảy cóc trục)', () => {
    const claims = [
      makeClaim({ submitted_date: '2024-01-10' }),
      makeClaim({ submitted_date: '2024-03-05' }),
      makeClaim({ submitted_date: '2024-03-20' }),
    ];
    expect(claimsOverTime(claims, 'month')).toEqual([
      { period: '2024-01', count: 1 },
      { period: '2024-02', count: 0 },
      { period: '2024-03', count: 2 },
    ]);
  });

  it('group theo ISO week, đúng ở biên năm và lấp tuần trống', () => {
    const claims = [
      makeClaim({ submitted_date: '2024-12-16' }), // 2024-W51
      makeClaim({ submitted_date: '2024-12-30' }), // 2025-W01
    ];
    expect(claimsOverTime(claims, 'week')).toEqual([
      { period: '2024-W51', count: 1 },
      { period: '2024-W52', count: 0 },
      { period: '2025-W01', count: 1 },
    ]);
  });

  it('tập rỗng → mảng rỗng', () => {
    expect(claimsOverTime([], 'month')).toEqual([]);
  });
});

describe('topDiagnoses', () => {
  const claims = [
    makeClaim({ diagnosis_icd10: 'J06.9', approved_amount: 100 }),
    makeClaim({ diagnosis_icd10: 'J06.9', approved_amount: 200 }),
    makeClaim({ diagnosis_icd10: 'J06.9', approved_amount: 0 }),
    makeClaim({ diagnosis_icd10: 'I10', approved_amount: 5000 }),
    makeClaim({ diagnosis_icd10: 'I10', approved_amount: 0 }),
    makeClaim({ diagnosis_icd10: 'K02.9', approved_amount: 900 }),
  ];

  it('by frequency: sort giảm dần theo count, kèm description', () => {
    const top = topDiagnosesByFrequency(claims, 10);
    expect(top.map((d) => [d.code, d.count])).toEqual([
      ['J06.9', 3],
      ['I10', 2],
      ['K02.9', 1],
    ]);
    expect(top[0].description).toContain('respiratory');
  });

  it('by cost: dùng tổng approved_amount (quy ước §1.3-4)', () => {
    expect(topDiagnosesByCost(claims, 10).map((d) => [d.code, d.total])).toEqual([
      ['I10', 5000],
      ['K02.9', 900],
      ['J06.9', 300],
    ]);
  });

  it('cắt đúng top N', () => {
    expect(topDiagnosesByFrequency(claims, 2)).toHaveLength(2);
  });

  it('tie-break ổn định theo code tăng dần', () => {
    const tied = [makeClaim({ diagnosis_icd10: 'I10' }), makeClaim({ diagnosis_icd10: 'A09' })];
    expect(topDiagnosesByFrequency(tied, 10).map((d) => d.code)).toEqual(['A09', 'I10']);
  });
});

describe('processingTimeHistogram', () => {
  it('bin 3 ngày: biên 1→bin đầu, 3/4 đúng biên, 30→bin cuối; chỉ dòng thiếu processed_date bị loại', () => {
    const claims = [
      makeClaim({ status: 'APPROVED', submitted_date: '2024-06-01', processed_date: '2024-06-02' }), // 1 ngày
      makeClaim({ status: 'APPROVED', submitted_date: '2024-06-01', processed_date: '2024-06-04' }), // 3 ngày
      makeClaim({ status: 'REJECTED', submitted_date: '2024-06-01', processed_date: '2024-06-05' }), // 4 ngày
      makeClaim({ status: 'APPROVED', submitted_date: '2024-06-01', processed_date: '2024-07-01' }), // 30 ngày
      makeClaim({ status: 'PENDING', processed_date: null }),
      makeClaim({ status: 'IN_REVIEW', submitted_date: '2024-06-01', processed_date: '2024-06-03' }),
    ];
    const bins = processingTimeHistogram(claims);
    expect(bins).toHaveLength(10);
    expect(bins[0]).toEqual({ label: '1–3', count: 3 });
    expect(bins[1]).toEqual({ label: '4–6', count: 1 });
    expect(bins[9]).toEqual({ label: '28–30', count: 1 });
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(5);
  });
});

describe('approvalRateByInsurer', () => {
  it('rate per insurer trên claims đã quyết định, tách theo claim type (grouped bar)', () => {
    const claims = [
      makeClaim({ insurer: 'AIA Insurance', claim_type: 'OUTPATIENT', status: 'APPROVED' }),
      makeClaim({ insurer: 'AIA Insurance', claim_type: 'OUTPATIENT', status: 'APPROVED' }),
      makeClaim({ insurer: 'AIA Insurance', claim_type: 'OUTPATIENT', status: 'REJECTED' }),
      makeClaim({ insurer: 'AIA Insurance', claim_type: 'DENTAL', status: 'APPROVED' }),
      makeClaim({ insurer: 'AIA Insurance', claim_type: 'INPATIENT', status: 'PENDING' }), // không tính
      makeClaim({ insurer: 'FWD Group', claim_type: 'DENTAL', status: 'REJECTED' }),
    ];
    const rows = approvalRateByInsurer(claims);
    expect(rows).toHaveLength(2);
    const aia = rows.find((r) => r.insurer === 'AIA Insurance')!;
    expect(aia.rates.OUTPATIENT).toBeCloseTo(2 / 3, 10);
    expect(aia.rates.DENTAL).toBe(1);
    expect(aia.rates.INPATIENT).toBeNull(); // chỉ có pending → không có rate
    expect(aia.overall).toBeCloseTo(3 / 4, 10);
    expect(rows.find((r) => r.insurer === 'FWD Group')!.overall).toBe(0);
  });

  it('insurer chỉ có PENDING/IN_REVIEW → loại khỏi kết quả', () => {
    const claims = [makeClaim({ insurer: 'AIA Insurance', status: 'PENDING' })];
    expect(approvalRateByInsurer(claims)).toEqual([]);
  });
});
