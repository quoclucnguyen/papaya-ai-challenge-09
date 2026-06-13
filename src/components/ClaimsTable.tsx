import { useEffect, useMemo, useState } from 'react';
import { applyDrilldown, paginate, sortClaims } from '../lib/tableOps';
import type { SortDir } from '../lib/tableOps';
import { downloadCsv } from '../lib/exportCsv';
import { fmtInt, fmtMoney } from '../lib/format';
import type { Claim } from '../lib/types';

const PAGE_SIZE = 20;

const COLUMNS: { key: keyof Claim; label: string; className?: string }[] = [
  { key: 'claim_id', label: 'Claim', className: 'mono' },
  { key: 'policy_id', label: 'Policy', className: 'mono' },
  { key: 'member_name', label: 'Member' },
  { key: 'claim_type', label: 'Type' },
  { key: 'diagnosis_icd10', label: 'ICD-10', className: 'mono' },
  { key: 'submitted_amount', label: 'Submitted', className: 'num' },
  { key: 'approved_amount', label: 'Approved', className: 'num' },
  { key: 'status', label: 'Status' },
  { key: 'submitted_date', label: 'Submitted on', className: 'mono' },
  { key: 'processed_date', label: 'Processed on', className: 'mono' },
  { key: 'assessor', label: 'Assessor' },
  { key: 'insurer', label: 'Insurer' },
  { key: 'country', label: 'Country' },
];

interface Props {
  claims: Claim[];
  selectedDiagnosis: string | null;
  onClearDrilldown: () => void;
}

export function ClaimsTable({ claims, selectedDiagnosis, onClearDrilldown }: Props) {
  const [sortKey, setSortKey] = useState<keyof Claim>('submitted_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // đổi filter / drill-down → quay về trang 1, tránh đứng ở trang không còn dữ liệu
  useEffect(() => {
    setPage(1);
  }, [claims, selectedDiagnosis]);

  const sorted = useMemo(
    () => sortClaims(applyDrilldown(claims, selectedDiagnosis), sortKey, sortDir),
    [claims, selectedDiagnosis, sortKey, sortDir],
  );
  const pageData = useMemo(() => paginate(sorted, page, PAGE_SIZE), [sorted, page]);

  const toggleSort = (key: keyof Claim) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <section className="table-card" aria-label="Claims table">
      <div className="table-head">
        <h3>Claims · {fmtInt(pageData.total)} rows</h3>
        {selectedDiagnosis && (
          <span className="drill-banner">
            Drill-down: <strong>{selectedDiagnosis}</strong>
            <button onClick={onClearDrilldown} aria-label="Clear drill-down">
              ✕ Clear
            </button>
          </span>
        )}
        <button
          className="btn primary"
          onClick={() => downloadCsv(sorted, 'claims_filtered.csv')}
          disabled={sorted.length === 0}
        >
          Export CSV ({fmtInt(sorted.length)})
        </button>
      </div>

      <div className="table-scroll">
        <table className="claims">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  aria-sort={
                    col.key === sortKey
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    className="sort-button"
                    onClick={() => toggleSort(col.key)}
                    aria-label={`Sort by ${col.label}${
                      col.key === sortKey
                        ? `, currently ${sortDir === 'asc' ? 'ascending' : 'descending'}`
                        : ''
                    }`}
                  >
                    {col.label}
                    {col.key === sortKey && (
                      <span className="sort-arrow" aria-hidden="true">
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.rows.map((c) => (
              <tr key={c.claim_id}>
                <td className="mono">{c.claim_id}</td>
                <td className="mono">{c.policy_id}</td>
                <td>{c.member_name}</td>
                <td>{c.claim_type}</td>
                <td className="mono">{c.diagnosis_icd10}</td>
                <td className="num">{fmtMoney(c.submitted_amount)}</td>
                <td className="num">{fmtMoney(c.approved_amount)}</td>
                <td>
                  <span className={`status-badge status-${c.status}`}>{c.status.replace('_', ' ')}</span>
                </td>
                <td className="mono">{c.submitted_date}</td>
                <td className="mono">{c.processed_date ?? '—'}</td>
                <td>{c.assessor}</td>
                <td>{c.insurer}</td>
                <td>{c.country}</td>
              </tr>
            ))}
            {pageData.rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-faint)' }}>
                  Không có claim nào khớp filter hiện tại
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span className="page-info">
          Page {pageData.page} / {pageData.totalPages} · {fmtInt(pageData.total)} claims
        </span>
        <div className="pager">
          <button className="btn small" onClick={() => setPage(1)} disabled={pageData.page <= 1}>
            «
          </button>
          <button className="btn small" onClick={() => setPage(pageData.page - 1)} disabled={pageData.page <= 1}>
            ‹ Prev
          </button>
          <button
            className="btn small"
            onClick={() => setPage(pageData.page + 1)}
            disabled={pageData.page >= pageData.totalPages}
          >
            Next ›
          </button>
          <button
            className="btn small"
            onClick={() => setPage(pageData.totalPages)}
            disabled={pageData.page >= pageData.totalPages}
          >
            »
          </button>
        </div>
      </div>
    </section>
  );
}
