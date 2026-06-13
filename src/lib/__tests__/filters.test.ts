import { describe, expect, it } from 'vitest';
import { applyFilters } from '../filters';
import { EMPTY_FILTERS } from '../types';
import { makeClaim } from './helpers';

const claims = [
  makeClaim({ claim_id: 'CLM-A', claim_type: 'OUTPATIENT', insurer: 'AIA Insurance', country: 'Thailand', status: 'APPROVED', submitted_date: '2024-01-15' }),
  makeClaim({ claim_id: 'CLM-B', claim_type: 'INPATIENT', insurer: 'Prudential Life', country: 'Vietnam', status: 'REJECTED', submitted_date: '2024-03-01' }),
  makeClaim({ claim_id: 'CLM-C', claim_type: 'DENTAL', insurer: 'FWD Group', country: 'Hong Kong', status: 'PENDING', submitted_date: '2024-06-30' }),
  makeClaim({ claim_id: 'CLM-D', claim_type: 'OUTPATIENT', insurer: 'AIA Insurance', country: 'Vietnam', status: 'APPROVED', submitted_date: '2024-12-31' }),
];

const ids = (xs: { claim_id: string }[]) => xs.map((c) => c.claim_id);

describe('applyFilters', () => {
  it('filter rỗng → trả nguyên tập (empty selection = tất cả)', () => {
    expect(applyFilters(claims, EMPTY_FILTERS)).toHaveLength(4);
  });

  it('lọc theo từng chiều đơn lẻ', () => {
    expect(ids(applyFilters(claims, { ...EMPTY_FILTERS, claimTypes: ['OUTPATIENT'] }))).toEqual(['CLM-A', 'CLM-D']);
    expect(ids(applyFilters(claims, { ...EMPTY_FILTERS, insurers: ['FWD Group'] }))).toEqual(['CLM-C']);
    expect(ids(applyFilters(claims, { ...EMPTY_FILTERS, countries: ['Vietnam'] }))).toEqual(['CLM-B', 'CLM-D']);
    expect(ids(applyFilters(claims, { ...EMPTY_FILTERS, statuses: ['APPROVED', 'REJECTED'] }))).toEqual(['CLM-A', 'CLM-B', 'CLM-D']);
  });

  it('date range áp lên submitted_date, inclusive cả 2 đầu (quy ước §1.3-6)', () => {
    expect(ids(applyFilters(claims, { ...EMPTY_FILTERS, dateFrom: '2024-01-15', dateTo: '2024-06-30' }))).toEqual(['CLM-A', 'CLM-B', 'CLM-C']);
    expect(ids(applyFilters(claims, { ...EMPTY_FILTERS, dateFrom: '2024-12-31', dateTo: null }))).toEqual(['CLM-D']);
    expect(ids(applyFilters(claims, { ...EMPTY_FILTERS, dateFrom: null, dateTo: '2024-01-14' }))).toEqual([]);
  });

  it('nhiều chiều kết hợp theo AND', () => {
    const result = applyFilters(claims, {
      ...EMPTY_FILTERS,
      claimTypes: ['OUTPATIENT'],
      countries: ['Vietnam'],
      statuses: ['APPROVED'],
    });
    expect(ids(result)).toEqual(['CLM-D']);
  });
});
