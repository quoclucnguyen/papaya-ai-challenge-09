import type { Kpis } from '../lib/kpis';
import { fmtDays, fmtInt, fmtMoney, fmtMoneyCompact, fmtPercent } from '../lib/format';

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  title?: string;
}

function Card({ label, value, sub, hint, title }: CardProps) {
  return (
    <div className="kpi-card">
      <p className="kpi-label">
        {label}
        {hint && (
          <span className="kpi-hint" title={hint}>
            ⓘ
          </span>
        )}
      </p>
      <p className="kpi-value" title={title}>
        {value}
      </p>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  );
}

export function KpiCards({ kpis }: { kpis: Kpis }) {
  return (
    <section className="kpi-grid" aria-label="Key performance indicators">
      <Card label="Total claims" value={fmtInt(kpis.totalClaims)} sub="trong tập đã filter" />
      <Card
        label="Approval rate"
        value={fmtPercent(kpis.approvalRate)}
        sub="APPROVED / đã quyết định"
        hint="= APPROVED / (APPROVED + REJECTED). PENDING và IN_REVIEW chưa có kết cục nên không nằm trong mẫu số."
      />
      <Card
        label="Avg processing time"
        value={fmtDays(kpis.avgProcessingDays)}
        sub="submitted → processed"
        hint="Trung bình số ngày xử lý trên mọi claim có processed_date. PENDING không có processed_date nên được loại."
      />
      <Card
        label="Total approved amount"
        value={fmtMoneyCompact(kpis.totalApprovedAmount)}
        sub="tổng approved_amount"
        title={fmtMoney(kpis.totalApprovedAmount)}
        hint="Chỉ claim APPROVED có approved_amount > 0. Hover để xem số đầy đủ."
      />
      <Card
        label="Avg claim amount"
        value={kpis.avgClaimAmount === null ? '—' : fmtMoney(kpis.avgClaimAmount)}
        sub="trung bình submitted_amount"
        hint="Trung bình submitted_amount trên mọi claim trong tập đã filter, không phụ thuộc status."
      />
    </section>
  );
}
