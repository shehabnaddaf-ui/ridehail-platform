import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function CashReconciliation() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client.get(`/admin/cash-reconciliation?date=${date}`).then(({ data }) => {
      if (data.success) setSummary(data.summary || []);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            💵 Cash <span className="text-[#10B981]">Reconciliation</span>
          </h2>
          <p className="text-[#94A3B8] text-sm mt-1">Daily expected vs collected cash per driver. Use for manual follow-up in cash-dominant regions.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider text-right">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[#0B132B] border border-[#3A506B] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#10B981] transition-colors"
          />
        </div>
      </div>

      <div className="elite-glass overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#10B981]"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[rgba(0,0,0,0.2)] text-[#94A3B8] text-sm uppercase tracking-wider border-b border-[#3A506B]">
                  <th className="p-4 font-semibold">Driver Name</th>
                  <th className="p-4 font-semibold">Phone Number</th>
                  <th className="p-4 font-semibold text-center">Cash Trips</th>
                  <th className="p-4 font-semibold text-right">Expected Platform Cut</th>
                  <th className="p-4 font-semibold text-right">Driver Collected Total</th>
                </tr>
              </thead>
              <tbody className="text-white divide-y divide-[#3A506B]">
                {summary.map((row) => (
                  <tr key={row.driver_id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="p-4 font-bold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold ring-1 ring-emerald-500/50">
                        {row.full_name?.charAt(0) || '?'}
                      </div>
                      {row.full_name}
                    </td>
                    <td className="p-4 font-mono text-sm text-[#94A3B8]">{row.phone}</td>
                    <td className="p-4 text-center font-bold text-[#FBBF24]">{row.trips}</td>
                    <td className="p-4 text-right text-red-400 font-bold tracking-wide">${Number(row.expected || 0).toFixed(2)}</td>
                    <td className="p-4 text-right text-[#10B981] font-bold tracking-wide">${Number(row.collected || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <span className="text-4xl opacity-50">💸</span>
                <p className="text-[#94A3B8] font-semibold">No cash rides recorded for this date.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
