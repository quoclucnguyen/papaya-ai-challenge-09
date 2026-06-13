import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { KeyboardEvent } from 'react';
import { fmtInt, fmtMoney, fmtMoneyCompact } from '../../lib/format';
import { GRID_LINE, INK, INK_FAINT, SELECTED } from './colors';

export interface DiagnosisRow {
  code: string;
  description: string;
  value: number;
}

interface Props {
  rows: DiagnosisRow[];
  valueLabel: string;
  color: string;
  money?: boolean;
  selected: string | null;
  onSelect: (code: string) => void;
}

/** Horizontal bar dùng chung cho frequency & cost — click bar để drill-down xuống table. */
export function DiagnosisBarChart({ rows, valueLabel, color, money, selected, onSelect }: Props) {
  const activateWithKeyboard = (event: KeyboardEvent<SVGElement>, code: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(code);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: INK_FAINT }}
          tickFormatter={(v: number) => (money ? fmtMoneyCompact(v) : fmtInt(v))}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
        />
        <YAxis
          type="category"
          dataKey="code"
          width={74}
          tick={{ fontSize: 11, fill: INK, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(28,36,51,0.05)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as DiagnosisRow;
            return (
              <div className="chart-tooltip">
                <div className="tt-title">{p.code}</div>
                <div style={{ marginBottom: 4 }}>{p.description}</div>
                <div className="tt-row">
                  <span>{valueLabel}</span>
                  <strong>{money ? fmtMoney(p.value) : fmtInt(p.value)}</strong>
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} cursor="pointer">
          {rows.map((row) => (
            <Cell
              key={row.code}
              fill={selected === row.code ? SELECTED : color}
              fillOpacity={selected !== null && selected !== row.code ? 0.4 : 1}
              onClick={() => onSelect(row.code)}
              onKeyDown={(event) => activateWithKeyboard(event, row.code)}
              tabIndex={0}
              role="button"
              aria-pressed={selected === row.code}
              aria-label={`${row.code}, ${row.description}, ${valueLabel}: ${
                money ? fmtMoney(row.value) : fmtInt(row.value)
              }. Activate to filter the claims table.`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
