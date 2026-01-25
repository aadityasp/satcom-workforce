'use client';

/**
 * AttendanceBarChart
 *
 * Stacked bar chart showing daily attendance breakdown:
 * - On Time (green)
 * - Late (orange)
 * - Absent (red)
 * - On Leave (purple)
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface AttendanceData {
  date: string;
  checkedIn: number;
  late: number;
  absent: number;
  onLeave: number;
}

interface AttendanceBarChartProps {
  data: AttendanceData[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-silver-200">
        <p className="font-semibold text-navy-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AttendanceBarChart({ data, height = 300 }: AttendanceBarChartProps) {
  // Format date for display (e.g., "Mon", "Tue")
  const formattedData = data.map(d => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="checkedIn" stackId="a" fill="#22c55e" name="On Time" />
        <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
        <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
        <Bar dataKey="onLeave" stackId="a" fill="#a855f7" name="On Leave" />
      </BarChart>
    </ResponsiveContainer>
  );
}
