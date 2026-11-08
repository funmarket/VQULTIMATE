import React from 'react';
import { X, Shield, Users, ClipboardList } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';
import { fetchPendingUpgradeRequests, PendingUpgradeRequest } from '../domains/d21_entitlements/api';
import { fetchPendingVibeSuggestions, PendingVibeSuggestion } from '../domains/d11_events';

interface AdminModalProps {
  user: UserProfile | null;
  onClose: () => void;
}

/** Platform Administrator is a limited, read-only upgrade triage surface for now. */
export const AdminModal: React.FC<AdminModalProps> = ({ user, onClose }) => {
  const [requests, setRequests] = React.useState<PendingUpgradeRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<PendingVibeSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);
  const [suggestionsError, setSuggestionsError] = React.useState<string | null>(null);

  const loadRequests = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await fetchPendingUpgradeRequests());
    } catch (err) {
      setRequests([]);
      setError(err instanceof Error ? err.message : 'Upgrade requests unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuggestions = React.useCallback(async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      setSuggestions(await fetchPendingVibeSuggestions());
    } catch (err) {
      setSuggestions([]);
      setSuggestionsError(err instanceof Error ? err.message : 'Vibe suggestions are unavailable.');
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user?.role !== 'admin') return;
    void loadRequests();
    void loadSuggestions();
  }, [user?.id, user?.role, loadRequests, loadSuggestions]);

  if (user?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-neutral-700 bg-neutral-900 p-6 text-white">
          <p role="alert" className="text-sm">Administrator authorization required.</p>
          <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-neutral-800 px-4 py-2">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-neutral-900 border border-orange-500/30 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2 text-orange-400">
            <Shield className="w-5 h-5" />
            <h3 className="font-black text-sm tracking-wide">Platform Administrator</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close admin panel"
            className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-orange-300">
            <ClipboardList className="w-4 h-4" />
            <span className="text-xs uppercase font-black tracking-wide">Account upgrade requests</span>
          </div>
          <p className="text-xs text-neutral-300">Read-only review queue. A request is not proof of payment or an active entitlement.</p>
          <button type="button" onClick={() => void loadRequests()} disabled={loading}
            className="rounded-xl border border-orange-500/40 bg-neutral-950 px-3 py-2 text-xs font-bold disabled:opacity-50">
            {loading ? 'Loading requests...' : 'Refresh requests'}
          </button>
          {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
          {!loading && !error && requests.length === 0 && (
            <p className="text-xs text-neutral-400">No upgrade requests (or request service not enabled).</p>
          )}
          {requests.map(request => (
            <div key={request.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3 space-y-1">
              <p className="text-xs font-bold">{request.requested_plan.toUpperCase()} upgrade requested</p>
              <p className="text-[11px] text-neutral-400 break-all">Account: {request.auth_user_id}</p>
              <p className="text-[11px] text-neutral-400">{new Date(request.created_at).toLocaleString()}</p>
              <p className="text-[11px] text-amber-300">Pending verification — no activation action</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3" aria-label="Vibe suggestions awaiting review">
          <div className="flex items-center gap-2 text-cyan-300">
            <ClipboardList className="w-4 h-4" />
            <h4 className="text-xs uppercase font-black tracking-wide">Vibe suggestions awaiting review</h4>
          </div>
          <p className="text-xs text-neutral-300">Read-only moderation queue. Approval and publishing are not implemented.</p>
          <button type="button" disabled={suggestionsLoading} onClick={() => void loadSuggestions()}
            className="rounded-xl border border-cyan-500/40 bg-neutral-950 px-3 py-2 text-xs font-bold disabled:opacity-50">
            {suggestionsLoading ? 'Loading suggestions...' : 'Refresh suggestions'}
          </button>
          {suggestionsError && <p role="alert" className="text-xs text-amber-300">{suggestionsError}</p>}
          {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && (
            <p className="text-xs text-neutral-400">No pending Vibe suggestions (or submissions are not enabled).</p>
          )}
          {suggestions.map(item => (
            <div key={item.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3 space-y-1">
              <p className="text-xs font-black text-white">{item.title}</p>
              <p className="text-[11px] uppercase font-bold text-cyan-300">{item.category}</p>
              <p className="whitespace-pre-wrap break-words text-xs text-neutral-300">{item.description}</p>
              <p className="break-all text-[11px] text-neutral-400">Submitted by: {item.auth_user_id}</p>
              <p className="text-[11px] text-neutral-400">{new Date(item.created_at).toLocaleString()}</p>
              <p className="text-[11px] text-amber-300">Pending review — no approval action available</p>
            </div>
          ))}
        </section>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
          <div className="flex items-center gap-2 text-white"><Users className="w-4 h-4 text-orange-400"/><span className="text-xs font-bold">Administrator controls</span></div>
          <p className="text-xs text-neutral-400">Entitlement approval, verified billing fulfillment, Flash banner scheduling and full Platform Administrator management are not yet implemented. These require separate authorization and server-side enforcement.</p>
        </div>

        <button type="button" onClick={onClose}
          className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 font-bold text-xs text-white">
          Close Console
        </button>
      </div>
    </div>
  );
};
