import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function DisputeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/disputes/admin/${id}`).then(({ data }) => {
      if (data.success) {
        setDispute(data.dispute);
        setNotes(data.dispute.resolution_notes || '');
      }
    }).catch(() => { }).finally(() => setLoading(false));
  }, [id]);

  const resolve = async () => {
    await client.patch(`/disputes/admin/${id}/resolve`, { resolution_notes: notes });
    navigate('/disputes');
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;
  if (!dispute) return <div className="text-center p-12 text-[#94A3B8]">Dispute not found</div>;

  const ai = dispute.ai_suggestion || {};

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/disputes')}
          className="p-2 bg-[rgba(255,255,255,0.05)] rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#94A3B8] hover:text-white"
        >
          ←
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide flex items-center gap-3">
            Case <span className="text-purple-500 font-mono text-xl bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/30">#{dispute.id?.slice(0, 8)}</span>
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">Detailed review and resolution panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details Panel */}
        <div className="elite-glass p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-[80px] opacity-10"></div>

          <h2 className="text-lg font-bold text-white border-b border-[#3A506B] pb-2 mb-2">Trip & Reporter Details</h2>

          <div className="flex justify-between items-center bg-[#0B132B] p-3 rounded-lg border border-[#3A506B]">
            <span className="text-sm font-bold text-[#94A3B8] uppercase">Trip ID</span>
            <span className="font-mono text-purple-400">{dispute.trip_id}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0B132B] p-3 rounded-lg border border-[#3A506B]">
            <span className="text-sm font-bold text-[#94A3B8] uppercase">Raised By</span>
            <span className="font-bold text-white flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">{dispute.raised_by.charAt(0).toUpperCase()}</div>
              {dispute.raised_by}
            </span>
          </div>
          <div className="flex justify-between items-center bg-[#0B132B] p-3 rounded-lg border border-[#3A506B]">
            <span className="text-sm font-bold text-[#94A3B8] uppercase">Status</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${dispute.status === 'resolved' ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' :
                dispute.status === 'in_review' ? 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30' :
                  'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
              {dispute.status.toUpperCase()}
            </span>
          </div>

          <div className="mt-4">
            <span className="text-sm font-bold text-[#94A3B8] uppercase block mb-2">Driver / Rider Comments</span>
            <div className="bg-[#0B132B] p-4 rounded-xl border border-[#3A506B] text-white italic">
              "{dispute.reason}"
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <span className="text-xs text-[#94A3B8] font-bold uppercase block mb-1">Pickup</span>
              <div className="text-sm text-white truncate" title={dispute.pickup_address}>{dispute.pickup_address || '—'}</div>
            </div>
            <div>
              <span className="text-xs text-[#94A3B8] font-bold uppercase block mb-1">Dropoff</span>
              <div className="text-sm text-white truncate" title={dispute.dropoff_address}>{dispute.dropoff_address || '—'}</div>
            </div>
          </div>

          <div className="mt-2 pt-4 border-t border-[#3A506B] flex justify-between items-center">
            <span className="text-sm font-bold text-[#94A3B8] uppercase">Original Fare</span>
            <span className="text-xl font-bold text-[#10B981]">${dispute.fare_amount != null ? Number(dispute.fare_amount).toFixed(2) : '0.00'}</span>
          </div>
        </div>

        {/* Resolution & AI Panel */}
        <div className="flex flex-col gap-6">
          <div className="elite-glass p-6 relative overflow-hidden group border-[#10B981]/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-transparent pointer-events-none"></div>
            <h3 className="text-lg font-bold text-[#10B981] mb-2 flex items-center gap-2">
              🧠 AI Copilot Assessor <span className="text-xs px-2 py-0.5 bg-[#10B981]/20 rounded-full border border-[#10B981]/50">Phase 2</span>
            </h3>
            {ai.suggested_outcome ? (
              <div>
                <p className="text-white font-medium mb-3">Based on trip telemetry, user history, and stated reason, the AI suggests:</p>
                <div className="bg-[#0B132B]/80 p-4 rounded-xl border border-[#10B981]/20 flex items-center justify-between">
                  <span className="text-xl font-bold text-white">{ai.suggested_outcome}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-[#94A3B8] uppercase font-bold">Confidence</span>
                    <span className="text-[#10B981] font-bold text-lg">{ai.confidence ?? '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[#94A3B8] italic flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
                Awaiting deep-learning inference model integration.
              </div>
            )}
          </div>

          <div className="elite-glass p-6 flex-1 flex flex-col">
            <h3 className="text-lg font-bold text-white border-b border-[#3A506B] pb-2 mb-4">Official Resolution</h3>
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Resolution Notes / Action Taken</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Detail the refund amount, warnings issued, etc..."
                  className="w-full bg-[#0B132B] p-4 rounded-xl border border-[#3A506B] text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {dispute.status !== 'resolved' ? (
                <button
                  onClick={resolve}
                  className="w-full py-4 mt-auto bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981] rounded-xl font-bold hover:bg-[#10B981] hover:text-[#0B132B] transition-all text-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  ✓ Mark Case as Resolved
                </button>
              ) : (
                <div className="w-full py-4 mt-auto bg-[#3A506B]/30 border border-[#3A506B] text-[#94A3B8] rounded-xl font-bold text-center text-lg flex items-center justify-center gap-2">
                  🔒 Case Closed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
