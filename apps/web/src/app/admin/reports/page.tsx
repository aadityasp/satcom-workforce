'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, BarChart3, Users, Clock, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();

  const reports = [
    { id: 1, name: 'Attendance Summary', desc: 'Daily attendance metrics', icon: Clock, color: 'blue' },
    { id: 2, name: 'Employee Activity', desc: 'Work hours and breaks', icon: Users, color: 'green' },
    { id: 3, name: 'Leave Analytics', desc: 'Leave patterns and balances', icon: Calendar, color: 'purple' },
    { id: 4, name: 'Anomaly Report', desc: 'Flagged events summary', icon: BarChart3, color: 'orange' },
  ];

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
                  <div className={`p-3 rounded-lg bg-${report.color}-100`}>
                    <report.icon size={24} className={`text-${report.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-navy-900">{report.name}</h3>
                    <p className="text-sm text-silver-500">{report.desc}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary text-sm py-1.5 flex items-center gap-2">
                  <Download size={16} />
                  Export CSV
                </button>
                <button className="btn-primary text-sm py-1.5">View Report</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
