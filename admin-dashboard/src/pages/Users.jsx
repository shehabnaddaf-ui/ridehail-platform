import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    client.get('/admin/users')
      .then(({ data }) => {
        if (data.success) setUsers(data.users || []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  const blockUser = async (userId) => {
    const reason = prompt('Enter reason for blocking:');
    if (!reason) return;
    
    try {
      await client.patch(`/admin/users/${userId}/block`, { reason });
      fetchUsers();
    } catch (error) {
      alert('Failed to block user');
    }
  };

  const unblockUser = async (userId) => {
    try {
      await client.patch(`/admin/users/${userId}/unblock`);
      fetchUsers();
    } catch (error) {
      alert('Failed to unblock user');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10B981]"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            Customers <span className="text-[#10B981]">Management</span>
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">View and manage customer accounts.</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 justify-between items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-2xl border border-[#3A506B]">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B132B] border border-[#3A506B] rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#10B981] transition-all"
          />
          <span className="absolute left-3 top-2.5 opacity-50">🔍</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="elite-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(0,0,0,0.2)] text-[#94A3B8] text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Customer Name</th>
                <th className="p-4 font-semibold">Phone Contact</th>
                <th className="p-4 font-semibold">Total Trips</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-[#3A506B]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 font-bold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-xs font-bold ring-1 ring-[#10B981]/50">
                      {user.full_name?.charAt(0) || '?'}
                    </div>
                    {user.full_name}
                  </td>
                  <td className="p-4 font-mono text-sm text-[#94A3B8]">{user.phone}</td>
                  <td className="p-4 text-[#94A3B8]">{user.total_trips || 0}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      user.is_blocked
                        ? 'bg-red-500/10 text-red-500 border-red-500/30'
                        : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                    }`}>
                      {user.is_blocked ? 'BLOCKED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {user.is_blocked ? (
                      <button
                        onClick={() => unblockUser(user.id)}
                        className="px-3 py-1.5 bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981] rounded-lg hover:bg-[#10B981] hover:text-[#0B132B] transition-all text-xs font-bold uppercase tracking-wide"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => blockUser(user.id)}
                        className="px-3 py-1.5 bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[#EF4444] rounded-lg hover:bg-[#EF4444] hover:text-white transition-all text-xs font-bold uppercase tracking-wide"
                      >
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-4xl opacity-50">📭</span>
              <p className="text-[#94A3B8] font-semibold">No customers found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
