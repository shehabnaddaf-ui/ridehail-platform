import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDrivers = () => {
    setLoading(true);
    const url = filter ? `/admin/drivers?status=${filter}` : '/admin/drivers';
    client.get(url)
      .then(({ data }) => {
        if (data.success) setDrivers(data.drivers || []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrivers();
  }, [filter]);

  const approve = async (id) => {
    await client.patch(`/admin/drivers/${id}/approve`);
    fetchDrivers();
  };

  const reject = async (id) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;
    await client.patch(`/admin/drivers/${id}/reject`, { reason });
    fetchDrivers();
  };

  const blockDriver = async (id) => {
    const reason = prompt('Enter reason for blocking:');
    if (!reason) return;
    try {
      await client.patch(`/admin/drivers/${id}/block`, { reason });
      fetchDrivers();
    } catch (error) {
      alert('Failed to block driver');
    }
  };

  const unblockDriver = async (id) => {
    try {
      await client.patch(`/admin/drivers/${id}/unblock`);
      fetchDrivers();
    } catch (error) {
      alert('Failed to unblock driver');
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10B981]"></div></div>;

  // Simple client-side search simulation
  const filteredDrivers = drivers.filter(d =>
    d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone?.includes(searchQuery)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Drivers <span className="text-blue-400">Fleet</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Manage approvals, monitor ratings, and view balances.</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-2xl border border-[#3A506B]">
        <div className="flex gap-2">
          <button onClick={() => setFilter('')} className={`px-6 py-2 rounded-xl font-bold transition-all ${filter === '' ? 'bg-blue-500 text-white' : 'bg-[#14213D] text-[#94A3B8] border border-[#3A506B] hover:bg-blue-500/20'}`}>All</button>
          <button onClick={() => setFilter('pending')} className={`px-6 py-2 rounded-xl font-bold transition-all ${filter === 'pending' ? 'bg-[#FBBF24] text-[#0B132B]' : 'bg-[#14213D] text-[#94A3B8] border border-[#3A506B] hover:bg-[#FBBF24]/20'}`}>Pending</button>
          <button onClick={() => setFilter('approved')} className={`px-6 py-2 rounded-xl font-bold transition-all ${filter === 'approved' ? 'bg-[#10B981] text-white' : 'bg-[#14213D] text-[#94A3B8] border border-[#3A506B] hover:bg-[#10B981]/20'}`}>Approved</button>
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B132B] border border-[#3A506B] rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all"
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
                <th className="p-4 font-semibold">Driver Name</th>
                <th className="p-4 font-semibold">Phone Contact</th>
                <th className="p-4 font-semibold">Approval Status</th>
                <th className="p-4 font-semibold">Account Status</th>
                <th className="p-4 font-semibold">Km / Tanaka (25L)</th>
                <th className="p-4 font-semibold text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-[#3A506B]">
              {filteredDrivers.map((d) => (
                <tr key={d.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 font-bold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold ring-1 ring-blue-500/50">
                      {d.full_name?.charAt(0) || '?'}
                    </div>
                    {d.full_name}
                  </td>
                  <td className="p-4 font-mono text-sm text-[#94A3B8]">{d.phone}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${d.status === 'approved' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' :
                      d.status === 'pending' ? 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30' :
                        'bg-red-500/10 text-red-500 border-red-500/30'
                      }`}>
                      {d.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      d.is_blocked
                        ? 'bg-red-500/10 text-red-500 border-red-500/30'
                        : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                    }`}>
                      {d.is_blocked ? 'BLOCKED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={d.fuel_consumption_tanaka_km || 250}
                        onBlur={async (e) => {
                          const val = e.target.value;
                          await client.patch(`/admin/drivers/${d.id}`, { fuel_consumption_tanaka_km: val });
                        }}
                        className="w-16 bg-[#0B132B] border border-[#3A506B] rounded px-2 py-1 text-sm text-white focus:border-[#10B981] outline-none"
                      />
                      <span className="text-[10px] text-[#94A3B8]">KM</span>
                    </div>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {d.status === 'pending' && (
                      <>
                        <button onClick={() => approve(d.id)} className="px-3 py-1.5 bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981] rounded-lg hover:bg-[#10B981] hover:text-[#0B132B] transition-all text-xs font-bold uppercase tracking-wide">
                          Approve
                        </button>
                        <button onClick={() => reject(d.id)} className="px-3 py-1.5 bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[#EF4444] rounded-lg hover:bg-[#EF4444] hover:text-white transition-all text-xs font-bold uppercase tracking-wide">
                          Reject
                        </button>
                      </>
                    )}
                    {d.status === 'approved' && (
                      d.is_blocked ? (
                        <button onClick={() => unblockDriver(d.id)} className="px-3 py-1.5 bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981] rounded-lg hover:bg-[#10B981] hover:text-[#0B132B] transition-all text-xs font-bold uppercase tracking-wide">
                          Unblock
                        </button>
                      ) : (
                        <button onClick={() => blockDriver(d.id)} className="px-3 py-1.5 bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[#EF4444] rounded-lg hover:bg-[#EF4444] hover:text-white transition-all text-xs font-bold uppercase tracking-wide">
                          Block
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDrivers.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-4xl opacity-50">📭</span>
              <p className="text-[#94A3B8] font-semibold">No drivers found matching criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
