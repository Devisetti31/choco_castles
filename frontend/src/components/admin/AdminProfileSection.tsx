import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { UserAccount } from '../../types/store';
import { useAuth } from '../../context/AuthContext';

export const AdminProfileSection: React.FC = () => {
  const { user, token, updateUser } = useAuth();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Users management
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userActionNotice, setUserActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setUsersList(json.users || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileNotice(null);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ name, phone }),
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        updateUser({ name, phone });
        setProfileNotice('Profile details updated successfully.');
      } else {
        setProfileNotice(json.error || 'Failed to update profile.');
      }
    } catch {
      setProfileNotice('Network error connecting to profile service.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        setPasswordNotice('Password successfully updated!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        updateUser({ must_change_password: false });
      } else {
        setPasswordError(json.error || json.detail || 'Failed to change password.');
      }
    } catch {
      setPasswordError('Network error while updating password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleToggleUserActive = async (targetUser: UserAccount) => {
    try {
      const nextActive = !targetUser.is_active;
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ is_active: nextActive }),
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        setUserActionNotice(
          `User "${targetUser.name}" ${nextActive ? 'activated' : 'deactivated'}.`
        );
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextActive } : u))
        );
      }
    } catch {
      // Ignore
    }
  };

  const handleToggleUserRole = async (targetUser: UserAccount) => {
    try {
      const nextRole = targetUser.role === 'admin' ? 'customer' : 'admin';
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        setUserActionNotice(
          `User "${targetUser.name}" role updated to ${nextRole}.`
        );
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u))
        );
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs">
        <h2 className="typo-h3 text-[#1E1410]">Administrator Profile &amp; Access Control</h2>
        <p className="typo-body-secondary text-[#7A6558] mt-0.5">
          Manage your credentials, password security, and user accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information Form */}
        <div className="bg-white p-6 rounded-2xl border border-[#DECBB4] shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#F0E9DC]">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="typo-h4 text-[#1E1410]">Admin Profile Information</h3>
              <p className="typo-caption text-[#7A6558]">Contact and identity details</p>
            </div>
          </div>

          {profileNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 typo-caption font-medium">
              {profileNotice}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block typo-label text-[#1E1410] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
              />
            </div>

            <div>
              <label className="block typo-label text-[#1E1410] mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] bg-[#FAF7F2] text-[#8A7264] cursor-not-allowed"
              />
              <span className="typo-caption text-[#8A7264] mt-1 block">
                Email address is locked as the primary administrator key.
              </span>
            </div>

            <div>
              <label className="block typo-label text-[#1E1410] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9807654321"
                className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="typo-btn px-5 py-2.5 rounded-xl bg-[#8B3A2B] hover:bg-[#732E21] text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {profileSaving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-2xl border border-[#DECBB4] shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#F0E9DC]">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-800 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="typo-h4 text-[#1E1410]">Change Password</h3>
              <p className="typo-caption text-[#7A6558]">Update your administrator credentials</p>
            </div>
          </div>

          {passwordNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 typo-caption font-medium">
              {passwordNotice}
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 typo-caption font-medium">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block typo-label text-[#1E1410] mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
              />
            </div>

            <div>
              <label className="block typo-label text-[#1E1410] mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
              />
            </div>

            <div>
              <label className="block typo-label text-[#1E1410] mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="typo-btn px-5 py-2.5 rounded-xl bg-[#1E1410] hover:bg-[#341E14] text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {passwordSaving ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#DECBB4] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0E9DC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="typo-h4 text-[#1E1410]">Registered Users &amp; Roles</h3>
              <p className="typo-caption text-[#7A6558]">Customer accounts and store managers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="typo-btn text-xs px-3 py-1.5 rounded-lg border border-[#DECBB4] hover:bg-[#F4ECE1] text-[#1E1410] cursor-pointer"
          >
            Refresh Users
          </button>
        </div>

        {userActionNotice && (
          <div className="p-3 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 typo-caption font-medium">
            {userActionNotice}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#DECBB4] typo-caption uppercase tracking-wider text-[#7A6558]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E9DC] typo-body-secondary">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF7F2]/50">
                  <td className="py-3 px-4 font-semibold text-[#1E1410]">
                    {u.name}
                  </td>
                  <td className="py-3 px-4 text-[#655045] font-mono-num text-xs">
                    {u.email}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block typo-badge px-2 py-0.5 rounded-full font-semibold ${
                        u.role === 'admin'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-[#F4ECE1] text-[#7A6558]'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block typo-badge px-2 py-0.5 rounded-full ${
                        u.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== user?.id && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleUserRole(u)}
                          className="typo-btn text-xs px-2.5 py-1 rounded-lg border border-[#DECBB4] hover:bg-[#F4ECE1] text-[#1E1410] cursor-pointer"
                        >
                          Make {u.role === 'admin' ? 'Customer' : 'Admin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u)}
                          className={`typo-btn text-xs px-2.5 py-1 rounded-lg border cursor-pointer ${
                            u.is_active
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

