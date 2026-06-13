export const CLAIM_TYPES = ['OUTPATIENT', 'INPATIENT', 'DENTAL', 'MATERNITY'] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const STATUSES = ['APPROVED', 'REJECTED', 'PENDING', 'IN_REVIEW'] as const;
export type Status = (typeof STATUSES)[number];

export const COUNTRIES = ['Thailand', 'Vietnam', 'Hong Kong'] as const;
export type Country = (typeof COUNTRIES)[number];

export interface Claim {
  claim_id: string;
  policy_id: string;
  member_name: string;
  claim_type: ClaimType;
  diagnosis_icd10: string;
  submitted_amount: number;
  approved_amount: number;
  status: Status;
  /** ISO date yyyy-mm-dd */
  submitted_date: string;
  /** ISO date yyyy-mm-dd, null khi PENDING */
  processed_date: string | null;
  assessor: string;
  insurer: string;
  country: Country;
}

export interface Filters {
  /** ISO yyyy-mm-dd, inclusive; null = không giới hạn */
  dateFrom: string | null;
  dateTo: string | null;
  /** rỗng = tất cả */
  claimTypes: ClaimType[];
  insurers: string[];
  countries: string[];
  statuses: Status[];
}

/** Thứ tự 13 cột CSV theo đề — dùng chung cho generator và export. */
export const CSV_COLUMNS: (keyof Claim)[] = [
  'claim_id',
  'policy_id',
  'member_name',
  'claim_type',
  'diagnosis_icd10',
  'submitted_amount',
  'approved_amount',
  'status',
  'submitted_date',
  'processed_date',
  'assessor',
  'insurer',
  'country',
];

export const EMPTY_FILTERS: Filters = {
  dateFrom: null,
  dateTo: null,
  claimTypes: [],
  insurers: [],
  countries: [],
  statuses: [],
};
