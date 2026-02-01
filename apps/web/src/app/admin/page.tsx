'use client';

/**
 * SuperAdmin Dashboard Page
 *
 * Main dashboard for SuperAdmin users showing:
 * - Summary statistics (employees, check-ins, leaves, anomalies)
 * - Quick action cards for admin modules
 * - Recent activity and alerts
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  Shield,
  Settings,
  BarChart3,
  UserCog,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  Bell,
  LogOut,
  MessageSquare,
  MapPin,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useTotalUnreadCount } from '@/store/chat';
import { api } from '@/lib/api';

interface AdminSummary {
  totalEmployees: number;
  checkedInCount: number;
  onlineCount: number;
  onLeaveCount: number;
  openAnomalies: number;
  pendingLeaveRequests: number;
  todayAttendanceRate: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error';
}

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, logout, _hasHydrated } = useAuthStore();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const totalUnreadMessages = useTotalUnreadCount();

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user?.role !== 'SuperAdmin' && user?.role !== 'HR') {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [summaryRes, activityRes] = await Promise.all([
        api.get<AdminSummary>('/admin/dashboard/summary'),
        api.get<{ data: RecentActivity[] }>('/admin/dashboard/recent-activity?limit=10'),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (activityRes.success && activityRes.data) {
        setRecentActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (user.role === 'SuperAdmin' || user.role === 'HR')) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!_hasHydrated || !user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const isSuperAdmin = user.role === 'SuperAdmin';

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Header */}
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="font-semibold text-navy-900 text-lg">Workforce</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/chat')}
                className="relative p-2 text-silver-500 hover:text-navy-900 transition-colors"
              >
                <Bell size={20} />
                {(summary?.openAnomalies || 0) > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
                )}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {user.profile?.firstName?.[0]}{user.profile?.lastName?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-navy-900">
                    {user.profile?.firstName} {user.profile?.lastName}
                  </p>
                  <p className="text-xs text-silver-500">{user.role}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-silver-500 hover:text-error transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Welcome Section */}
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-bold text-navy-900">
              Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              {user.profile?.firstName}!
            </h1>
            <p className="text-silver-500 mt-1">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </motion.div>

          {/* Stats Cards */}
          {summary && (
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <UserCheck size={24} />
                  <span className="text-2xl font-bold">{summary.checkedInCount}</span>
                </div>
                <p className="text-blue-100 text-sm">Checked In Today</p>
                <p className="text-xs text-blue-200 mt-1">{summary.todayAttendanceRate.toFixed(1)}% attendance</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Users size={24} />
                  <span className="text-2xl font-bold">{summary.onlineCount}</span>
                </div>
                <p className="text-green-100 text-sm">Currently Online</p>
                <p className="text-xs text-green-200 mt-1">out of {summary.totalEmployees} total</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <AlertTriangle size={24} />
                  <span className="text-2xl font-bold">{summary.openAnomalies}</span>
                </div>
                <p className="text-orange-100 text-sm">Open Anomalies</p>
                <p className="text-xs text-orange-200 mt-1">require attention</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Calendar size={24} />
                  <span className="text-2xl font-bold">{summary.pendingLeaveRequests}</span>
                </div>
                <p className="text-purple-100 text-sm">Pending Leaves</p>
                <p className="text-xs text-purple-200 mt-1">{summary.onLeaveCount} on leave today</p>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/admin/users')}
                className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                  <UserCog size={20} className="text-blue-600" />
                </div>
                <p className="font-medium text-navy-900">Users</p>
                <p className="text-sm text-silver-500">Manage employees</p>
              </button>
              <button
                onClick={() => router.push('/admin/leaves')}
                className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <Calendar size={20} className="text-purple-600" />
                </div>
                <p className="font-medium text-navy-900">Leave Approvals</p>
                {summary && summary.pendingLeaveRequests > 0 && (
                  <p className="text-sm text-warning">{summary.pendingLeaveRequests} pending</p>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/attendance')}
                className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                  <ClipboardList size={20} className="text-green-600" />
                </div>
                <p className="font-medium text-navy-900">Attendance</p>
                <p className="text-sm text-silver-500">Today&apos;s overview</p>
              </button>
              <button
                onClick={() => router.push('/admin/anomalies')}
                className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
                  <Shield size={20} className="text-orange-600" />
                </div>
                <p className="font-medium text-navy-900">Anomaly Detection</p>
                {summary && summary.openAnomalies > 0 && (
                  <p className="text-sm text-warning">{summary.openAnomalies} to review</p>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/team-activity')}
                className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-teal-200 transition-colors">
                  <Activity size={20} className="text-teal-600" />
                </div>
                <p className="font-medium text-navy-900">Team Activity</p>
                <p className="text-sm text-silver-500">Real-time view</p>
              </button>
              <button
                onClick={() => router.push('/reports')}
                className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
                  <BarChart3 size={20} className="text-indigo-600" />
                </div>
                <p className="font-medium text-navy-900">Reports</p>
                <p className="text-sm text-silver-500">Analytics & insights</p>
              </button>
              <button
                onClick={() => router.push('/chat')}
                className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group relative"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
                  <MessageSquare size={20} className="text-orange-600" />
                </div>
                <p className="font-medium text-navy-900">Messages</p>
                <p className="text-sm text-silver-500">{totalUnreadMessages > 0 ? `${totalUnreadMessages} unread` : 'Chat with team'}</p>
                {totalUnreadMessages > 0 && (
                  <span className="absolute top-2 right-2 bg-error text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                  </span>
                )}
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => router.push('/admin/settings')}
                  className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                    <Settings size={20} className="text-gray-600" />
                  </div>
                  <p className="font-medium text-navy-900">System Settings</p>
                  <p className="text-sm text-silver-500">Policies & config</p>
                </button>
              )}
            </div>
          </motion.div>

          {/* Recent Activity & Alerts */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-navy-900">Recent Activity & Alerts</h2>
              <button onClick={() => router.push('/admin/audit')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-silver-500">
                  <Activity size={48} className="mx-auto mb-3 text-silver-300" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                recentActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-silver-50 rounded-lg hover:bg-silver-100 transition-colors">
                    <div
                      className={`p-2 rounded-lg ${
                        activity.severity === 'error'
                          ? 'bg-error-light'
                          : activity.severity === 'warning'
                          ? 'bg-warning-light'
                          : 'bg-blue-100'
                      }`}
                    >
                      {activity.type === 'anomaly' ? (
                        <AlertTriangle
                          size={16}
                          className={activity.severity === 'error' ? 'text-error' : activity.severity === 'warning' ? 'text-warning' : 'text-blue-600'}
                        />
                      ) : activity.type === 'leave' ? (
                        <Calendar size={16} className="text-purple-600" />
                      ) : activity.type === 'attendance' ? (
                        <UserCheck size={16} className="text-green-600" />
                      ) : (
                        <Activity size={16} className="text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy-900">{activity.message}</p>
                      <p className="text-xs text-silver-500 mt-0.5">
                        {new Date(activity.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Additional Info Cards */}
          <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 border border-silver-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={20} className="text-blue-600" />
                <h3 className="font-semibold text-navy-900">Today&apos;s Check-ins</h3>
              </div>
              {summary && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-silver-600">Total Employees</span>
                    <span className="font-semibold text-navy-900">{summary.totalEmployees}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-silver-600">Checked In</span>
                    <span className="font-semibold text-success">{summary.checkedInCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-silver-600">On Leave</span>
                    <span className="font-semibold text-warning">{summary.onLeaveCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-silver-600">Attendance Rate</span>
                    <span className="font-semibold text-blue-600">{summary.todayAttendanceRate.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl p-5 border border-silver-200">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={20} className="text-orange-600" />
                <h3 className="font-semibold text-navy-900">System Health</h3>
              </div>
              {summary && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-silver-600">Open Anomalies</span>
                    <span className={`font-semibold ${summary.openAnomalies > 0 ? 'text-error' : 'text-success'}`}>
                      {summary.openAnomalies}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-silver-600">Pending Approvals</span>
                    <span className={`font-semibold ${summary.pendingLeaveRequests > 0 ? 'text-warning' : 'text-success'}`}>
                      {summary.pendingLeaveRequests}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-silver-600">Online Users</span>
                    <span className="font-semibold text-success">{summary.onlineCount}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
