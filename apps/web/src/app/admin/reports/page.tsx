'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, BarChart3, Users, Clock, Calendar, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ReportData {
  title: string;
  generatedAt: string;
  rows: Record<string, string | number>[];
}

export default function ReportsPage() {
  const router = useRouter();
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const reports = [
    { id: 1, name: 'Attendance Summary', desc: 'Daily attendance metrics', icon: Clock, bgColor: 'bg-blue-100', textColor: 'text-blue-600', route: '/reports/hr' },
    { id: 2, name: 'Employee Activity', desc: 'Work hours and breaks', icon: Users, bgColor: 'bg-green-100', textColor: 'text-green-600', route: '/reports/hr' },
    { id: 3, name: 'Leave Analytics', desc: 'Leave patterns and balances', icon: Calendar, bgColor: 'bg-purple-100', textColor: 'text-purple-600', route: '/reports/hr' },
    { id: 4, name: 'Anomaly Report', desc: 'Flagged events summary', icon: BarChart3, bgColor: 'bg-orange-100', textColor: 'text-orange-600', route: '/admin/anomalies' },
  ];

  const handleViewReport = (report: typeof reports[0]) => {
    router.push(report.route);
  };

  const handleExportCSV = async (report: typeof reports[0]) => {
    setExportingId(report.id);
    try {
      // Build CSV from current data by fetching summary
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      let csvContent = '';

      if (report.id === 1 || report.id === 2) {
        // Attendance data
        const res = await api.get<any>(`/attendance?startDate=${startStr}&endDate=${endStr}&limit=100`);
        if (res.success && res.data) {
          const rows = Array.isArray(res.data) ? res.data : [];
          csvContent = 'Date,User,Check In,Check Out,Status\n';
          rows.forEach((r: any) => {
            csvContent += `${r.date || ''},${r.userId || ''},${r.checkInTime || ''},${r.checkOutTime || ''},${r.status || ''}\n`;
          });
        }
      } else if (report.id === 3) {
        // Leave data
        const res = await api.get<any>(`/leaves/requests?limit=100`);
        if (res.success && res.data) {
          const rows = Array.isArray(res.data) ? res.data : [];
          csvContent = 'User,Type,Start,End,Days,Status\n';
          rows.forEach((r: any) => {
            csvContent += `${r.userId || ''},${r.leaveType?.name || ''},${r.startDate || ''},${r.endDate || ''},${r.totalDays || ''},${r.status || ''}\n`;
          });
        }
      } else if (report.id === 4) {
        // Anomaly data
        const res = await api.get<any>(`/anomalies?limit=100`);
        if (res.success && res.data) {
          const rows = Array.isArray(res.data) ? res.data : [];
          csvContent = 'Date,User,Type,Severity,Status,Description\n';
          rows.forEach((r: any) => {
            csvContent += `${r.detectedAt || ''},${r.userId || ''},${r.type || ''},${r.severity || ''},${r.status || ''},${(r.description || '').replace(/,/g, ';')}\n`;
          });
        }
      }

      if (!csvContent) {
        csvContent = 'No data available for this report.\n';
      }

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-silver-50">
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-navy-900">Reports & Analytics</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-silver-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${report.bgColor}`}>
                    <report.icon size={24} className={report.textColor} />
                  </div>
                  <div>
                    <h3 className="font-medium text-navy-900">{report.name}</h3>
                    <p className="text-sm text-silver-500">{report.desc}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleExportCSV(report)}
                  disabled={exportingId === report.id}
                  className="btn-secondary text-sm py-1.5 flex items-center gap-2 disabled:opacity-50"
                >
                  {exportingId === report.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {exportingId === report.id ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  onClick={() => handleViewReport(report)}
                  className="btn-primary text-sm py-1.5"
                >
                  View Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
