import type { Claim } from './types';

export interface Kpis {
  totalClaims: number;
  /** APPROVED / (APPROVED + REJECTED) — null khi chưa có claim nào được quyết định */
  approvalRate: number | null;
  /** Trung bình processed − submitted (ngày), trên mọi claim có processed_date — null khi không có */
  avgProcessingDays: number | null;
  totalApprovedAmount: number;
  /** Trung bình submitted_amount — null khi tập rỗng */
  avgClaimAmount: number | null;
}

export const processingDays = (c: Claim): number =>
  Math.round((Date.parse(c.processed_date!) - Date.parse(c.submitted_date)) / 86_400_000);

const isDecided = (c: Claim) => c.status === 'APPROVED' || c.status === 'REJECTED';

export function computeKpis(claims: Claim[]): Kpis {
  const approved = claims.filter((c) => c.status === 'APPROVED').length;
  const decided = claims.filter(isDecided);
  const processed = claims.filter((c) => c.processed_date !== null);

  return {
    totalClaims: claims.length,
    approvalRate: decided.length === 0 ? null : approved / decided.length,
    avgProcessingDays:
      processed.length === 0
        ? null
        : processed.reduce((sum, c) => sum + processingDays(c), 0) / processed.length,
    totalApprovedAmount: claims.reduce((sum, c) => sum + c.approved_amount, 0),
    avgClaimAmount:
      claims.length === 0
        ? null
        : claims.reduce((sum, c) => sum + c.submitted_amount, 0) / claims.length,
  };
}
