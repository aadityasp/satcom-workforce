'use client';

/**
 * NeedsAttentionSection
 *
 * Per user decision: Red badges, dedicated section at top, inline icons
 * Shows anomalies, late arrivals, and pending items requiring action.
 */

import { AlertTriangle, Clock, Shield, Calendar, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface AttentionItem {
  icon: typeof AlertTriangle;
  count: number;
  label: string;
  href?: string;
  color: string;
}

interface NeedsAttentionSectionProps {
  anomalyCount: number;
  lateCount: number;
  absentCount?: number;
}

export function NeedsAttentionSection({ anomalyCount, lateCount, absentCount = 0 }: NeedsAttentionSectionProps) {
  const router = useRouter();

  // Hide if nothing needs attention
  if (anomalyCount === 0 && lateCount === 0 && absentCount === 0) {
    return null;
  }

  const items: AttentionItem[] = [];

  if (anomalyCount > 0) {
    items.push({
      icon: Shield,
      count: anomalyCount,
      label: 'Open Anomalies',
      href: '/admin/anomalies',
      color: 'text-error',
    });
  }

  if (lateCount > 0) {
    items.push({
      icon: Clock,
      count: lateCount,
      label: 'Late Today',
      color: 'text-warning',
    });
  }

  if (absentCount > 0) {
    items.push({
      icon: Calendar,
      count: absentCount,
      label: 'Absent Today',
      color: 'text-silver-600',
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-error-light border border-error/20 rounded-xl p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="text-error" size={20} />
        <h2 className="font-semibold text-navy-900">Needs Attention</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => item.href && router.push(item.href)}
            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-silver-200 ${item.href ? 'hover:border-error/30 cursor-pointer' : 'cursor-default'} transition-colors`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-silver-50`}>
                <item.icon size={18} className={item.color} />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-navy-900">{item.count}</p>
                <p className="text-sm text-silver-600">{item.label}</p>
              </div>
            </div>
            {item.href && <ChevronRight size={18} className="text-silver-400" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
