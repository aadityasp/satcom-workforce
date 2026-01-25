'use client';

/**
 * Manager Dashboard Page
 *
 * Shows team metrics:
 * - Today's attendance at a glance (per user decision)
 * - Needs Attention section (anomalies, late arrivals)
 * - Weekly attendance chart
 * - Weekly timesheet by project
 * - Team status table
 * - PDF export
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useManagerDashboard } from '@/hooks/useReports';
import {
  AttendanceBarChart,
  TimesheetPieChart,
  MetricCard,
  NeedsAttentionSection,
  TeamStatusTable,
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

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const { data, isLoading, error, refetch } = useManagerDashboard();

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user?.role !== 'Manager') {
      router.push('/reports');
    }
  }, [user, _hasHydrated, router]);

  const handleExportPdf = () => {
    if (!data) return;

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    generateAttendanceReport({
      title: 'Team Attendance Report',
      dateRange: `${weekAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`,
      summary: {
        total: data.teamSize,
        present: data.todayStats.checkedIn,
        late: data.todayStats.late,
        absent: data.todayStats.absent,
      },
      rows: data.teamStatus.map(member => ({
        userName: member.userName,
        checkInTime: member.checkInTime
          ? new Date(member.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '-',
        checkOutTime: member.checkOutTime
          ? new Date(member.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '-',
        workMode: member.workMode || '-',
        status: member.isAbsent ? 'Absent' : member.isLate ? 'Late' : 'On Time',
        totalHours: '-', // Would need calculation
      })),
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
                <h1 className="font-semibold text-navy-900 text-lg">Team Dashboard</h1>
                <p className="text-sm text-silver-500">Manager Reports</p>
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
          {/* Needs Attention Section - Per user decision: at top of dashboard */}
          <motion.div variants={itemVariants}>
            <NeedsAttentionSection
              anomalyCount={data.openAnomalies}
              lateCount={data.todayStats.late}
              absentCount={data.todayStats.absent}
            />
          </motion.div>

          {/* Today's Stats - Per user decision: Primary focus for managers */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Team Size"
              value={data.teamSize}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Checked In"
              value={data.todayStats.checkedIn}
              subtitle={`${data.teamSize > 0 ? Math.round((data.todayStats.checkedIn / data.teamSize) * 100) : 0}% attendance`}
              icon={UserCheck}
              color="green"
            />
            <MetricCard
              title="Late Today"
              value={data.todayStats.late}
              icon={Clock}
              color="orange"
            />
            <MetricCard
              title="Open Anomalies"
              value={data.openAnomalies}
              icon={AlertTriangle}
              color="red"
            />
          </motion.div>

          {/* Charts Row */}
          <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
            {/* Weekly Attendance Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
              <h2 className="font-semibold text-navy-900 mb-4">Weekly Attendance</h2>
              <AttendanceBarChart data={data.weeklyAttendance} />
            </div>

            {/* Timesheet by Project */}
            <div className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
              <h2 className="font-semibold text-navy-900 mb-4">Hours by Project (This Week)</h2>
              <TimesheetPieChart data={data.weeklyTimesheet} />
            </div>
          </motion.div>

          {/* Team Status Table */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
            <h2 className="font-semibold text-navy-900 mb-4">Today&apos;s Attendance</h2>
            <TeamStatusTable members={data.teamStatus} />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
