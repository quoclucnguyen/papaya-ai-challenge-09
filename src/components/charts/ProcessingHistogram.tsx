import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtInt } from '../../lib/format';
import { GRID_LINE, INK_FAINT, PRIMARY } from './colors';

interface Props {
  bins: { label: string; count: number }[];
}

export function ProcessingHistogram({ bins }: Props) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={bins} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK_FAINT }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: INK_FAINT }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(28,36,51,0.05)' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="chart-tooltip">
                <div className="tt-title">{String(label)} days</div>
                <div className="tt-row">
                  <span>Claims</span>
                  <strong>{fmtInt(payload[0].value as number)}</strong>
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="count" fill={PRIMARY} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
