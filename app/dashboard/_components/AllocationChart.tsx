'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationChartProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = {
  Stocks: '#10b981', // Emerald
  Crypto: '#f59e0b', // Amber
  Cash: '#38bdf8',   // Accent Blue
  ETFs: '#a855f7',   // Purple
  Other: '#64748b',  // Slate
};

export default function AllocationChart({ data }: AllocationChartProps) {
  // Map standard types to color categories
  const chartData = data
    .filter((d) => d.value > 0)
    .map((d) => ({
      name: d.name,
      value: Math.round(d.value * 100) / 100,
    }));

  if (chartData.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0' }}>
        No holdings value to display in chart.
      </div>
    );
  }

  const getCellColor = (name: string) => {
    if (name.includes('Stock')) return COLORS.Stocks;
    if (name.includes('Crypto')) return COLORS.Crypto;
    if (name.includes('Cash') || name === 'USD') return COLORS.Cash;
    if (name.includes('ETF')) return COLORS.ETFs;
    return COLORS.Other;
  };

  return (
    <div style={{ width: '100%', height: 260, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getCellColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #243244',
              borderRadius: '8px',
              color: '#e5e7eb',
            }}
            formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '13px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
