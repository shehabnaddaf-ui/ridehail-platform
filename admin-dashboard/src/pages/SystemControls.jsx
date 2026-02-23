import React, { useState } from 'react';

export default function SystemControls() {
    const [minVersion, setMinVersion] = useState('1.0.0');
    const [maintenance, setMaintenance] = useState(false);
    const [maintenanceMsg, setMaintenanceMsg] = useState('We are upgrading our servers. Back soon! / نقوم بترقية خوادمنا. سنعود قريباً!');

    const [toggles, setToggles] = useState({
        cash_payments: true,
        promo_codes: true,
        ai_predictions: true,
        community_pools: true,
    });

    const handleUpdate = () => alert('System properties updated correctly. Mobile apps will reflect this within 5 seconds.');
    const toggleFeature = (key) => setToggles((p) => ({ ...p, [key]: !p[key] }));

    const toggleConfig = [
        { key: 'cash_payments', label: 'Cash Payments', desc: 'Allow riders to select cash as payment.' },
        { key: 'promo_codes', label: 'Promo Codes System', desc: 'Enable/Disable the entire promo code engine.' },
        { key: 'ai_predictions', label: 'AI Time/Location Predictions', desc: 'Rider app home screen smart suggestions.' },
        { key: 'community_pools', label: 'Community Pools (Driver)', desc: 'Allow drivers to filter by destination.' },
    ];

    return (
        <div className="flex flex-col gap-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-wide">System <span className="text-red-400">Controls</span></h1>
                <p className="text-[#94A3B8] text-sm mt-1">Global enforcement rules, versioning, and feature toggles.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* App Version Enforcement */}
                <div className="elite-glass p-6">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">📱 Force App Update</h2>
                    <p className="text-[#94A3B8] text-sm mb-6">Immediately block any mobile app beneath this version.</p>

                    <div className="flex flex-col gap-2 mb-6">
                        <label className="text-sm font-bold text-white">Minimum Required Version (iOS/Android):</label>
                        <input
                            type="text"
                            value={minVersion}
                            onChange={(e) => setMinVersion(e.target.value)}
                            className="elite-input"
                        />
                    </div>
                    <button onClick={handleUpdate} className="w-full elite-btn-secondary text-[#FBBF24] border-[#FBBF24] hover:bg-[#FBBF24]/10">
                        Enforce Version
                    </button>
                </div>

                {/* Maintenance Mode */}
                <div className={`elite-glass p-6 border-2 transition-all ${maintenance ? 'border-red-500 bg-red-900/10' : 'border-transparent'}`}>
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">🚧 Maintenance Mode</h2>
                    <p className="text-[#94A3B8] text-sm mb-6">Lockdown the entire system for emergency upgrades.</p>

                    <div className="flex flex-col gap-2 mb-6">
                        <label className="text-sm font-bold text-white">Lockdown Message (AR/EN):</label>
                        <textarea
                            value={maintenanceMsg}
                            onChange={(e) => setMaintenanceMsg(e.target.value)}
                            className="elite-input h-24 resize-none"
                            disabled={!maintenance}
                        />
                    </div>

                    <button
                        onClick={() => setMaintenance(!maintenance)}
                        className={`w-full font-bold py-3 px-6 rounded-xl transition duration-300 shadow-lg ${maintenance ? 'bg-[#0B132B] text-white border border-[#3A506B]' : 'bg-red-500 text-white hover:bg-red-600'}`}
                    >
                        {maintenance ? '🟢 Disable Lockdown' : '🚨 ACTIVATE LOCKDOWN'}
                    </button>
                </div>
            </div>

            {/* Feature Toggles */}
            <div className="elite-glass p-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">🎛️ Live Feature Toggles</h2>
                <p className="text-[#94A3B8] text-sm mb-6">Instantly enable or disable core application features remotely without App Store updates.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {toggleConfig.map(({ key, label, desc }) => (
                        <div key={key} className="bg-[rgba(255,255,255,0.03)] border border-[#3A506B] p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white text-lg">{label}</div>
                                <div className="text-xs text-[#94A3B8] mt-1 pr-4">{desc}</div>
                            </div>

                            {/* Custom Toggle Switch */}
                            <button
                                onClick={() => toggleFeature(key)}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 ${toggles[key] ? 'bg-[#10B981]' : 'bg-[#334155]'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform duration-300 shadow-md ${toggles[key] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
