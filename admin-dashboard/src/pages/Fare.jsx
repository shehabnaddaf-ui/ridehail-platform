import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function Fare() {
  const [config, setConfig] = useState([]);
  const [settings, setSettings] = useState({ fuel_price_liter: '24000', profit_multiplier: '3' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get('/admin/fare'),
      client.get('/admin/system-settings')
    ]).then(([fareRes, settingsRes]) => {
      if (fareRes.data.success) setConfig(fareRes.data.config || []);
      if (settingsRes.data.success) setSettings(settingsRes.data.settings);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await client.patch('/admin/system-settings', { settings });
      alert('Pricing engine updated successfully!');
    } catch (err) {
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10B981]"></div></div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Strategic <span className="text-[#10B981]">Pricing Engine</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Dynamic fuel-based algorithm (Tanaka-System). Prices adapt daily based on market rates.</p>
        </div>
      </div>

      {/* Global Pricing Controls */}
      <div className="elite-glass p-8 relative overflow-hidden border-[#10B981]/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          ⛽ Global Fuel & Profit Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest pl-1">Daily Gas Price (Lira / Liter)</label>
            <div className="relative">
              <input
                type="number"
                value={settings.fuel_price_liter}
                onChange={(e) => setSettings({ ...settings, fuel_price_liter: e.target.value })}
                className="w-full bg-[#0B132B] border border-[#3A506B] rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-[#10B981] transition-all"
              />
              <span className="absolute right-4 top-3.5 text-[#94A3B8] font-bold">Lira</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest pl-1">Profit Multiplier (Market Factor)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={settings.profit_multiplier}
                onChange={(e) => setSettings({ ...settings, profit_multiplier: e.target.value })}
                className="w-full bg-[#0B132B] border border-[#3A506B] rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-[#FBBF24] transition-all"
              />
              <span className="absolute right-4 top-3.5 text-[#FBBF24] font-bold">x Factor</span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-[#10B981] text-[#0B132B] font-bold py-3.5 rounded-xl hover:bg-[#059669] transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              {saving ? 'Processing...' : '⚡ Apply Global Rates'}
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 text-sm text-blue-300 italic">
          <span>💡</span>
          <p>Formula: Base + (Distance × [25/Tanaka] × {settings.fuel_price_liter} × {settings.profit_multiplier})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {config.map((c) => (
          <div key={c.ride_type} className="bg-[rgba(255,255,255,0.02)] border border-[#3A506B] rounded-2xl p-6 relative overflow-hidden group hover:border-[#FBBF24] transition-colors">
            <h3 className="text-xl font-bold text-white capitalize mb-4 flex justify-between items-center">
              {c.ride_type}
              <span className="text-[10px] px-2 py-0.5 bg-[#10B981]/20 text-[#10B981] rounded border border-[#10B981]/30">ACTIVE</span>
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider mb-1">Base (Opening)</div>
                <div className="text-xl font-bold text-[#FBBF24]">{c.base_fare} <span className="text-[10px]">ل.س</span></div>
              </div>
              <div>
                <div className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider mb-1">Surge Mod</div>
                <div className="text-xl font-bold text-[#10B981]">x{c.surge_multiplier || 1.0}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#3A506B]">
              <div className="text-xs text-[#94A3B8] font-semibold uppercase mb-2">Example Calculation (10km)</div>
              <div className="text-white font-bold opacity-80 italic">
                ≈ {Math.round(Number(c.base_fare) + (10 * (25 / 250) * Number(settings.fuel_price_liter) * Number(settings.profit_multiplier)))} Lira
                <span className="block text-[9px] text-[#94A3B8] mt-1">(Standard 250km/Tanaka car)</span>
              </div>
            </div>

            <button className="w-full mt-4 py-2 border border-[#3A506B] rounded-lg text-xs font-bold text-[#94A3B8] hover:text-white hover:border-white transition-all uppercase tracking-widest">
              Update Modifiers
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
