import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const navigate = useNavigate();

  useEffect(() => {
    client.get(`/disputes/admin?status=${filter}`).then(({ data }) => {
      if (data.success) setDisputes(data.disputes || []);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">AI-Assisted <span className="text-purple-500">Disputes</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Review trip details and resolve with fairness. (Deep AI reasoning in Phase 2.)</p>
        </div>
      </div>

      <div className="flex gap-3 mb-2 bg-[rgba(255,255,255,0.02)] p-2 rounded-2xl w-max border border-[#3A506B]">
        {['open', 'in_review', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${filter === s
                ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                : 'bg-transparent text-[#94A3B8] hover:text-white hover:bg-[#3A506B]/50'
              }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="elite-glass overflow-hidden border-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(168,85,247,0.05)] text-purple-300 text-sm uppercase tracking-wider border-b border-purple-500/20">
                <th className="p-4 font-semibold">Case / Trip ID</th>
                <th className="p-4 font-semibold">Raised By</th>
                <th className="p-4 font-semibold">Primary Reason</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold">Date Filed</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-[#3A506B]">
              {disputes.map((d) => (
                <tr key={d.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 font-mono text-sm text-[#94A3B8]">{d.trip_id?.slice(0, 8)}…</td>
                  <td className="p-4 font-bold">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">
                        {d.raised_by.charAt(0).toUpperCase()}
                      </span>
                      {d.raised_by}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-300 max-w-xs truncate" title={d.reason}>{d.reason || '—'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${d.status === 'resolved' ? 'bg-[#10B981]/20 text-[#10B981]' :
                        d.status === 'in_review' ? 'bg-[#FBBF24]/20 text-[#FBBF24]' :
                          'bg-purple-500/20 text-purple-400'
                      }`}>
                      {d.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-[#94A3B8]">{new Date(d.created_at).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    {d.status !== 'resolved' ? (
                      <button
                        onClick={() => navigate(`/disputes/${d.id}`)}
                        className="px-4 py-1.5 bg-[rgba(168,85,247,0.1)] text-purple-400 border border-purple-500/50 rounded-lg hover:bg-purple-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wide"
                      >
                        Review Case
                      </button>
                    ) : (
                      <span className="text-[#10B981] font-bold text-sm">Closed ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {disputes.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-4xl opacity-50">⚖️</span>
              <p className="text-[#94A3B8] font-semibold">No {filter.replace('_', ' ')} disputes found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
