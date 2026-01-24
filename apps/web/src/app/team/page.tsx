'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Phone, Mail } from 'lucide-react';

export default function TeamPage() {
  const router = useRouter();

  const team = [
    { id: 1, name: 'Sarah Johnson', role: 'Manager', dept: 'Sales', status: 'Online', location: 'Office' },
    { id: 2, name: 'Mike Chen', role: 'Developer', dept: 'Engineering', status: 'Online', location: 'Remote' },
    { id: 3, name: 'Emily Davis', role: 'HR Manager', dept: 'HR', status: 'Away', location: 'Office' },
    { id: 4, name: 'Alex Kumar', role: 'Operations Lead', dept: 'Operations', status: 'Online', location: 'Customer Site' },
    { id: 5, name: 'Lisa Wang', role: 'Designer', dept: 'Engineering', status: 'Offline', location: '-' },
    { id: 6, name: 'David Brown', role: 'Sales Rep', dept: 'Sales', status: 'Online', location: 'Office' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online': return 'bg-success';
      case 'Away': return 'bg-warning';
      default: return 'bg-silver-400';
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
            <h1 className="text-lg font-semibold text-navy-900">Team</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member) => (
            <div key={member.id} className="bg-white rounded-xl border border-silver-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${getStatusColor(member.status)} border-2 border-white rounded-full`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-navy-900">{member.name}</h3>
                  <p className="text-sm text-silver-500">{member.role}</p>
                  <p className="text-xs text-silver-400 mt-1">{member.dept} • {member.location}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => router.push(`/chat?user=${member.name.toLowerCase().replace(' ', '-')}`)}
                  className="flex-1 btn-secondary text-sm py-1.5 flex items-center justify-center gap-2"
                >
                  <MessageSquare size={14} />
                  Message
                </button>
                <button className="p-2 border border-silver-200 rounded-lg hover:bg-silver-50">
                  <Phone size={14} className="text-silver-500" />
                </button>
                <button className="p-2 border border-silver-200 rounded-lg hover:bg-silver-50">
                  <Mail size={14} className="text-silver-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
