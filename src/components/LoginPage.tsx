import React, { useState } from 'react';
import { useStore, calculateTeamProgress, calculateTeamScore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Lock, ArrowLeft, ShieldAlert } from 'lucide-react';

interface LoginPageProps {
  onLoginAsAdmin: (userType: 'super' | 'team', teamId: string | null) => void;
  onLoginAsViewer: () => void;
}

export function LoginPage({ onLoginAsAdmin, onLoginAsViewer }: LoginPageProps) {
  const teams = useStore((state) => state.teams);
  const games = useStore((state) => state.games);
  const eventTargetScore = useStore((state) => state.eventTargetScore);
  const adminPin = useStore((state) => state.adminPin);
  
  const [viewState, setViewState ] = useState<'portal-select' | 'team-select' | 'subteam-grid' | 'password-entry'>('portal-select');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  
  // Selected target details for password entry
  const [selectedTarget, setSelectedTarget] = useState<{
    id: string;
    name: string;
    emojis: string;
    code: string;
    type: 'super' | 'team';
  } | null>(null);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [hoveredButtonId, setHoveredButtonId] = useState<string | null>(null);

  // Group teams into Construction and Shipping for easy navigation
  const childTeams = Object.values(teams).filter(t => t.parentId);
  
  const constructionTeams = childTeams
    .filter(t => t.parentId === 'Awlad_Na7mya')
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  const shippingTeams = childTeams
    .filter(t => t.parentId === 'Noo7_&Shorakah')
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

  const handleSelectTarget = (target: { id: string; name: string; emojis: string; code: string; type: 'super' | 'team' }) => {
    setSelectedTarget(target);
    setPassword('');
    setError('');
    setViewState('password-entry');
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    if (selectedTarget.type === 'super') {
      // Super Admin password is dynamic from database/store (e.g. 6626)
      if (password === adminPin) {
        onLoginAsAdmin('super', null);
      } else {
        setError('Incorrect PIN code');
      }
    } else {
      // Team password is its code
      if (password === selectedTarget.code) {
        onLoginAsAdmin('team', selectedTarget.id);
      } else {
        setError(`Incorrect PIN code for ${selectedTarget.name}`);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Soft background decor radial light */}
      <div 
        className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full blur-[60px] pointer-events-none z-0" 
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0) 70%)' }} 
      />
      
      <div className={`bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_50px_rgba(30,41,59,0.06)] border border-slate-100 relative z-10 flex flex-col min-h-[420px] justify-center transition-all duration-300 ${
        viewState === 'subteam-grid' 
          ? 'max-w-6xl w-full' 
          : viewState === 'team-select'
            ? 'max-w-xl w-full'
            : 'max-w-md w-full'
      }`}>
        
        <AnimatePresence mode="wait">
          {/* STEP 1: Portal Select */}
          {viewState === 'portal-select' && (
            <motion.div
              key="portal-select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center"
            >
              <h1 className="text-4xl font-extrabold text-[#0D1B2A] mb-8 text-center tracking-tight leading-tight">
                Select Portal
              </h1>
              
              <div className="w-full space-y-4">
                <button
                  type="button"
                  onClick={onLoginAsViewer}
                  className="w-full bg-[#0F172A] text-white py-4 rounded-[18px] text-lg font-bold transition hover:bg-slate-800 shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🎪</span> Teams Portal
                </button>
                <button
                  type="button"
                  onClick={() => setViewState('team-select')}
                  className="w-full bg-white text-[#0F172A] border-[1.5px] border-[#E2E8F0] py-4 rounded-[18px] text-lg font-semibold transition hover:bg-slate-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <span>🛠️</span> Admin Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Select Admin Role / Group Category */}
          {viewState === 'team-select' && (
            <motion.div
              key="team-select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col"
            >
              {/* Back to portal selection */}
              <button 
                type="button"
                onClick={() => setViewState('portal-select')}
                className="self-start text-xs font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 mb-6 bg-slate-50 hover:bg-slate-100 p-1.5 px-3 rounded-full cursor-pointer"
              >
                <ArrowLeft size={13} /> Back
              </button>

              <h1 className="text-3xl font-extrabold text-[#0D1B2A] mb-2 text-center tracking-tight">
                Select Admin Role
              </h1>
              <p className="text-xs text-slate-400 mb-6 text-center">Select the division dashboard to manage points & progress</p>

              {/* Layout for divisions and Super Admin */}
              <div className="space-y-4">
                {/* 1. Super Admin View Option */}
                <button
                  type="button"
                  onClick={() => handleSelectTarget({
                    id: 'super',
                    name: 'Super Admin',
                    emojis: '👑',
                    code: adminPin,
                    type: 'super'
                  })}
                  className="w-full group bg-slate-[55] hover:bg-slate-900 hover:text-white border-[1.5px] border-slate-200 p-5 rounded-[22px] flex items-center justify-between transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center gap-4 text-left">
                    <span className="text-3xl bg-white p-2 text-center flex items-center justify-center rounded-xl shadow-xs group-hover:scale-105 transition-transform duration-200 shrink-0">👑</span>
                    <div>
                      <span className="font-extrabold text-[15px] block font-sansArabic group-hover:text-white text-slate-800">Super Admin</span>
                      <span className="text-[11px] block text-slate-400 font-medium font-sans">Access full management console and global configurations</span>
                    </div>
                  </div>
                  <span className="text-slate-350 group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-200 text-xl font-bold font-mono">🔑</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2.5: Sub-team Grid Layout matching the specified designs */}
          {viewState === 'subteam-grid' && selectedParentId && (
            <motion.div
              key="subteam-grid"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col"
            >
              {/* Return back to category console */}
              <button 
                type="button"
                onClick={() => {
                  setViewState('team-select');
                  setSelectedParentId(null);
                }}
                className="self-start text-xs font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 mb-6 bg-slate-50 hover:bg-slate-100 p-1.5 px-3 rounded-full cursor-pointer"
              >
                <ArrowLeft size={13} /> Back to Divisions
              </button>

              <div className="text-center mb-6">
                <h2 className="text-[#64748b] font-bold text-xs uppercase tracking-widest mb-1.5 select-none font-sans">
                  {selectedParentId === 'Awlad_Na7mya' ? 'CONSTRUCTION SECTOR' : 'MARITIME SECTOR'}
                </h2>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight font-sansArabic">
                  {selectedParentId === 'Awlad_Na7mya' ? (teams.Awlad_Na7mya?.nameAr || 'أولاد نحميا للمقاولات') : (teams['Noo7_&Shorakah']?.nameAr || 'نوح وشركاؤه للملاحة')}
                </h1>
              </div>

              {/* Beautiful Grid matching custom layout with emojis, progress & points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
                {(selectedParentId === 'Awlad_Na7mya' ? constructionTeams : shippingTeams).map(t => {
                  const progress = calculateTeamProgress(t, games, eventTargetScore);
                  const teamScore = calculateTeamScore(t, games);
                  
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTarget({
                        id: t.id,
                        name: t.nameAr,
                        emojis: t.emojis,
                        code: t.code,
                        type: 'team'
                      })}
                      className="group relative w-full h-[220px] rounded-[36px] flex flex-col items-center justify-center text-white text-center shadow-lg border border-white/5 cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] overflow-hidden"
                      style={{ backgroundColor: t.color }}
                    >
                      {/* Glass effect on hover */}
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="text-[3rem] mb-3 relative z-10 filter drop-shadow-sm select-none">
                        {t.emojis}
                      </div>
                      
                      <div className="text-[1.35rem] font-extrabold mb-1 px-4 leading-[1.3] relative z-10 font-sansArabic text-shadow">
                        {t.nameAr}
                      </div>
                      
                      <div className="relative z-10 mt-2 bg-black/35 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold text-white tracking-wider flex items-center justify-center gap-1.5 font-mono select-none">
                        <span>🏆 {teamScore} PTS</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Enter PIN / Password */}
          {viewState === 'password-entry' && selectedTarget && (
            <motion.div
              key="password-entry"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center animate-in fade-in"
            >
              <h2 className="text-[#64748b] font-bold text-xs uppercase tracking-widest mb-1 select-none font-sans">
                {selectedTarget.type === 'super' ? 'MANAGEMENT LOGIN' : 'TEAM ADMIN LOGIN'}
              </h2>
              
              {/* Selected Target Avatar / Chip */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3.5 w-full mb-6 mt-1 shadow-inner">
                <span className="text-3xl select-none shrink-0">{selectedTarget.emojis}</span>
                <div className="text-left flex-1 min-w-0">
                  <span className="font-extrabold text-[15px] text-slate-800 font-sansArabic block truncate select-none">
                    {selectedTarget.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block tracking-wider mt-0.5 select-none">
                    {selectedTarget.type === 'super' ? 'Full Access Superuser' : 'Scoped Team Console'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleVerifyPassword} className="w-full space-y-5 flex flex-col items-center">
                <div className="w-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center select-none font-sans">
                    ENTER PIN CODE
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full text-center text-2xl tracking-[0.4em] p-4 bg-slate-50 hover:bg-slate-100/50 border-[1.5px] border-[#E2E8F0] rounded-[18px] focus:outline-none focus:border-[#0F172A] focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition font-bold"
                      autoFocus
                      placeholder="••••"
                      required
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-350">
                      <Lock size={15} />
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-red-650 text-xs font-bold leading-relaxed flex items-center gap-1.5 bg-red-50 p-3 rounded-xl border border-red-150/40 w-full"
                  >
                    <ShieldAlert size={15} className="shrink-0 text-red-650" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="w-full flex gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTarget.type === 'team') {
                        setViewState('subteam-grid');
                      } else {
                        setViewState('team-select');
                      }
                      setError('');
                      setPassword('');
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-205 text-slate-700 py-3.5 text-sm rounded-[14px] font-bold transition cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <span>←</span> Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#0F172A] hover:bg-slate-800 text-white py-3.5 text-sm rounded-[14px] font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
                  >
                    <span>🔑</span> Enter Dashboard
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
