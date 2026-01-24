'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function TimesheetsPage() {
  const router = useRouter();

  const timesheets = [
    { id: 1, project: 'Project Alpha', date: 'Jan 20, 2024', hours: 6, status: 'Submitted' },
    { id: 2, project: 'Client Support', date: 'Jan 19, 2024', hours: 4, status: 'Approved' },
    { id: 3, project: 'Internal Training', date: 'Jan 18, 2024', hours: 2, status: 'Draft' },
    { id: 4, project: 'Project Beta', date: 'Jan 17, 2024', hours: 8, status: 'Approved' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle };
      case 'Submitted': return { bg: 'bg-blue-100', text: 'text-blue-600', icon: Clock };
      default: return { bg: 'bg-silver-100', text: 'text-silver-600', icon: AlertCircle };
    }
  };

  return (
    <div className="min-h-screen bg-silver-50">
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-navy-900">Timesheets</h1>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              New Entry
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
          <div className="divide-y divide-silver-100">
            {timesheets.map((entry) => {
              const style = getStatusStyle(entry.status);
              const StatusIcon = style.icon;
              return (
                <div key={entry.id} className="p-4 hover:bg-silver-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${style.bg}`}>
                      <StatusIcon size={20} className={style.text} />
                    </div>
                    <div>
                      <h3 className="font-medium text-navy-900">{entry.project}</h3>
                      <p className="text-sm text-silver-500">{entry.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-navy-900">{entry.hours}h</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${style.bg} ${style.text}`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
