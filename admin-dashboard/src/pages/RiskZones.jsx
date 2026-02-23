import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function RiskZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/risk-zones').then(({ data }) => {
      if (data.success) setZones(data.zones || []);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Risk <span className="text-red-500">Zones</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Mark areas with safety or security risks. Algorithms will avoid matching in these zones.</p>
        </div>
        <button className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all">
          + Add New Zone
        </button>
      </div>

      <div className="elite-glass overflow-hidden border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(239,68,68,0.1)] text-red-300 text-sm uppercase tracking-wider border-b border-red-500/20">
                <th className="p-4 font-semibold">Zone Name (AR/EN)</th>
                <th className="p-4 font-semibold text-center">Center Coordinates</th>
                <th className="p-4 font-semibold text-center">Radius (km)</th>
                <th className="p-4 font-semibold text-center">Severity Level</th>
                <th className="p-4 font-semibold">Reason</th>
                <th className="p-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-[#3A506B]">
              {zones.map((z) => (
                <tr key={z.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="p-4 font-bold flex flex-col">
                    <span>{z.name_en || '—'}</span>
                    <span className="text-xs text-[#94A3B8] font-normal">{z.name_ar || '—'}</span>
                  </td>
                  <td className="p-4 text-center font-mono text-sm text-[#94A3B8]">
                    {z.center_lat.toFixed(4)}, {z.center_lng.toFixed(4)}
                  </td>
                  <td className="p-4 text-center font-bold text-[#FBBF24]">{z.radius_km} km</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${z.risk_level === 'High' ? 'bg-red-500 text-white' :
                        z.risk_level === 'Medium' ? 'bg-[#FBBF24] text-[#0B132B]' :
                          'bg-[#10B981] text-white'
                      }`}>
                      {z.risk_level.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[#94A3B8] max-w-xs truncate" title={z.reason}>{z.reason || '—'}</td>
                  <td className="p-4 text-right">
                    <button className={`w-12 h-6 rounded-full transition-colors relative ${z.active ? 'bg-red-500' : 'bg-[#334155]'}`}>
                      <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${z.active ? 'translate-x-6' : 'translate-x-0'}`}></span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {zones.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-4xl opacity-50">🛡️</span>
              <p className="text-[#94A3B8] font-semibold">No active risk zones detected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
