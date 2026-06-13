import type { Claim } from '../types';

let seq = 0;

/** Tạo claim với default hợp lệ, override phần cần cho từng test. */
export function makeClaim(overrides: Partial<Claim> = {}): Claim {
  seq += 1;
  return {
    claim_id: `CLM-${String(seq).padStart(5, '0')}`,
    policy_id: 'POL-00001',
    member_name: 'Somchai Wattana',
    claim_type: 'OUTPATIENT',
    diagnosis_icd10: 'J06.9',
    submitted_amount: 1000,
    approved_amount: 0,
    status: 'PENDING',
    submitted_date: '2024-06-15',
    processed_date: null,
    assessor: 'Somchai Wattana',
    insurer: 'AIA Insurance',
    country: 'Thailand',
    ...overrides,
  };
}
