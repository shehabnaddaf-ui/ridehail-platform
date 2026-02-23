import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Mock Heatmap Data
const mockHeatmap = [
  { lat: 33.513, lng: 36.276, radius: 600, color: '#EF4444' }, // Red (High)
  { lat: 33.518, lng: 36.280, radius: 800, color: '#F59E0B' }, // Orange (Medium)
];

// Mock Active Drivers
const mockDrivers = [
  { id: 1, name: 'Ahmad M.', lat: 33.515, lng: 36.278, status: 'Online' },
  { id: 2, name: 'Sami K.', lat: 33.520, lng: 36.290, status: 'In Ride' },
  { id: 3, name: 'Omar (Stealth)', lat: 33.510, lng: 36.270, status: 'Stealth' },
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/reports/summary').then(({ data }) => {
      if (data.success) setSummary(data.summary);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10B981]"></div></div>;
  if (!summary) return <p className="text-white text-center mt-10">No data available.</p>;

  const cards = [
    { label: 'Total Rides', value: summary.total_rides, icon: '🚗', color: 'text-white' },
    { label: 'Total Revenue', value: `$${summary.total_revenue?.toFixed(2) || '0.00'}`, icon: '💎', color: 'text-[#10B981]' },
    { label: 'Commission', value: `$${summary.total_commission?.toFixed(2) || '0.00'}`, icon: '💰', color: 'text-[#FBBF24]' },
    { label: 'Active Drivers', value: summary.active_drivers, icon: '👨‍✈️', color: 'text-blue-400' },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header Section */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Dashboard <span className="text-[#10B981]">Overview</span></h1>
          <p className="text-[#94A3B8] text-sm mt-1">Real-time platform statistics & God-Mode tracking.</p>
        </div>
        <div className="px-4 py-2 bg-[rgba(251,191,36,0.1)] border border-[#FBBF24] rounded-lg text-[#FBBF24] font-bold text-sm">
          System Status: Operational 🟢
        </div>
      </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(({ label, value, icon, color }) => (
          <div key={label} className="elite-glass p-6 transform hover:scale-105 transition duration-300">
            <div className="flex justify-between items-start">
              <div className="text-[#94A3B8] text-sm font-semibold uppercase tracking-wider">{label}</div>
              <div className="text-2xl">{icon}</div>
            </div>
            <div className={`text-4xl font-bold mt-4 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* God-Mode Map Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Map Container */}
        <div className="lg:col-span-2 elite-glass overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#3A506B] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              God-Mode: Live Fleet Tracking
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-[rgba(16,185,129,0.2)] text-[#10B981] rounded">Online</span>
              <span className="px-2 py-1 bg-[rgba(239,68,68,0.2)] text-[#EF4444] rounded">High Demand</span>
            </div>
          </div>

          <div className="flex-1 w-full bg-[#0B132B]">
            <MapContainer center={[33.513, 36.276]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              {/* Dark Theme Map Tiles */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Heatmaps */}
              {mockHeatmap.map((heat, idx) => (
                <Circle
                  key={`heat-${idx}`}
                  center={[heat.lat, heat.lng]}
                  radius={heat.radius}
                  pathOptions={{ color: heat.color, fillColor: heat.color, fillOpacity: 0.3, stroke: false }}
                />
              ))}

              {/* Fleet Markers */}
              {mockDrivers.map((driver) => (
                <Marker key={driver.id} position={[driver.lat, driver.lng]}>
                  <Popup className="custom-popup">
                    <div className="font-bold">{driver.name}</div>
                    <div className="text-sm text-gray-600">Status: {driver.status}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="elite-glass p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-[#FBBF24] border-b border-[#3A506B] pb-2 mb-2">⚡ Live Command</h2>

          <button className="w-full text-left p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-all text-[#EF4444] group">
            <div className="font-bold text-lg mb-1">🚨 Trigger Surge Pricing</div>
            <div className="text-xs opacity-80">Manually activate 1.5x in high demand zones.</div>
          </button>

          <button className="w-full text-left p-4 rounded-xl bg-[rgba(16,185,129,0.1)] border border-[#10B981] hover:bg-[#10B981] hover:text-white transition-all text-[#10B981]">
            <div className="font-bold text-lg mb-1">💸 Process Daily Payouts</div>
            <div className="text-xs opacity-80">Settle driver wallets immediately.</div>
          </button>

          <div className="mt-auto pt-4 border-t border-[#3A506B]">
            <h3 className="text-sm text-[#94A3B8] font-bold mb-3 uppercase tracking-wider">System Alerts</h3>
            <div className="flex items-center gap-3 text-sm text-white mb-2">
              <span className="text-yellow-400">⚠️</span> High demand in Downtown area.
            </div>
            <div className="flex items-center gap-3 text-sm text-white">
              <span className="text-red-400">🚨</span> Dispute #142 requires attention.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
