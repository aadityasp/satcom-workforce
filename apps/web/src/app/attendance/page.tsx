'use client';

/**
 * Attendance Page
 *
 * Full attendance view showing:
 * - Status card with check-in/out controls
 * - Visual timeline bar
 * - Event list
 * - Policy information
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useAttendance } from '@/hooks/useAttendance';
import { AttendanceStatusCard } from '@/components/attendance/AttendanceStatusCard';
import { TimelineBar } from '@/components/attendance/TimelineBar';
import { TimelineEventList } from '@/components/attendance/TimelineEventList';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AttendancePage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const {
    attendance,
    isLoading,
    isActionLoading,
    error,
    refresh,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
    clearError,
  } = useAttendance();

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    }
  }, [user, router, _hasHydrated]);

  if (!_hasHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Header */}
      <header className="bg-white border-b border-silver-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 -ml-2 text-silver-500 hover:text-navy-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-navy-900">Attendance</h1>
            </div>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 text-silver-500 hover:text-navy-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-error-light border border-error/20 text-error rounded-lg px-4 py-3 flex justify-between items-center"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
              <button onClick={clearError}>
                <X size={18} />
              </button>
            </motion.div>
          )}

          {/* Status Card */}
          <motion.div variants={itemVariants}>
            <AttendanceStatusCard
              attendance={attendance}
              isLoading={isLoading}
              isActionLoading={isActionLoading}
              onCheckIn={checkIn}
              onCheckOut={checkOut}
              onStartBreak={startBreak}
              onEndBreak={endBreak}
            />
          </motion.div>

          {/* Timeline Section */}
          {attendance && (attendance.status !== 'not_checked_in') && (
            <>
              {/* Visual Timeline Bar */}
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6"
              >
                <h2 className="text-lg font-semibold text-navy-900 mb-4">Today&apos;s Timeline</h2>
                <TimelineBar attendance={attendance} />
              </motion.div>

              {/* Event List */}
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6"
              >
                <h2 className="text-lg font-semibold text-navy-900 mb-4">Activity Log</h2>
                <TimelineEventList attendance={attendance} />
              </motion.div>
            </>
          )}

          {/* Policy Info */}
          {attendance?.policy && (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6"
            >
              <h2 className="text-lg font-semibold text-navy-900 mb-4">Work Policy</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">
                    Standard Hours
                  </p>
                  <p className="font-medium text-navy-900">
                    {attendance.policy.standardWorkHours}h / day
                  </p>
                </div>
                <div>
                  <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">
                    Break Allowance
                  </p>
                  <p className="font-medium text-navy-900">
                    {attendance.policy.breakDurationMinutes}m
                  </p>
                </div>
                <div>
                  <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">
                    Lunch Duration
                  </p>
                  <p className="font-medium text-navy-900">
                    {attendance.policy.lunchDurationMinutes}m
                  </p>
                </div>
                <div>
                  <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">
                    Overtime After
                  </p>
                  <p className="font-medium text-navy-900">
                    {Math.floor(attendance.policy.overtimeThresholdMinutes / 60)}h
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
