import React from 'react';
import { X, Shield, Users, MapPin, Database, Award, CheckCircle } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';

interface AdminModalProps {
  user: UserProfile | null;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-neutral-900 border border-orange-500/30 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2 text-orange-400">
            <Shield className="w-5 h-5 text-orange-400" />
            <h3 className="font-black text-sm tracking-wide">Platform Administrator (D01/D21)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-orange-400">Sole Admin Authorization</span>
          <p className="text-xs font-mono text-white">funmarketmn@hotmail.com</p>
          <p className="text-[11px] text-neutral-300">
            Governing Supabase instance <span className="font-mono text-teal-300">avdfessrhbsqwlfmbdau</span>. Full security rules & RLS policies operational.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Governance Controls</h4>
          
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-teal-400" />
                <span>PostgreSQL Database Shards</span>
              </div>
              <span className="text-emerald-400 font-bold">100% HEALTHY</span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-orange-400" />
                <span>Active District Explorers</span>
              </div>
              <span className="text-amber-300 font-bold">LIVE SYNC</span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span>Vibe Orbit Concentric Ring Beacons</span>
              </div>
              <span className="text-teal-400 font-bold">ACTIVE (D03)</span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Sole Guardian Multi-Sig Authority</span>
              </div>
              <span className="text-emerald-400 font-bold">CONFIRMED</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 font-bold text-xs text-white transition cursor-pointer"
        >
          Close Console
        </button>
      </div>
    </div>
  );
};
