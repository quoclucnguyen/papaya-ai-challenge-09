import Papa from 'papaparse';
import { CSV_COLUMNS } from './types';
import type { Claim } from './types';

/** Xuất đúng 13 cột theo thứ tự đề; null → ô rỗng; escape chuẩn CSV qua PapaParse. */
export function claimsToCsv(claims: Claim[]): string {
  const data = claims.map((c) => CSV_COLUMNS.map((col) => (c[col] === null ? '' : c[col])));
  return Papa.unparse({ fields: [...CSV_COLUMNS], data }, { newline: '\n' });
}

/** Trigger download trên browser — tách khỏi claimsToCsv để test được phần logic. */
export function downloadCsv(claims: Claim[], filename: string): void {
  const blob = new Blob([claimsToCsv(claims)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
