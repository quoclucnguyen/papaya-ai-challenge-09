import { lazy, Suspense, useMemo, useReducer } from 'react';
import { applyFilters } from '../lib/filters';
import { computeKpis } from '../lib/kpis';
import {
  approvalRateByInsurer,
  groupByStatus,
  processingTimeHistogram,
  topDiagnosesByCost,
  topDiagnosesByFrequency,
} from '../lib/aggregations';
import type { Claim } from '../lib/types';
import { INITIAL_UI_STATE, uiReducer } from '../state/filtersReducer';
import { FilterBar } from './FilterBar';
import { KpiCards } from './KpiCards';
import { ChartCard } from './charts/ChartCard';
import { ClaimsTable } from './ClaimsTable';
import { NAVY, PRIMARY } from './charts/colors';

const StatusDonut = lazy(() =>
  import('./charts/StatusDonut').then((module) => ({ default: module.StatusDonut })),
);
const ClaimsOverTimeChart = lazy(() =>
  import('./charts/ClaimsOverTimeChart').then((module) => ({ default: module.ClaimsOverTimeChart })),
);
const DiagnosisBarChart = lazy(() =>
  import('./charts/DiagnosisBarChart').then((module) => ({ default: module.DiagnosisBarChart })),
);
const ProcessingHistogram = lazy(() =>
  import('./charts/ProcessingHistogram').then((module) => ({ default: module.ProcessingHistogram })),
);
const ApprovalByInsurerChart = lazy(() =>
  import('./charts/ApprovalByInsurerChart').then((module) => ({
    default: module.ApprovalByInsurerChart,
  })),
);

function ChartBodyFallback() {
  return <div className="chart-loading">Loading chart...</div>;
}

function ChartCardFallback() {
  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Loading chart...</h3>
      </div>
      <ChartBodyFallback />
    </div>
  );
}

export function Dashboard({ claims }: { claims: Claim[] }) {
  const [ui, dispatch] = useReducer(uiReducer, INITIAL_UI_STATE);

  // Pipeline một chiều (PLAN §1.5): mọi KPI/chart/table derive từ cùng một `filtered`
  const filtered = useMemo(() => applyFilters(claims, ui.filters), [claims, ui.filters]);

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const statusData = useMemo(() => groupByStatus(filtered), [filtered]);
  const topFreq = useMemo(() => topDiagnosesByFrequency(filtered, 10), [filtered]);
  const topCost = useMemo(() => topDiagnosesByCost(filtered, 10), [filtered]);
  const histogram = useMemo(() => processingTimeHistogram(filtered), [filtered]);
  const insurerRates = useMemo(() => approvalRateByInsurer(filtered), [filtered]);

  const insurerOptions = useMemo(() => [...new Set(claims.map((c) => c.insurer))].sort(), [claims]);
  const countryOptions = useMemo(() => [...new Set(claims.map((c) => c.country))].sort(), [claims]);

  const selectDiagnosis = (code: string) => dispatch({ type: 'selectDiagnosis', value: code });

  return (
    <>
      <FilterBar
        filters={ui.filters}
        dispatch={dispatch}
        insurerOptions={insurerOptions}
        countryOptions={countryOptions}
        shown={filtered.length}
        total={claims.length}
      />

      <KpiCards kpis={kpis} />

      <section className="charts-grid">
        <ChartCard title="Claims by status" subtitle="Phân bố trạng thái trên tập đã filter">
          <Suspense fallback={<ChartBodyFallback />}>
            <StatusDonut data={statusData} />
          </Suspense>
        </ChartCard>

        <Suspense fallback={<ChartCardFallback />}>
          <ClaimsOverTimeChart claims={filtered} />
        </Suspense>

        <ChartCard
          title="Top 10 diagnoses by frequency"
          subtitle="Click một bar để drill-down xuống bảng claims"
          headExtra={<span className="drill-hint">click = drill-down</span>}
        >
          <Suspense fallback={<ChartBodyFallback />}>
            <DiagnosisBarChart
              rows={topFreq.map((d) => ({ code: d.code, description: d.description, value: d.count }))}
              valueLabel="Claims"
              color={PRIMARY}
              selected={ui.selectedDiagnosis}
              onSelect={selectDiagnosis}
            />
          </Suspense>
        </ChartCard>

        <ChartCard
          title="Top 10 diagnoses by total cost"
          subtitle="Tổng approved amount — click bar để drill-down"
          headExtra={<span className="drill-hint">click = drill-down</span>}
        >
          <Suspense fallback={<ChartBodyFallback />}>
            <DiagnosisBarChart
              rows={topCost.map((d) => ({ code: d.code, description: d.description, value: d.total }))}
              valueLabel="Approved amount"
              color={NAVY}
              money
              selected={ui.selectedDiagnosis}
              onSelect={selectDiagnosis}
            />
          </Suspense>
        </ChartCard>

        <ChartCard
          title="Processing time distribution"
          subtitle="Số ngày từ submitted đến processed — mọi claim có processed_date"
        >
          <Suspense fallback={<ChartBodyFallback />}>
            <ProcessingHistogram bins={histogram} />
          </Suspense>
        </ChartCard>

        <ChartCard
          title="Approval rate by insurer"
          subtitle="Nhóm theo insurer, tách theo claim type — trên claims đã quyết định"
        >
          <Suspense fallback={<ChartBodyFallback />}>
            <ApprovalByInsurerChart rows={insurerRates} />
          </Suspense>
        </ChartCard>
      </section>

      <ClaimsTable
        claims={filtered}
        selectedDiagnosis={ui.selectedDiagnosis}
        onClearDrilldown={() =>
          ui.selectedDiagnosis && dispatch({ type: 'selectDiagnosis', value: ui.selectedDiagnosis })
        }
      />
    </>
  );
}
