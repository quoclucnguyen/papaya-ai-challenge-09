import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  headExtra?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, headExtra, children }: ChartCardProps) {
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="chart-sub">{subtitle}</p>}
        </div>
        {headExtra}
      </div>
      {children}
    </div>
  );
}
