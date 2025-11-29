'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { banUser } from '@/app/actions/admin';

interface User {
  _id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  documentType: string;
  verified: boolean;
  banned: boolean;
  listingCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (userId: string, currentBannedStatus: boolean) => {
    const action = currentBannedStatus ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      setProcessingId(userId);
      const result = await banUser(userId);
      
      if (result.success) {
        // Update user in list
        setUsers(prev => prev.map(user => 
          user._id === userId 
            ? { ...user, banned: result.data?.banned ?? !currentBannedStatus }
            : user
        ));
      } else {
        alert(result.error || `Failed to ${action} user`);
      }
    } catch (err) {
      console.error(`Error ${action}ning user:`, err);
      alert('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
            <p className="text-gray-400">Manage registered users and their access</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Users Table */}
        {users.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">No users found</h2>
            <p className="text-gray-400">No registered users in the system</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Listings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{user.fullName}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{user.mobileNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-white capitalize">{user.documentType}</div>
                          {user.verified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-300">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-300">
                              Unverified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{user.listingCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.banned ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300">
                            Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleBanToggle(user._id, user.banned)}
                          disabled={processingId === user._id}
                          className={`px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            user.banned
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {processingId === user._id ? 'Processing...' : user.banned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-white">{users.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Active Users</p>
            <p className="text-2xl font-bold text-green-400">{users.filter(u => !u.banned).length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Banned Users</p>
            <p className="text-2xl font-bold text-red-400">{users.filter(u => u.banned).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
