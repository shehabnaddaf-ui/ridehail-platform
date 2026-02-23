import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function Crisis() {
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/crisis').then(({ data }) => {
      if (data.success) setCrises(data.crises || []);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FBBF24]"></div></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Crisis <span className="text-[#FBBF24]">Management</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Manage platform-wide emergencies (weather, security). Broadcast alerts and restrict rides.</p>
        </div>
        <button className="px-4 py-2 bg-[rgba(251,191,36,0.1)] text-[#FBBF24] border border-[#FBBF24] rounded-xl font-bold hover:bg-[#FBBF24] hover:text-[#0B132B] transition-all">
          🚨 Declare Emergency
        </button>
      </div>

      <div className="elite-glass overflow-hidden border-[#FBBF24]/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(251,191,36,0.1)] text-[#FBBF24] text-sm uppercase tracking-wider border-b border-[#FBBF24]/30">
                <th className="p-4 font-semibold">Crisis Identifier</th>
                <th className="p-4 font-semibold text-center">Scope</th>
                <th className="p-4 font-semibold">Broadcast Message (AR/EN)</th>
                <th className="p-4 font-semibold text-center">New Rides</th>
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-[#3A506B]">
              {crises.map((c) => (
                <tr key={c.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 font-bold text-red-400">{c.name_en || c.name_ar || '—'}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-[#334155] text-white rounded text-xs font-bold uppercase tracking-wider">
                      {c.scope}
                    </span>
                  </td>
                  <td className="p-4 text-sm max-w-xs">
                    <div className="truncate text-[#94A3B8]" title={c.message_en}>{c.message_en || '—'}</div>
                    <div className="truncate font-semibold text-white mt-1" title={c.message_ar}>{c.message_ar || '—'}</div>
                  </td>
                  <td className="p-4 text-center">
                    {c.allow_new_rides ? (
                      <span className="text-[#10B981] font-bold text-lg">✓</span>
                    ) : (
                      <span className="text-red-500 font-bold text-lg">✗ (Blocked)</span>
                    )}
                  </td>
                  <td className="p-4 font-mono text-xs text-[#94A3B8]">{c.started_at ? new Date(c.started_at).toLocaleString() : '—'}</td>
                  <td className="p-4 text-right">
                    <button className={`w-12 h-6 rounded-full transition-colors relative ${c.active ? 'bg-[#FBBF24]' : 'bg-[#334155]'}`}>
                      <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${c.active ? 'translate-x-6' : 'translate-x-0'}`}></span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {crises.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-4xl opacity-50">☮️</span>
              <p className="text-[#94A3B8] font-semibold">All clear. No active crisis events.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
