import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CLAIM_TYPES } from '../../lib/types';
import type { InsurerApprovalRow } from '../../lib/aggregations';
import { CLAIM_TYPE_COLORS, GRID_LINE, INK_FAINT } from './colors';

interface Props {
  rows: InsurerApprovalRow[];
}

/** Grouped bar: nhóm theo insurer, mỗi nhóm 4 bar theo claim type (đơn vị %). */
export function ApprovalByInsurerChart({ rows }: Props) {
  const data = rows.map((r) => {
    const entry: Record<string, string | number> = { insurer: r.insurer, overall: r.overall * 100 };
    for (const type of CLAIM_TYPES) {
      const rate = r.rates[type];
      if (rate !== null) entry[type] = +(rate * 100).toFixed(1);
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="insurer" tick={{ fontSize: 11.5, fill: INK_FAINT }} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: INK_FAINT }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(28,36,51,0.05)' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const overall = (payload[0].payload as { overall: number }).overall;
            return (
              <div className="chart-tooltip">
                <div className="tt-title">{String(label)}</div>
                {payload.map((p) => (
                  <div className="tt-row" key={String(p.dataKey)}>
                    <span style={{ color: p.color }}>{String(p.dataKey)}</span>
                    <strong>{Number(p.value).toFixed(1)}%</strong>
                  </div>
                ))}
                <div className="tt-row" style={{ marginTop: 4, borderTop: '1px solid rgba(200,211,232,0.3)', paddingTop: 4 }}>
                  <span>Overall</span>
                  <strong>{overall.toFixed(1)}%</strong>
                </div>
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        {CLAIM_TYPES.map((type) => (
          <Bar key={type} dataKey={type} fill={CLAIM_TYPE_COLORS[type]} radius={[3, 3, 0, 0]} maxBarSize={26} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
