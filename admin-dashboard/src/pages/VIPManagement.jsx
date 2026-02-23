import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function VIPManagement() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get(`/vip/users?status=${filter}`),
      client.get('/vip/stats'),
    ]).then(([usersRes, statsRes]) => {
      if (usersRes.data.success) setUsers(usersRes.data.users || []);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [filter]);

  const toggleVIP = async (userId, currentStatus) => {
    try {
      await client.patch(`/vip/users/${userId}/status`, { vip_status: !currentStatus });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, vip_status: !currentStatus } : u)));
      if (stats) {
        setStats((prev) => ({
          ...prev,
          total_vip_users: prev.total_vip_users + (currentStatus ? -1 : 1),
        }));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update VIP status');
    }
  };

  const assignReward = async (userId) => {
    const type = prompt('Reward type (discount/free_trip/special_offer):', 'discount');
    const value = prompt('Reward value (for discount, percentage):', '20');
    if (!type) return;
    try {
      await client.post(`/vip/users/${userId}/reward`, {
        reward_type: type,
        reward_value: parseFloat(value) || 0,
        description: `Manual reward: ${type}`,
      });
      alert('Reward assigned successfully! 🎁');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign reward');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FBBF24]"></div></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">VIP Command <span className="text-[#FBBF24]">Center</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Manage Elite riders, gamification stats, and distribute manual rewards.</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="elite-glass p-6 border-[#FBBF24]/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
            <div className="text-[#94A3B8] text-sm font-semibold uppercase tracking-wider">Total Elite VIPs</div>
            <div className="text-4xl font-bold text-[#FBBF24] mt-4">{stats.total_vip_users}</div>
          </div>
          <div className="elite-glass p-6">
            <div className="text-[#94A3B8] text-sm font-semibold uppercase tracking-wider">Rewards Given</div>
            <div className="text-4xl font-bold text-[#10B981] mt-4">{stats.total_rewards_given}</div>
          </div>
          <div className="elite-glass p-6">
            <div className="text-[#94A3B8] text-sm font-semibold uppercase tracking-wider">New VIPs (Week)</div>
            <div className="text-4xl font-bold text-[#FBBF24] mt-4">+{stats.vip_activated_this_week}</div>
          </div>
          <div className="elite-glass p-6">
            <div className="text-[#94A3B8] text-sm font-semibold uppercase tracking-wider">VIP Trips Driven</div>
            <div className="text-4xl font-bold text-[#10B981] mt-4">{stats.total_vip_trips}</div>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-2xl border border-[#3A506B]">
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-6 py-2 rounded-xl font-bold transition-all ${filter === 'all' ? 'bg-[#FBBF24] text-[#0B132B]' : 'bg-[#14213D] text-[#94A3B8] border border-[#3A506B] hover:bg-[#10B981]/20'}`}>All</button>
          <button onClick={() => setFilter('vip')} className={`px-6 py-2 rounded-xl font-bold transition-all ${filter === 'vip' ? 'bg-[#FBBF24] text-[#0B132B]' : 'bg-[#14213D] text-[#94A3B8] border border-[#3A506B] hover:bg-[#10B981]/20'}`}>VIP Only</button>
          <button onClick={() => setFilter('non_vip')} className={`px-6 py-2 rounded-xl font-bold transition-all ${filter === 'non_vip' ? 'bg-[#FBBF24] text-[#0B132B]' : 'bg-[#14213D] text-[#94A3B8] border border-[#3A506B] hover:bg-[#10B981]/20'}`}>Standard</button>
        </div>

        <button
          onClick={async () => { await client.post('/vip/auto-activate'); alert('Auto-activation check completed'); }}
          className="ml-auto px-6 py-2 bg-[#10B981] text-white font-bold rounded-xl shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:bg-[#059669] transition-all flex items-center gap-2"
        >
          <span>⚡</span> Run Auto-Evaluate
        </button>
      </div>

      {/* Users Table */}
      <div className="elite-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(0,0,0,0.2)] text-[#94A3B8] text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Level</th>
                <th className="p-4 font-semibold">Trips</th>
                <th className="p-4 font-semibold">Rewards</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-[#3A506B]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 font-bold">{u.full_name || u.phone}</td>
                  <td className="p-4">
                    {u.vip_status ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(251,191,36,0.1)] text-[#FBBF24] text-xs font-bold border border-[#FBBF24]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse"></span>
                        ELITE VIP
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] text-sm">Standard</span>
                    )}
                  </td>
                  <td className="p-4 text-[#10B981] font-bold">Lvl {u.vip_level || 0}</td>
                  <td className="p-4">{u.total_trips || 0}</td>
                  <td className="p-4 text-[#FBBF24]">{u.total_rewards || 0}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {u.vip_status && (
                      <button
                        onClick={() => assignReward(u.id)}
                        className="px-4 py-1.5 bg-[rgba(251,191,36,0.1)] text-[#FBBF24] border border-[#FBBF24] rounded-lg hover:bg-[#FBBF24] hover:text-[#0B132B] transition-all text-sm font-bold"
                      >
                        🎁 Gift Reward
                      </button>
                    )}
                    <button
                      onClick={() => toggleVIP(u.id, u.vip_status)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${u.vip_status
                          ? 'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[#EF4444] hover:bg-[#EF4444] hover:text-white'
                          : 'bg-[#10B981] text-white hover:bg-[#059669] shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        }`}
                    >
                      {u.vip_status ? 'Revoke VIP' : 'Crown VIP'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="p-8 text-center text-[#94A3B8]">No elite users found matching criteria.</div>}
        </div>
      </div>
    </div>
  );
}
