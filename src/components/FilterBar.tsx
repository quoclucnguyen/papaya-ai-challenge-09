import { useEffect, useRef } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { CLAIM_TYPES, STATUSES } from '../lib/types';
import type { Filters } from '../lib/types';
import type { UiAction } from '../state/filtersReducer';
import { fmtInt } from '../lib/format';

interface MultiSelectProps {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}

function MultiSelect({ label, options, selected, onToggle }: MultiSelectProps) {
  const ref = useRef<HTMLDetailsElement>(null);

  // <details> không tự đóng khi click ra ngoài — đóng tay để dropdown không che KPI
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <details className="multiselect" ref={ref}>
      <summary aria-label={`${label}: ${selected.length > 0 ? selected.join(', ') : 'all'}`}>
        {label}
        {selected.length > 0 && <span className="count-badge">{selected.length}</span>}
      </summary>
      <div className="ms-panel">
        {options.map((opt) => (
          <label key={opt}>
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
            {opt.replace('_', ' ')}
          </label>
        ))}
      </div>
    </details>
  );
}

function Group({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="filter-group">
      {htmlFor ? (
        <label className="filter-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="filter-label">{label}</span>
      )}
      {children}
    </div>
  );
}

interface FilterBarProps {
  filters: Filters;
  dispatch: Dispatch<UiAction>;
  insurerOptions: string[];
  countryOptions: string[];
  shown: number;
  total: number;
}

export function FilterBar({ filters, dispatch, insurerOptions, countryOptions, shown, total }: FilterBarProps) {
  const hasActive =
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.claimTypes.length > 0 ||
    filters.insurers.length > 0 ||
    filters.countries.length > 0 ||
    filters.statuses.length > 0;

  return (
    <section className="filter-bar" aria-label="Global filters">
      <Group label="From" htmlFor="filter-date-from">
        <input
          id="filter-date-from"
          type="date"
          min="2024-01-01"
          max={filters.dateTo ?? '2024-12-31'}
          value={filters.dateFrom ?? ''}
          onChange={(e) => dispatch({ type: 'setDateFrom', value: e.target.value || null })}
        />
      </Group>
      <Group label="To" htmlFor="filter-date-to">
        <input
          id="filter-date-to"
          type="date"
          min={filters.dateFrom ?? '2024-01-01'}
          max="2024-12-31"
          value={filters.dateTo ?? ''}
          onChange={(e) => dispatch({ type: 'setDateTo', value: e.target.value || null })}
        />
      </Group>
      <Group label="Claim type">
        <MultiSelect
          label="All types"
          options={CLAIM_TYPES}
          selected={filters.claimTypes}
          onToggle={(v) => dispatch({ type: 'toggleClaimType', value: v as (typeof CLAIM_TYPES)[number] })}
        />
      </Group>
      <Group label="Insurer">
        <MultiSelect
          label="All insurers"
          options={insurerOptions}
          selected={filters.insurers}
          onToggle={(v) => dispatch({ type: 'toggleInsurer', value: v })}
        />
      </Group>
      <Group label="Country">
        <MultiSelect
          label="All countries"
          options={countryOptions}
          selected={filters.countries}
          onToggle={(v) => dispatch({ type: 'toggleCountry', value: v })}
        />
      </Group>
      <Group label="Status">
        <MultiSelect
          label="All statuses"
          options={STATUSES}
          selected={filters.statuses}
          onToggle={(v) => dispatch({ type: 'toggleStatus', value: v as (typeof STATUSES)[number] })}
        />
      </Group>
      <div className="filter-spacer" />
      <span className="showing-note">
        Showing <strong>{fmtInt(shown)}</strong> / {fmtInt(total)} claims
      </span>
      {hasActive && (
        <button className="btn ghost" onClick={() => dispatch({ type: 'resetFilters' })}>
          Reset filters
        </button>
      )}
    </section>
  );
}
