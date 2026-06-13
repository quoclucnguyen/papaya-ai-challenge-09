import type { ClaimType, Status } from '../../lib/types';

/* Palette kế thừa challenge-03: blue #2563EB, ink #0C1B3A, green/red/amber tailwind-ish */

export const STATUS_COLORS: Record<Status, string> = {
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  PENDING: '#F59E0B',
  IN_REVIEW: '#2563EB',
};

export const CLAIM_TYPE_COLORS: Record<ClaimType, string> = {
  OUTPATIENT: '#2563EB',
  INPATIENT: '#0C1B3A',
  DENTAL: '#F59E0B',
  MATERNITY: '#8B5CF6',
};

export const PRIMARY = '#2563EB';
export const NAVY = '#0C1B3A';
/** Màu highlight bar đang drill-down */
export const SELECTED = '#F59E0B';
export const INK = '#0C1B3A';
export const INK_FAINT = '#6B7280';
export const GRID_LINE = '#E3DFD4';
