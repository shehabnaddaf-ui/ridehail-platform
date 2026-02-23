import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/trips').then(({ data }) => {
      if (data.success) setTrips(data.trips || []);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10B981]"></div></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Active <span className="text-[#10B981]">Trips</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Live overview of passenger journeys and completed rides.</p>
        </div>
      </div>

      <div className="elite-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(0,0,0,0.2)] text-[#94A3B8] text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Date & Time</th>
                <th className="p-4 font-semibold">Rider</th>
                <th className="p-4 font-semibold">Driver</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Fare</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-[#3A506B]">
              {trips.map((t) => (
                <tr key={t.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 font-mono text-sm text-[#94A3B8]">{new Date(t.requested_at).toLocaleString()}</td>
                  <td className="p-4 font-bold">{t.rider_name || '—'}</td>
                  <td className="p-4 font-bold text-blue-400">{t.driver_name || '—'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' :
                        t.status === 'active' || t.status === 'accepted' ? 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30' :
                          'bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30'
                      }`}>
                      {t.status === 'completed' ? '✅ COMPLETED' :
                        t.status === 'active' ? '🚗 EN ROUTE' :
                          t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right text-[#10B981] font-bold tracking-wide">
                    ${t.fare_amount != null ? Number(t.fare_amount).toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trips.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-4xl opacity-50">🛤️</span>
              <p className="text-[#94A3B8] font-semibold">No trips recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
