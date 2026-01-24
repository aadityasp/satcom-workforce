'use client';

/**
 * Dashboard Page
 *
 * Role-based dashboard:
 * - SuperAdmin/HR: Admin panel with leave approvals, attendance overview, anomalies
 * - Manager: Team overview + own attendance
 * - Employee: Personal attendance and quick actions
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Clock,
  Coffee,
  LogOut,
  MapPin,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Bell,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Settings,
  Shield,
  BarChart3,
  UserCog,
  Loader2,
  X,
  ClipboardList,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { ActivityStatusBar, TaskBreakdownCard } from '@/components/presence';

interface AttendanceStatus {
  isCheckedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  workMode?: string;
  currentBreak?: { id: string; type: string; startTime: string } | null;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  attendanceDayId?: string;
}

interface AdminSummary {
  onlineCount: number;
  checkedInCount: number;
  onLeaveCount: number;
  openAnomalies: number;
  pendingLeaveRequests: number;
  todayAttendanceRate: number;
}

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  leaveType: { name: string };
  user: { id: string; profile: { firstName: string; lastName: string } };
}

interface Anomaly {
  id: string;
  type: string;
  severity: string;
  status: string;
  detectedAt: string;
  user: { profile: { firstName: string; lastName: string } };
}

interface PresenceUser {
  id: string;
  status: string;
  currentWorkMode?: string;
  currentProject?: { id: string; name: string; code: string } | null;
  currentTask?: { id: string; name: string; code: string } | null;
  profile: { firstName: string; lastName: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
  tasks: { id: string; name: string; code: string }[];
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, _hasHydrated } = useAuthStore();

  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isCheckedIn: false,
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
  });
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [presenceList, setPresenceList] = useState<PresenceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'HR';

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    }
  }, [user, router, _hasHydrated]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const [attendanceRes, projectsRes] = await Promise.all([
        api.get<any>('/attendance/today'),
        api.get<Project[]>('/timesheets/projects'),
      ]);

      if (attendanceRes.success && attendanceRes.data) {
        const data = attendanceRes.data;
        setAttendance({
          isCheckedIn: !!data.checkInTime && !data.checkOutTime,
          checkInTime: data.checkInTime ? new Date(data.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
          checkOutTime: data.checkOutTime ? new Date(data.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
          workMode: data.workMode,
          currentBreak: data.breaks?.find((b: any) => !b.endTime) || null,
          totalWorkMinutes: data.totalWorkMinutes || 0,
          totalBreakMinutes: data.totalBreakMinutes || 0,
          attendanceDayId: data.id,
        });
      } else {
        setAttendance({ isCheckedIn: false, totalWorkMinutes: 0, totalBreakMinutes: 0 });
      }

      if (projectsRes.success && projectsRes.data) {
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
    try {
      const [summaryRes, leavesRes, anomaliesRes, presenceRes] = await Promise.all([
        api.get<AdminSummary>('/admin/dashboard/summary'),
        api.get<LeaveRequest[]>('/leaves/requests/pending'),
        api.get<{ data: Anomaly[] }>('/anomalies?status=Open&limit=5'),
        api.get<{ users: PresenceUser[] }>('/presence/list'),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setAdminSummary(summaryRes.data);
      }
      if (leavesRes.success && leavesRes.data) {
        setPendingLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
      }
      if (anomaliesRes.success && anomaliesRes.data) {
        setAnomalies(anomaliesRes.data.data || []);
      }
      if (presenceRes.success && presenceRes.data) {
        setPresenceList(presenceRes.data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (isAdmin) {
          await fetchAdminData();
        } else {
          await fetchTodayAttendance();
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, isAdmin, fetchTodayAttendance, fetchAdminData]);

  const handleCheckIn = async (workMode: string = 'Office') => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await api.post('/attendance/check-in', { workMode, latitude: 0, longitude: 0 });
      if (response.success) {
        await fetchTodayAttendance();
      } else {
        setActionError(response.error?.message || 'Check-in failed');
      }
    } catch (error) {
      setActionError('Network error. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await api.post('/attendance/check-out', { latitude: 0, longitude: 0 });
      if (response.success) {
        await fetchTodayAttendance();
      } else {
        setActionError(response.error?.message || 'Check-out failed');
      }
    } catch (error) {
      setActionError('Network error. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartBreak = async (breakType: string = 'Break') => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await api.post('/attendance/break/start', { type: breakType });
      if (response.success) {
        await fetchTodayAttendance();
      } else {
        setActionError(response.error?.message || 'Failed to start break');
      }
    } catch (error) {
      setActionError('Network error. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!attendance.currentBreak?.id) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await api.post(`/attendance/break/${attendance.currentBreak.id}/end`, {});
      if (response.success) {
        await fetchTodayAttendance();
      } else {
        setActionError(response.error?.message || 'Failed to end break');
      }
    } catch (error) {
      setActionError('Network error. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await api.post(`/leaves/requests/${leaveId}/approve`, {});
      if (response.success) {
        setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
        if (adminSummary) {
          setAdminSummary({ ...adminSummary, pendingLeaveRequests: adminSummary.pendingLeaveRequests - 1 });
        }
      } else {
        setActionError(response.error?.message || 'Failed to approve leave');
      }
    } catch (error) {
      setActionError('Network error. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await api.post(`/leaves/requests/${leaveId}/reject`, { reason });
      if (response.success) {
        setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
        if (adminSummary) {
          setAdminSummary({ ...adminSummary, pendingLeaveRequests: adminSummary.pendingLeaveRequests - 1 });
        }
      } else {
        setActionError(response.error?.message || 'Failed to reject leave');
      }
    } catch (error) {
      setActionError('Network error. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcknowledgeAnomaly = async (anomalyId: string) => {
    setIsActionLoading(true);
    try {
      const response = await api.post(`/anomalies/${anomalyId}/acknowledge`, {});
      if (response.success) {
        setAnomalies((prev) => prev.filter((a) => a.id !== anomalyId));
      }
    } catch (error) {
      console.error('Failed to acknowledge anomaly:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateCurrentWork = async (projectId: string, taskId: string) => {
    try {
      await api.post('/presence/heartbeat', { projectId: projectId || undefined, taskId: taskId || undefined });
      setSelectedProjectId(projectId);
      setSelectedTaskId(taskId);
    } catch (error) {
      console.error('Failed to update current work:', error);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
              <button className="relative p-2 text-silver-500 hover:text-navy-900 transition-colors">
                <Bell size={20} />
                {(adminSummary?.openAnomalies || 0) > 0 && (
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

          {/* Error Message */}
          {actionError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-error-light border border-error/20 text-error rounded-lg px-4 py-3 flex justify-between items-center">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)}><X size={18} /></button>
            </motion.div>
          )}

          {/* Admin Dashboard */}
          {isAdmin && adminSummary && (
            <>
              {/* Stats Cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <UserCheck size={24} />
                    <span className="text-2xl font-bold">{adminSummary.checkedInCount}</span>
                  </div>
                  <p className="text-blue-100 text-sm">Checked In Today</p>
                  <p className="text-xs text-blue-200 mt-1">{adminSummary.todayAttendanceRate}% attendance</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <Users size={24} />
                    <span className="text-2xl font-bold">{adminSummary.onlineCount}</span>
                  </div>
                  <p className="text-green-100 text-sm">Currently Online</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <AlertTriangle size={24} />
                    <span className="text-2xl font-bold">{adminSummary.openAnomalies}</span>
                  </div>
                  <p className="text-orange-100 text-sm">Open Anomalies</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <Calendar size={24} />
                    <span className="text-2xl font-bold">{adminSummary.pendingLeaveRequests}</span>
                  </div>
                  <p className="text-purple-100 text-sm">Pending Leaves</p>
                </div>
              </motion.div>

              {/* Admin Controls */}
              <motion.div variants={itemVariants}>
                <h2 className="text-lg font-semibold text-navy-900 mb-4">Admin Controls</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <button onClick={() => router.push('/admin/users')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                      <UserCog size={20} className="text-blue-600" />
                    </div>
                    <p className="font-medium text-navy-900">Users</p>
                    <p className="text-sm text-silver-500">Manage employees</p>
                  </button>
                  <button onClick={() => router.push('/admin/leaves')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                      <Calendar size={20} className="text-purple-600" />
                    </div>
                    <p className="font-medium text-navy-900">Leaves</p>
                    <p className="text-sm text-warning">{adminSummary.pendingLeaveRequests} pending</p>
                  </button>
                  <button onClick={() => router.push('/admin/attendance')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                      <ClipboardList size={20} className="text-green-600" />
                    </div>
                    <p className="font-medium text-navy-900">Attendance</p>
                    <p className="text-sm text-silver-500">Today's overview</p>
                  </button>
                  <button onClick={() => router.push('/admin/anomalies')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
                      <Shield size={20} className="text-orange-600" />
                    </div>
                    <p className="font-medium text-navy-900">Anomalies</p>
                    <p className="text-sm text-warning">{adminSummary.openAnomalies} to review</p>
                  </button>
                  <button onClick={() => router.push('/admin/team-activity')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-teal-200 transition-colors">
                      <Users size={20} className="text-teal-600" />
                    </div>
                    <p className="font-medium text-navy-900">Team Activity</p>
                    <p className="text-sm text-silver-500">View activities</p>
                  </button>
                  {user.role === 'SuperAdmin' && (
                    <button onClick={() => router.push('/admin/settings')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                        <Settings size={20} className="text-gray-600" />
                      </div>
                      <p className="font-medium text-navy-900">Settings</p>
                      <p className="text-sm text-silver-500">Policies & config</p>
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Pending Leave Requests */}
              {pendingLeaves.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-navy-900">Pending Leave Requests</h2>
                    <button onClick={() => router.push('/admin/leaves')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View all <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {pendingLeaves.slice(0, 5).map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 bg-silver-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-medium text-sm">
                              {leave.user.profile.firstName[0]}{leave.user.profile.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-navy-900">{leave.user.profile.firstName} {leave.user.profile.lastName}</p>
                            <p className="text-sm text-silver-500">
                              {leave.leaveType.name} • {formatDate(leave.startDate)} - {formatDate(leave.endDate)} ({leave.totalDays} days)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveLeave(leave.id)}
                            disabled={isActionLoading}
                            className="px-3 py-1.5 bg-success text-white text-sm rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave.id)}
                            disabled={isActionLoading}
                            className="px-3 py-1.5 bg-error text-white text-sm rounded-lg hover:bg-error/90 disabled:opacity-50 flex items-center gap-1"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Active Anomalies */}
              {anomalies.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-navy-900">Active Anomalies</h2>
                    <button onClick={() => router.push('/admin/anomalies')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View all <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {anomalies.slice(0, 3).map((anomaly) => (
                      <div key={anomaly.id} className="flex items-center justify-between p-3 bg-silver-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${anomaly.severity === 'High' ? 'bg-error-light' : anomaly.severity === 'Medium' ? 'bg-warning-light' : 'bg-blue-100'}`}>
                            <AlertTriangle size={18} className={anomaly.severity === 'High' ? 'text-error' : anomaly.severity === 'Medium' ? 'text-warning' : 'text-blue-600'} />
                          </div>
                          <div>
                            <p className="font-medium text-navy-900">{anomaly.type}</p>
                            <p className="text-sm text-silver-500">
                              {anomaly.user.profile.firstName} {anomaly.user.profile.lastName} • {new Date(anomaly.detectedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcknowledgeAnomaly(anomaly.id)}
                          disabled={isActionLoading}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Team Activity */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-navy-900">Team Activity</h2>
                  <button onClick={() => router.push('/admin/attendance')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View all <ChevronRight size={16} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-silver-500 uppercase border-b border-silver-100">
                        <th className="pb-3 font-medium">Employee</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Working On</th>
                        <th className="pb-3 font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-silver-50">
                      {presenceList.slice(0, 10).map((person) => (
                        <tr key={person.id} className="hover:bg-silver-50">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-xs font-medium">
                                    {person.profile.firstName[0]}{person.profile.lastName[0]}
                                  </span>
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${
                                  person.status === 'Online' ? 'bg-success' : person.status === 'Away' ? 'bg-warning' : 'bg-silver-400'
                                }`} />
                              </div>
                              <span className="text-sm font-medium text-navy-900">{person.profile.firstName} {person.profile.lastName}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              person.status === 'Online' ? 'bg-success-light text-success' :
                              person.status === 'Away' ? 'bg-warning-light text-warning' : 'bg-silver-100 text-silver-600'
                            }`}>
                              {person.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {person.currentProject ? (
                              <div>
                                <p className="text-sm text-navy-900">{person.currentProject.name}</p>
                                {person.currentTask && (
                                  <p className="text-xs text-silver-500">{person.currentTask.name}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-silver-400">-</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-silver-600">{person.currentWorkMode || 'Office'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}

          {/* Employee Dashboard */}
          {!isAdmin && (
            <>
              {/* Attendance Card */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${attendance.isCheckedIn ? 'bg-success-light' : 'bg-silver-100'}`}>
                      <Clock size={28} className={attendance.isCheckedIn ? 'text-success' : 'text-silver-400'} />
                    </div>
                    <div>
                      <p className="text-sm text-silver-500">Today's Status</p>
                      <p className="text-lg font-semibold text-navy-900">
                        {attendance.checkOutTime ? (
                          <>Day completed <span className="ml-2 text-sm font-normal text-silver-500">({attendance.checkInTime} - {attendance.checkOutTime})</span></>
                        ) : attendance.isCheckedIn ? (
                          <>Checked in at {attendance.checkInTime} <span className="ml-2 text-sm font-normal text-silver-500">({attendance.workMode})</span></>
                        ) : (
                          'Not checked in yet'
                        )}
                      </p>
                      {attendance.currentBreak && (
                        <p className="text-sm text-warning mt-1">
                          On {attendance.currentBreak.type} since {new Date(attendance.currentBreak.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {attendance.checkOutTime ? (
                      <div className="text-sm text-silver-500 flex items-center gap-2">
                        <CheckCircle size={18} className="text-success" /> Day complete
                      </div>
                    ) : attendance.isCheckedIn ? (
                      <>
                        {attendance.currentBreak ? (
                          <button onClick={handleEndBreak} disabled={isActionLoading} className="btn-secondary flex items-center gap-2">
                            {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <Coffee size={18} />} End Break
                          </button>
                        ) : (
                          <button onClick={() => handleStartBreak('Break')} disabled={isActionLoading} className="btn-secondary flex items-center gap-2">
                            {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <Coffee size={18} />} Start Break
                          </button>
                        )}
                        <button onClick={handleCheckOut} disabled={isActionLoading || !!attendance.currentBreak} className="btn-primary flex items-center gap-2 bg-error hover:bg-error/90 disabled:opacity-50">
                          {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />} Check Out
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleCheckIn('Office')} disabled={isActionLoading} className="btn-primary flex items-center gap-2">
                        {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />} Check In
                      </button>
                    )}
                  </div>
                </div>

                {(attendance.isCheckedIn || attendance.checkOutTime) && (
                  <div className="mt-6 pt-6 border-t border-silver-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-silver-500 uppercase tracking-wider">Work Time</p>
                      <p className="text-lg font-semibold text-navy-900">{formatDuration(attendance.totalWorkMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-silver-500 uppercase tracking-wider">Break Time</p>
                      <p className="text-lg font-semibold text-navy-900">{formatDuration(attendance.totalBreakMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-silver-500 uppercase tracking-wider">Target</p>
                      <p className="text-lg font-semibold text-navy-900">8h 0m</p>
                    </div>
                    <div>
                      <p className="text-xs text-silver-500 uppercase tracking-wider">{attendance.checkOutTime ? 'Overtime' : 'Remaining'}</p>
                      <p className={`text-lg font-semibold ${attendance.totalWorkMinutes >= 480 ? 'text-success' : 'text-blue-600'}`}>
                        {attendance.totalWorkMinutes >= 480 ? `+${formatDuration(attendance.totalWorkMinutes - 480)}` : formatDuration(480 - attendance.totalWorkMinutes)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Current Work Selector - Only when checked in and not checked out */}
                {attendance.isCheckedIn && !attendance.checkOutTime && projects.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-silver-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase size={18} className="text-blue-600" />
                      <p className="text-sm font-medium text-navy-900">What are you working on?</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={selectedProjectId}
                        onChange={(e) => {
                          const newProjectId = e.target.value;
                          setSelectedProjectId(newProjectId);
                          setSelectedTaskId('');
                          handleUpdateCurrentWork(newProjectId, '');
                        }}
                        className="flex-1 px-3 py-2 border border-silver-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      {selectedProjectId && (
                        <select
                          value={selectedTaskId}
                          onChange={(e) => {
                            const newTaskId = e.target.value;
                            setSelectedTaskId(newTaskId);
                            handleUpdateCurrentWork(selectedProjectId, newTaskId);
                          }}
                          className="flex-1 px-3 py-2 border border-silver-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a task...</option>
                          {projects.find(p => p.id === selectedProjectId)?.tasks.map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {selectedProjectId && (
                      <p className="text-xs text-silver-500 mt-2">
                        Your team can see what you&apos;re working on
                      </p>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Quick Actions */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button onClick={() => router.push('/attendance')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-teal-200 transition-colors">
                    <Clock size={20} className="text-teal-600" />
                  </div>
                  <p className="font-medium text-navy-900">Attendance</p>
                  <p className="text-sm text-silver-500">View timeline</p>
                </button>
                <button onClick={() => router.push('/timesheets')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <p className="font-medium text-navy-900">Timesheets</p>
                  <p className="text-sm text-silver-500">Log your time</p>
                </button>
                <button onClick={() => router.push('/leaves')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                    <Calendar size={20} className="text-purple-600" />
                  </div>
                  <p className="font-medium text-navy-900">Leave</p>
                  <p className="text-sm text-silver-500">Request time off</p>
                </button>
                <button onClick={() => router.push('/team')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                    <Users size={20} className="text-green-600" />
                  </div>
                  <p className="font-medium text-navy-900">Team</p>
                  <p className="text-sm text-silver-500">View colleagues</p>
                </button>
                <button onClick={() => router.push('/chat')} className="bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
                    <MessageSquare size={20} className="text-orange-600" />
                  </div>
                  <p className="font-medium text-navy-900">Messages</p>
                  <p className="text-sm text-silver-500">Chat with team</p>
                </button>
              </motion.div>

              {/* Activity Section */}
              <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
                <ActivityStatusBar />
                <TaskBreakdownCard period="today" />
              </motion.div>

              {/* Manager Team Activity Link */}
              {user.role === 'Manager' && (
                <motion.div variants={itemVariants}>
                  <button
                    onClick={() => router.push('/admin/team-activity')}
                    className="w-full bg-white rounded-xl p-4 border border-silver-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Users size={20} className="text-teal-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-navy-900">View Team Activity</p>
                        <p className="text-sm text-silver-500">See what your team is working on</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-silver-400" />
                  </button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
