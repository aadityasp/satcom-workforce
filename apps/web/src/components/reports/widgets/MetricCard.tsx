'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: { value: number; isPositive: boolean };
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600',
};

export function MetricCard({ title, value, subtitle, icon: Icon, color, trend }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-5 text-white`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon size={24} />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-white/80 text-sm">{title}</p>
      {subtitle && <p className="text-xs text-white/60 mt-1">{subtitle}</p>}
      {trend && (
        <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-200' : 'text-red-200'}`}>
          {trend.isPositive ? '+' : ''}{trend.value}% vs last week
        </p>
      )}
    </motion.div>
  );
}
