'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Search, MoreVertical, Users, Filter, X, Eye, Edit3, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
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

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'Employee',
    department: '',
    designation: '',
    employeeCode: '',
    joinDate: new Date().toISOString().split('T')[0],
    phone: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'HR';

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated, isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = `/users?page=${page}&limit=20`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (roleFilter) url += `&role=${roleFilter}`;

      const response = await api.get<any>(url);
      if (response.success) {
        setUsers(response.data || []);
        setTotalPages((response as any).meta?.totalPages || 1);
        setTotal((response as any).meta?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      const debounce = setTimeout(fetchUsers, search ? 300 : 0);
      return () => clearTimeout(debounce);
    }
  }, [user, isAdmin, page, search, roleFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin': return 'bg-purple-100 text-purple-700';
      case 'HR': return 'bg-blue-100 text-blue-700';
      case 'Manager': return 'bg-green-100 text-green-700';
      default: return 'bg-silver-100 text-silver-700';
    }
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'Employee', department: '', designation: '', employeeCode: '', joinDate: new Date().toISOString().split('T')[0], phone: '' });
    setFormError('');
  };

  const handleAddUser = async () => {
    setFormError('');
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setFormError('Email, password, first name, and last name are required.');
      return;
    }
    if (!formData.employeeCode) {
      setFormError('Employee code is required.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await api.post<any>('/users', {
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        role: formData.role,
        profile: {
          employeeCode: formData.employeeCode,
          firstName: formData.firstName,
          lastName: formData.lastName,
          designation: formData.designation || 'Employee',
          department: formData.department || undefined,
          joinDate: formData.joinDate || new Date().toISOString().split('T')[0],
        },
      });
      if (res.success) {
        setShowAddModal(false);
        resetForm();
        fetchUsers();
      } else {
        setFormError(res.error?.message || 'Failed to create user');
      }
    } catch (error: any) {
      setFormError(error?.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setFormError('');
    setFormLoading(true);
    try {
      const res = await api.patch<any>(`/users/${selectedUser.id}`, {
        role: formData.role,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
        },
      });
      if (res.success) {
        setShowEditModal(false);
        resetForm();
        setSelectedUser(null);
        fetchUsers();
      } else {
        setFormError(res.error?.message || 'Failed to update user');
      }
    } catch (error: any) {
      setFormError(error?.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.patch<any>(`/users/${u.id}`, { isActive: !u.isActive });
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
    setActiveMenu(null);
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setFormData({
      email: u.email,
      password: '',
      firstName: u.profile?.firstName || '',
      lastName: u.profile?.lastName || '',
      role: u.role,
      department: u.profile?.department || '',
      designation: u.profile?.designation || '',
      employeeCode: (u as any).profile?.employeeCode || '',
      joinDate: (u as any).profile?.joinDate ? new Date((u as any).profile.joinDate).toISOString().split('T')[0] : '',
      phone: (u as any).phone || '',
    });
    setFormError('');
    setShowEditModal(true);
    setActiveMenu(null);
  };

  const openViewModal = (u: User) => {
    setSelectedUser(u);
    setShowViewModal(true);
    setActiveMenu(null);
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
              <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="btn-primary flex items-center gap-2"
              >
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
                        <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-success-light text-success' : 'bg-silver-100 text-silver-600'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative" ref={activeMenu === u.id ? menuRef : undefined}>
                          <button
                            onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                            className="p-2 hover:bg-silver-100 rounded-lg"
                          >
                            <MoreVertical size={16} className="text-silver-400" />
                          </button>
                          {activeMenu === u.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-silver-200 z-50 py-1">
                              <button
                                onClick={() => openViewModal(u)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-navy-700 hover:bg-silver-50 transition-colors"
                              >
                                <Eye size={16} /> View Details
                              </button>
                              {user?.role === 'SuperAdmin' && (
                                <>
                                  <button
                                    onClick={() => openEditModal(u)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-navy-700 hover:bg-silver-50 transition-colors"
                                  >
                                    <Edit3 size={16} /> Edit User
                                  </button>
                                  <button
                                    onClick={() => handleToggleActive(u)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-navy-700 hover:bg-silver-50 transition-colors"
                                  >
                                    {u.isActive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
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

      {/* ===== ADD USER MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-silver-200">
              <h2 className="text-lg font-semibold text-navy-900">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-silver-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Join Date</label>
                  <input
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+91..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="HR">HR</option>
                  <option value="SuperAdmin">Super Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-silver-200">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-silver-200 rounded-lg hover:bg-silver-50">
                Cancel
              </button>
              <button onClick={handleAddUser} disabled={formLoading} className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
                {formLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT USER MODAL ===== */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-silver-200">
              <h2 className="text-lg font-semibold text-navy-900">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-silver-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
                <input type="email" value={formData.email} disabled className="w-full px-3 py-2 border border-silver-200 rounded-lg bg-silver-50 text-silver-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="HR">HR</option>
                  <option value="SuperAdmin">Super Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-silver-200">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm border border-silver-200 rounded-lg hover:bg-silver-50">
                Cancel
              </button>
              <button onClick={handleEditUser} disabled={formLoading} className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW USER MODAL ===== */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-silver-200">
              <h2 className="text-lg font-semibold text-navy-900">User Details</h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-silver-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {selectedUser.profile?.firstName?.[0] || 'U'}{selectedUser.profile?.lastName?.[0] || ''}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-navy-900">
                    {selectedUser.profile ? `${selectedUser.profile.firstName} ${selectedUser.profile.lastName}` : selectedUser.email}
                  </p>
                  <p className="text-silver-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-silver-100">
                <div>
                  <p className="text-xs text-silver-500 uppercase">Role</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full font-medium ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-silver-500 uppercase">Status</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${selectedUser.isActive ? 'bg-success-light text-success' : 'bg-silver-100 text-silver-600'}`}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-silver-500 uppercase">Department</p>
                  <p className="text-sm text-navy-900 mt-1">{selectedUser.profile?.department || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-silver-500 uppercase">Designation</p>
                  <p className="text-sm text-navy-900 mt-1">{selectedUser.profile?.designation || '-'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end p-6 border-t border-silver-200">
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 text-sm border border-silver-200 rounded-lg hover:bg-silver-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
