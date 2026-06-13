import { EMPTY_FILTERS } from '../lib/types';
import type { ClaimType, Filters, Status } from '../lib/types';

export interface UiState {
  filters: Filters;
  /** Drill-down từ chart diagnosis — chỉ áp vào table (quy ước PLAN §1.3-9) */
  selectedDiagnosis: string | null;
}

export const INITIAL_UI_STATE: UiState = {
  filters: EMPTY_FILTERS,
  selectedDiagnosis: null,
};

export type UiAction =
  | { type: 'setDateFrom'; value: string | null }
  | { type: 'setDateTo'; value: string | null }
  | { type: 'toggleClaimType'; value: ClaimType }
  | { type: 'toggleInsurer'; value: string }
  | { type: 'toggleCountry'; value: string }
  | { type: 'toggleStatus'; value: Status }
  | { type: 'resetFilters' }
  | { type: 'selectDiagnosis'; value: string };

function toggle<T>(xs: T[], x: T): T[] {
  return xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x];
}

export function uiReducer(state: UiState, action: UiAction): UiState {
  const { filters } = state;
  switch (action.type) {
    case 'setDateFrom':
      return { ...state, filters: { ...filters, dateFrom: action.value } };
    case 'setDateTo':
      return { ...state, filters: { ...filters, dateTo: action.value } };
    case 'toggleClaimType':
      return { ...state, filters: { ...filters, claimTypes: toggle(filters.claimTypes, action.value) } };
    case 'toggleInsurer':
      return { ...state, filters: { ...filters, insurers: toggle(filters.insurers, action.value) } };
    case 'toggleCountry':
      return { ...state, filters: { ...filters, countries: toggle(filters.countries, action.value) } };
    case 'toggleStatus':
      return { ...state, filters: { ...filters, statuses: toggle(filters.statuses, action.value) } };
    case 'resetFilters':
      return INITIAL_UI_STATE;
    case 'selectDiagnosis':
      // click lại bar đang chọn → bỏ chọn
      return { ...state, selectedDiagnosis: state.selectedDiagnosis === action.value ? null : action.value };
  }
}
