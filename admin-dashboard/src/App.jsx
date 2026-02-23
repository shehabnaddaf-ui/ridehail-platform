import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import Users from './pages/Users';
import Trips from './pages/Trips';
// Consolidated into Financials
import Fare from './pages/Fare';
import Commission from './pages/Commission';
import CashReconciliation from './pages/CashReconciliation';
// Old standalone ones mapped together or kept for specific routes
import Disputes from './pages/Disputes';
import DisputeDetail from './pages/DisputeDetail';
import RiskZones from './pages/RiskZones';
import Crisis from './pages/Crisis';
import VIPManagement from './pages/VIPManagement';
import SystemControls from './pages/SystemControls';

// A mock wrapper to demonstrate the consolidated "Financials & Surge" view
// In a real app, we'd build a dedicated `Financials.jsx` page that imports these components.
// For MVP, we'll keep them on separate sub-routes or just render Fare for now as a placeholder.
const FinancialsMock = () => (
  <div className="flex flex-col gap-6">
    <h1 className="text-3xl font-bold text-white tracking-wide">Financials <span className="text-[#10B981]">& Surge</span></h1>
    <div className="elite-glass p-6"><Fare /></div>
    <div className="elite-glass p-6"><Commission /></div>
    <div className="elite-glass p-6"><CashReconciliation /></div>
  </div>
);

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="users" element={<Users />} />
          <Route path="trips" element={<Trips />} />
          <Route path="vip" element={<VIPManagement />} />
          <Route path="system-controls" element={<SystemControls />} />
          <Route path="financials" element={<FinancialsMock />} />

          <Route path="disputes" element={<Disputes />} />
          <Route path="disputes/:id" element={<DisputeDetail />} />
          <Route path="risk-zones" element={<RiskZones />} />
          <Route path="crisis" element={<Crisis />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
