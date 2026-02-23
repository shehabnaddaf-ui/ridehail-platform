import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@ridehail.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/admin/login', { email, password });
      if (data.success) {
        signIn(data.token, data.admin);
        navigate('/', { replace: true });
      } else setError(data.error || 'Login failed');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#14213D] via-[#0B132B] to-[#0B132B]">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#10B981]/10 to-[#FBBF24]/5 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

      <div className="elite-glass w-full max-w-md p-8 relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[#3A506B]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#10B981] to-[#FBBF24] rounded-2xl flex items-center justify-center shadow-lg shadow-[#10B981]/20 mb-4">
            <span className="text-3xl">🦅</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest uppercase">Elite<span className="text-[#10B981]">Trust</span></h1>
          <p className="text-[#94A3B8] font-mono text-sm tracking-widest uppercase mt-2">Strategic Command Center</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-sm font-semibold text-center">{error}</div>}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider pl-1">Admin Email</label>
            <input
              type="email"
              placeholder="hq@elitetrust.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#0B132B]/50 border border-[#3A506B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#3A506B]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider pl-1">High-Security Password</label>
            <input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#0B132B]/50 border border-[#3A506B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#10B981] transition-all placeholder:text-[#3A506B]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? (
              <div className="flex justify-center items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Authenticating...
              </div>
            ) : 'Initialize Link'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[#94A3B8] flex flex-col gap-1">
          <p>Secure connection established.</p>
          <p className="opacity-50 font-mono">NODE: R0-ALPHA-99 | ENC: AES-256</p>
        </div>
      </div>
    </div>
  );
}
