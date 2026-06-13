import Papa from 'papaparse';
import { CLAIM_TYPES, COUNTRIES, CSV_COLUMNS, STATUSES } from './types';
import type { Claim, ClaimType, Country, Status } from './types';

const DAY_MS = 86_400_000;

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function fail(row: number, field: keyof Claim, message: string): never {
  throw new Error(`CSV row ${row}: ${field} ${message}`);
}

function required(row: Record<string, string>, field: keyof Claim, rowNumber: number): string {
  const value = row[field]?.trim();
  if (!value) fail(rowNumber, field, 'is required');
  return value;
}

function amount(row: Record<string, string>, field: 'submitted_amount' | 'approved_amount', rowNumber: number): number {
  const raw = required(row, field, rowNumber);
  const value = Number(raw);
  if (!Number.isFinite(value)) fail(rowNumber, field, 'must be a finite number');
  return value;
}

function parseRow(row: Record<string, string>, index: number): Claim {
  const rowNumber = index + 2;
  const claim_id = required(row, 'claim_id', rowNumber);
  const policy_id = required(row, 'policy_id', rowNumber);
  const member_name = required(row, 'member_name', rowNumber);
  const claim_type = required(row, 'claim_type', rowNumber);
  const diagnosis_icd10 = required(row, 'diagnosis_icd10', rowNumber);
  const submitted_amount = amount(row, 'submitted_amount', rowNumber);
  const approved_amount = amount(row, 'approved_amount', rowNumber);
  const status = required(row, 'status', rowNumber);
  const submitted_date = required(row, 'submitted_date', rowNumber);
  const processedRaw = row.processed_date?.trim() ?? '';
  const processed_date = processedRaw || null;
  const assessor = required(row, 'assessor', rowNumber);
  const insurer = required(row, 'insurer', rowNumber);
  const country = required(row, 'country', rowNumber);

  if (!/^CLM-\d{5}$/.test(claim_id)) fail(rowNumber, 'claim_id', 'must match CLM-NNNNN');
  if (!/^POL-\d{5}$/.test(policy_id)) fail(rowNumber, 'policy_id', 'must match POL-NNNNN');
  if (!CLAIM_TYPES.includes(claim_type as ClaimType)) fail(rowNumber, 'claim_type', 'has an invalid value');
  if (!STATUSES.includes(status as Status)) fail(rowNumber, 'status', 'has an invalid value');
  if (!COUNTRIES.includes(country as Country)) fail(rowNumber, 'country', 'has an invalid value');
  if (!isIsoDate(submitted_date)) fail(rowNumber, 'submitted_date', 'must be a valid ISO date');

  if (submitted_amount < 500 || submitted_amount > 2_000_000) {
    fail(rowNumber, 'submitted_amount', 'must be between 500 and 2000000');
  }
  if (approved_amount < 0 || approved_amount > submitted_amount) {
    fail(rowNumber, 'approved_amount', 'must be between 0 and submitted_amount');
  }
  if (status !== 'APPROVED' && approved_amount !== 0) {
    fail(rowNumber, 'approved_amount', 'must be 0 unless status is APPROVED');
  }

  if (status === 'PENDING') {
    if (processed_date !== null) fail(rowNumber, 'processed_date', 'must be empty for PENDING claims');
  } else {
    if (processed_date === null || !isIsoDate(processed_date)) {
      fail(rowNumber, 'processed_date', 'must be a valid ISO date for non-PENDING claims');
    }
    const days = (Date.parse(processed_date) - Date.parse(submitted_date)) / DAY_MS;
    if (days < 1 || days > 30) {
      fail(rowNumber, 'processed_date', 'must be 1-30 days after submitted_date');
    }
  }

  return {
    claim_id,
    policy_id,
    member_name,
    claim_type: claim_type as ClaimType,
    diagnosis_icd10,
    submitted_amount,
    approved_amount,
    status: status as Status,
    submitted_date,
    processed_date,
    assessor,
    insurer,
    country: country as Country,
  };
}

/** Parse và validate CSV theo đúng schema 13 cột của challenge. */
export function parseCsvText(text: string): Claim[] {
  if (!text.trim()) throw new Error('CSV is empty');

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^\uFEFF/, ''),
  });

  const fields = result.meta.fields ?? [];
  if (
    fields.length !== CSV_COLUMNS.length ||
    fields.some((field, index) => field !== CSV_COLUMNS[index])
  ) {
    throw new Error(`CSV header must contain exactly: ${CSV_COLUMNS.join(',')}`);
  }

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message} (row ${result.errors[0].row})`);
  }

  return result.data.map(parseRow);
}
