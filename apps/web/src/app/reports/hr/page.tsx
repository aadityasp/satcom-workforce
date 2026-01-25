'use client';

/**
 * HR Dashboard Page
 *
 * Shows org-wide metrics:
 * - Attendance compliance overview
 * - Anomaly summary with breakdown
 * - Weekly trends
 * - Compliance metrics
 * - PDF export
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useHRDashboard } from '@/hooks/useReports';
import {
  AttendanceBarChart,
  MetricCard,
  NeedsAttentionSection,
  PdfExportButton,
  generateAttendanceReport,
} from '@/components/reports';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HRDashboardPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const { data, isLoading, error, refetch } = useHRDashboard();

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user?.role !== 'HR' && user?.role !== 'SuperAdmin') {
      router.push('/reports');
    }
  }, [user, _hasHydrated, router]);

  const handleExportPdf = () => {
    if (!data) return;

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    generateAttendanceReport({
      title: 'Organization Attendance Report',
      dateRange: `${weekAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`,
      summary: {
        total: data.orgSize,
        present: data.todayStats.checkedIn,
        late: data.todayStats.late,
        absent: data.todayStats.absent,
      },
      rows: [], // Org-wide doesn't show individual rows by default
    });
  };

  if (!_hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button onClick={refetch} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Header */}
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-silver-500 hover:text-navy-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-semibold text-navy-900 text-lg">HR Dashboard</h1>
                <p className="text-sm text-silver-500">Organization Reports</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refetch}
                className="p-2 text-silver-500 hover:text-navy-900 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
              <PdfExportButton onExport={handleExportPdf} label="Export Report" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Needs Attention Section */}
          <motion.div variants={itemVariants}>
            <NeedsAttentionSection
              anomalyCount={data.anomalySummary.open}
              lateCount={data.todayStats.late}
              absentCount={data.todayStats.absent}
            />
          </motion.div>

          {/* Today's Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Organization Size"
              value={data.orgSize}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Attendance Rate"
              value={`${data.todayStats.attendanceRate}%`}
              subtitle={`${data.todayStats.checkedIn} of ${data.orgSize} checked in`}
              icon={UserCheck}
              color="green"
            />
            <MetricCard
              title="Late Today"
              value={data.todayStats.late}
              subtitle={`${data.complianceMetrics.latePercentage}% of check-ins`}
              icon={Clock}
              color="orange"
            />
            <MetricCard
              title="Open Anomalies"
              value={data.anomalySummary.open}
              subtitle={`${data.anomalySummary.acknowledged} acknowledged`}
              icon={AlertTriangle}
              color="red"
            />
          </motion.div>

          {/* Charts and Details */}
          <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
            {/* Weekly Attendance Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
              <h2 className="font-semibold text-navy-900 mb-4">Weekly Attendance Trend</h2>
              <AttendanceBarChart data={data.weeklyAttendance} />
            </div>

            {/* Compliance Metrics */}
            <div className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
              <h2 className="font-semibold text-navy-900 mb-4">Compliance Metrics</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-silver-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-silver-500">Average Check-in Time</p>
                      <p className="font-semibold text-navy-900">
                        {data.complianceMetrics.avgCheckInTime || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-silver-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp size={20} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-silver-500">Late Percentage (This Week)</p>
                      <p className="font-semibold text-navy-900">
                        {data.complianceMetrics.latePercentage}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-silver-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield size={20} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-silver-500">Break Policy Violations</p>
                      <p className="font-semibold text-navy-900">
                        {data.complianceMetrics.breakPolicyViolations}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Anomaly Breakdown */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
            <h2 className="font-semibold text-navy-900 mb-4">Anomaly Breakdown</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* By Type */}
              <div>
                <h3 className="text-sm font-medium text-silver-500 mb-3 uppercase tracking-wider">By Type</h3>
                {data.anomalySummary.byType.length > 0 ? (
                  <div className="space-y-2">
                    {data.anomalySummary.byType.map((item) => (
                      <div key={item.type} className="flex items-center justify-between p-2 bg-silver-50 rounded">
                        <span className="text-sm text-navy-900">{item.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-sm font-medium text-navy-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-silver-500">No anomalies recorded</p>
                )}
              </div>

              {/* By Severity */}
              <div>
                <h3 className="text-sm font-medium text-silver-500 mb-3 uppercase tracking-wider">By Severity</h3>
                {data.anomalySummary.bySeverity.length > 0 ? (
                  <div className="space-y-2">
                    {data.anomalySummary.bySeverity.map((item) => (
                      <div key={item.severity} className="flex items-center justify-between p-2 bg-silver-50 rounded">
                        <span className={`text-sm px-2 py-0.5 rounded ${
                          item.severity === 'High' ? 'bg-error-light text-error' :
                          item.severity === 'Medium' ? 'bg-warning-light text-warning' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {item.severity}
                        </span>
                        <span className="text-sm font-medium text-navy-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-silver-500">No anomalies recorded</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
