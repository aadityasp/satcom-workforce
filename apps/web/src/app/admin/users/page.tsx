'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Search, MoreVertical, Users, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  profile?: {
    firstName: string;
    lastName: string;
    designation?: string;
    department?: string;
  };
}

interface UsersResponse {
  data: User[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function UsersPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'HR';

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated, isAdmin]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        let url = `/users?page=${page}&limit=20`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (roleFilter) url += `&role=${roleFilter}`;

        const response = await api.get<UsersResponse>(url);
        if (response.success && response.data) {
          setUsers(response.data.data || []);
          setTotalPages(response.data.meta?.totalPages || 1);
          setTotal(response.data.meta?.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isAdmin) {
      const debounce = setTimeout(fetchUsers, search ? 300 : 0);
      return () => clearTimeout(debounce);
    }
  }, [user, isAdmin, page, search, roleFilter]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-purple-100 text-purple-700';
      case 'HR':
        return 'bg-blue-100 text-blue-700';
      case 'Manager':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-silver-100 text-silver-700';
    }
  };

  if (!_hasHydrated || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-silver-50">
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-navy-900">User Management</h1>
            </div>
            {user?.role === 'SuperAdmin' && (
              <button className="btn-primary flex items-center gap-2">
                <UserPlus size={18} />
                Add User
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <p className="text-sm text-silver-500">Total Users</p>
            <p className="text-2xl font-bold text-navy-900 mt-1">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <p className="text-sm text-silver-500">Active</p>
            <p className="text-2xl font-bold text-success mt-1">
              {users.filter((u) => u.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <p className="text-sm text-silver-500">Managers</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {users.filter((u) => u.role === 'Manager').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <p className="text-sm text-silver-500">Admins</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {users.filter((u) => u.role === 'SuperAdmin' || u.role === 'HR').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-silver-500" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-silver-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="HR">HR</option>
              <option value="SuperAdmin">Super Admin</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl border border-silver-200 p-12 text-center">
            <Users size={48} className="mx-auto text-silver-300 mb-4" />
            <p className="text-silver-500">No users found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-silver-50 border-b border-silver-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">User</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Role</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-silver-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {u.profile?.firstName?.[0] || 'U'}{u.profile?.lastName?.[0] || ''}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-navy-900">
                              {u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email}
                            </p>
                            <p className="text-sm text-silver-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-navy-700">
                        {u.profile?.department || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            u.isActive
                              ? 'bg-success-light text-success'
                              : 'bg-silver-100 text-silver-600'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 hover:bg-silver-100 rounded-lg">
                          <MoreVertical size={16} className="text-silver-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-silver-500">
              Page {page} of {totalPages} ({total} users)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-silver-200 rounded-lg hover:bg-silver-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-silver-200 rounded-lg hover:bg-silver-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
