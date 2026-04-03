'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CHART_COLORS = [
  '#118DFF',
  '#00B7C3',
  '#FFB900',
  '#107C10',
  '#D13438',
  '#8764B8',
];

export type TrendBarItem = { name: string; value: number; fill?: string };

type TrendBarChartProps = {
  title: string;
  description?: string;
  data: TrendBarItem[];
  dataKey?: string;
  className?: string;
};

/** Graphique en barres type tendance Power BI (couleurs, grille légère). */
export function TrendBarChart({
  title,
  description,
  data,
  dataKey = 'value',
  className = '',
}: TrendBarChartProps) {
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
      <div className="h-[260px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--foreground-muted)]">
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
              barSize={28}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'var(--color-primary-soft)', opacity: 0.5 }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={() => <span style={{ color: 'var(--foreground)' }}>Effectif</span>}
              />
              <Bar
                dataKey={dataKey}
                fill="#118DFF"
                radius={[2, 2, 0, 0]}
                name="Effectif"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
