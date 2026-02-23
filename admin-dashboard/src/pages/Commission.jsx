import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function Commission() {
  const [commission, setCommission] = useState(null);
  const [percentage, setPercentage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get('/admin/commission').then(({ data }) => {
      if (data.success && data.commission) {
        setCommission(data.commission);
        setPercentage(String(data.commission.percentage));
      }
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const p = parseFloat(percentage);
    if (isNaN(p) || p < 0 || p > 100) return;
    setSaving(true);
    try {
      const { data } = await client.patch('/admin/commission', { percentage: p });
      if (data.success) {
        setCommission(data.commission);
        alert('Commission rate updated successfully.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#10B981]"></div></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            🏦 Platform <span className="text-[#FBBF24]">Commission</span>
          </h2>
          <p className="text-[#94A3B8] text-sm mt-1">Adjust the global percentage cut the platform takes from each completed ride.</p>
        </div>
      </div>

      <div className="elite-glass p-8 max-w-md relative overflow-hidden group">
        {/* Background Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FBBF24] rounded-full blur-[60px] opacity-10"></div>

        <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">
          Global Commission Rate (%)
        </label>

        <div className="relative mb-6">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            className="w-full bg-[#0B132B] border-2 border-[#3A506B] rounded-xl px-4 py-4 pr-12 text-2xl font-bold text-[#FBBF24] focus:outline-none focus:border-[#FBBF24] transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-2xl font-bold">%</span>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-[rgba(251,191,36,0.1)] border border-[#FBBF24] hover:bg-[#FBBF24] hover:text-[#0B132B] text-[#FBBF24] font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(251,191,36,0.15)] flex justify-center items-center gap-2"
        >
          {saving ? (
            <><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> Saving...</>
          ) : (
            '💾 Enforce New Rate'
          )}
        </button>

        {commission && (
          <div className="mt-6 pt-4 border-t border-[#3A506B] flex justify-between items-center">
            <span className="text-sm text-[#94A3B8]">Current Live Rate:</span>
            <span className="text-lg font-bold text-[#10B981]">{commission.percentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
