import { describe, expect, it } from 'vitest';
import { claimsToCsv } from '../exportCsv';
import { parseCsvText } from '../parseCsv';
import { makeClaim } from './helpers';

describe('claimsToCsv (export)', () => {
  it('đủ 13 cột đúng thứ tự đề + đủ số dòng', () => {
    const csv = claimsToCsv([makeClaim(), makeClaim()]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(
      'claim_id,policy_id,member_name,claim_type,diagnosis_icd10,submitted_amount,approved_amount,status,submitted_date,processed_date,assessor,insurer,country',
    );
    expect(lines).toHaveLength(3);
  });

  it('tên chứa dấu phẩy/quote được escape đúng chuẩn CSV', () => {
    const csv = claimsToCsv([makeClaim({ member_name: 'Doe, John "JD"' })]);
    expect(csv).toContain('"Doe, John ""JD"""');
  });

  it('processed_date null → ô rỗng', () => {
    const csv = claimsToCsv([makeClaim({ processed_date: null })]);
    const row = csv.trim().split('\n')[1];
    expect(row.split(',')[9]).toBe('');
  });
});

describe('parseCsvText (load)', () => {
  it('roundtrip: export rồi parse lại ra đúng claims (số là number, null là null)', () => {
    const claims = [
      makeClaim({ member_name: 'Doe, John', submitted_amount: 1234, processed_date: null }),
      makeClaim({ status: 'APPROVED', approved_amount: 999, processed_date: '2024-06-20' }),
    ];
    expect(parseCsvText(claimsToCsv(claims))).toEqual(claims);
  });

  it('parse được file claims.csv thật đã commit (5,000 dòng, đúng kiểu)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const text = readFileSync(join(__dirname, '..', '..', '..', 'public', 'data', 'claims.csv'), 'utf8');
    const claims = parseCsvText(text);
    expect(claims).toHaveLength(5000);
    expect(typeof claims[0].submitted_amount).toBe('number');
    expect(claims.every((c) => (c.status === 'PENDING') === (c.processed_date === null))).toBe(true);
  });

  it('từ chối CSV thiếu hoặc thừa cột', () => {
    const valid = claimsToCsv([makeClaim()]);
    expect(() => parseCsvText(valid.replace('policy_id,', ''))).toThrow(/CSV header/i);
    expect(() => parseCsvText(valid.replace('country\n', 'country,extra\n'))).toThrow(/CSV header/i);
  });

  it('từ chối enum, số và ngày xử lý không hợp lệ kèm số dòng', () => {
    const valid = claimsToCsv([makeClaim()]);
    expect(() => parseCsvText(valid.replace(',OUTPATIENT,', ',UNKNOWN,'))).toThrow(/row 2.*claim_type/i);
    expect(() => parseCsvText(valid.replace(',1000,', ',not-a-number,'))).toThrow(/row 2.*submitted_amount/i);
    expect(() => parseCsvText(valid.replace('2024-06-15,', '2024-02-30,'))).toThrow(/row 2.*submitted_date/i);
  });

  it('từ chối dữ liệu vi phạm ràng buộc nghiệp vụ', () => {
    const rejected = claimsToCsv([
      makeClaim({ status: 'REJECTED', submitted_amount: 1000, approved_amount: 100 }),
    ]);
    expect(() => parseCsvText(rejected)).toThrow(/row 2.*approved_amount/i);

    const pending = claimsToCsv([
      makeClaim({ status: 'PENDING', processed_date: '2024-06-20' }),
    ]);
    expect(() => parseCsvText(pending)).toThrow(/row 2.*processed_date/i);
  });
});
