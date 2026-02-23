import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/', label: '🌐 God-Mode Map' },
  { to: '/trips', label: '🚗 Active Trips' },
  { to: '/drivers', label: '👨‍✈️ Drivers Fleet' },
  { to: '/users', label: '👥 Customers' },
  { to: '/vip', label: '✨ VIP Command' },
  { to: '/system-controls', label: '🎛️ System Controls' }, // New page for App Enforcement
  { to: '/financials', label: '💰 Financials & Surge' }, // Consolidating Fare, Commission, Cash
  { to: '/disputes', label: '⚖️ Disputes' },
  { to: '/risk-zones', label: '⚠️ Risk Zones' },
  { to: '/crisis', label: '🚨 Crisis' },
];

export default function Layout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#0B132B] font-['Cairo']">
      {/* Sidebar - Elite Glassmorphism */}
      <aside className="w-64 bg-[#14213D] border-r border-[#3A506B] p-6 flex flex-col justify-between shadow-2xl relative z-10">
        <div>
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-[#FBBF24] tracking-wider uppercase mb-1 drop-shadow-lg">✨ Elite Trust</h2>
            <p className="text-xs text-[#10B981] font-semibold tracking-widest">COMMAND CENTER</p>
          </div>

          <nav className="flex flex-col gap-2">
            {nav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `
                  px-4 py-3 rounded-xl font-bold transition-all duration-300 flex items-center
                  ${isActive
                    ? 'bg-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'text-[#94A3B8] hover:bg-[rgba(16,185,129,0.1)] hover:text-[#10B981]'}
                `}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-[#3A506B] pt-6">
          <div className="mb-4 hidden">
            {/* Language Dropdown placeholder */}
          </div>
          <button
            onClick={() => { signOut(); navigate('/login'); }}
            className="w-full text-left px-4 py-3 text-red-400 font-bold hover:bg-red-900/20 rounded-xl transition-all"
          >
            🚪 Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-auto h-screen relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#14213D] via-[#0B132B] to-[#0B132B]">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
