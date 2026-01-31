'use client';

/**
 * TimesheetPieChart
 *
 * Pie chart showing hours by project.
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

interface TimesheetData {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  entryCount: number;
}

interface TimesheetPieChartProps {
  data: TimesheetData[];
  height?: number;
}

// Color palette for projects
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const hours = Math.floor(data.totalMinutes / 60);
    const mins = data.totalMinutes % 60;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-silver-200">
        <p className="font-semibold text-navy-900">{data.projectName}</p>
        <p className="text-sm text-silver-600">{hours}h {mins}m</p>
        <p className="text-xs text-silver-500">{data.entryCount} entries</p>
      </div>
    );
  }
  return null;
};

export function TimesheetPieChart({ data, height = 300 }: TimesheetPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-silver-500">
        No timesheet data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalMinutes"
          nameKey="projectName"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={entry.projectId} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
