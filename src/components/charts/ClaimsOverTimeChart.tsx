import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { claimsOverTime } from '../../lib/aggregations';
import type { TimeGranularity } from '../../lib/aggregations';
import type { Claim } from '../../lib/types';
import { fmtInt } from '../../lib/format';
import { ChartCard } from './ChartCard';
import { GRID_LINE, INK_FAINT, PRIMARY } from './colors';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2024-03" → "Mar" · "2024-W05" → "W05" (label đầy đủ vẫn hiện trong tooltip) */
function shortLabel(period: string): string {
  if (period.includes('W')) return period.slice(5);
  return MONTH_NAMES[Number(period.slice(5, 7)) - 1] ?? period;
}

export function ClaimsOverTimeChart({ claims }: { claims: Claim[] }) {
  const [granularity, setGranularity] = useState<TimeGranularity>('month');
  const data = useMemo(() => claimsOverTime(claims, granularity), [claims, granularity]);

  return (
    <ChartCard
      title="Claims over time"
      subtitle="Số claims theo submitted_date"
      headExtra={
        <div className="granularity-toggle" role="group" aria-label="Group by">
          {(['week', 'month'] as const).map((g) => (
            <button
              key={g}
              className={granularity === g ? 'active' : ''}
              onClick={() => setGranularity(g)}
              aria-pressed={granularity === g}
            >
              {g === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={290}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={shortLabel}
            tick={{ fontSize: 11, fill: INK_FAINT }}
            minTickGap={18}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: INK_FAINT }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="chart-tooltip">
                  <div className="tt-title">{String(label)}</div>
                  <div className="tt-row">
                    <span>Claims</span>
                    <strong>{fmtInt(payload[0].value as number)}</strong>
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={PRIMARY}
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
