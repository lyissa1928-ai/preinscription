'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

/** Palette Power BI pour diagrammes (ordre d’usage) */
const CHART_COLORS = [
  '#118DFF',
  '#00B7C3',
  '#FFB900',
  '#107C10',
  '#D13438',
  '#8764B8',
  '#E74856',
  '#5A9F43',
  '#0078D4',
  '#2B88D8',
];

export type PieChartDataItem = { name: string; value: number };

type PieChartCardProps = {
  title: string;
  description?: string;
  data: PieChartDataItem[];
  className?: string;
};

/** Carte avec diagramme circulaire style Power BI (couleurs, fond blanc, bordure légère). */
export function PieChartCard({ title, description, data, className = '' }: PieChartCardProps) {
  return (
    <section
      data-erp-card
      data-powerbi-chart
      className={`rounded-[var(--radius-lg)] border px-4 py-4 sm:px-6 sm:py-5 ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <header className="mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs sm:text-sm text-[var(--foreground-muted)]">{description}</p>
        )}
      </header>
      <div className="h-[240px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--foreground-muted)]">
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'var(--color-border)' }}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                }}
                formatter={(value) => [value ?? 0, '']}
                labelFormatter={(label) => label}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
