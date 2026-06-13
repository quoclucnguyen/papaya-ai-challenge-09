import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Status } from '../../lib/types';
import { fmtInt } from '../../lib/format';
import { STATUS_COLORS } from './colors';

interface Props {
  data: { status: Status; count: number }[];
}

export function StatusDonut({ data }: Props) {
  const visible = data.filter((d) => d.count > 0);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ResponsiveContainer width="100%" height={290}>
      <PieChart>
        <Pie
          data={visible}
          dataKey="count"
          nameKey="status"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {visible.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { status: Status; count: number };
            return (
              <div className="chart-tooltip">
                <div className="tt-title">{p.status.replace('_', ' ')}</div>
                <div className="tt-row">
                  <span>Claims</span>
                  <strong>{fmtInt(p.count)}</strong>
                </div>
                <div className="tt-row">
                  <span>Share</span>
                  <strong>{total === 0 ? '—' : `${((p.count / total) * 100).toFixed(1)}%`}</strong>
                </div>
              </div>
            );
          }}
        />
        <Legend
          formatter={(value: string) => value.replace('_', ' ')}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
