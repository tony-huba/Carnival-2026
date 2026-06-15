/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { ThreeDViewPage } from './components/ThreeDViewPage';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginPage } from './components/LoginPage';
import { useStore } from './store';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'landing' | '3d' | 'admin'>('login');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [adminUserType, setAdminUserType] = useState<'super' | 'team'>('super');
  const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(null);
  const { loadSupabaseData, supabaseLoaded, dbNotification, clearDbNotification } = useStore();

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setCurrentView('3d');
  };

  if (!supabaseLoaded) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center p-6">
        <div className="bg-[#0f172a] border border-slate-800/80 px-8 py-7 rounded-[26px] shadow-2xl flex items-center gap-6 max-w-sm w-full mx-auto">
          <div className="w-10 h-10 border-[3.5px] border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <h2 className="text-lg font-bold text-white tracking-wide font-sans">Loading Data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Global Database Sync Notification Banner */}
      <AnimatePresence>
        {dbNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-5 left-1/2 z-[9999] w-11/12 max-w-md pointer-events-auto"
          >
            <div className={`border shadow-lg px-4 py-3.5 rounded-xl flex items-center justify-between gap-3 text-[13px] font-medium tracking-wide ${
              dbNotification.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-rose-950/5'
                : dbNotification.type === 'info'
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-amber-950/5'
                : 'bg-[#eefdf5] border-[#a3e635]/40 text-[#166534] shadow-emerald-950/5'
            }`}>
              <div className="flex items-center gap-2.5">
                {dbNotification.type === 'error' ? (
                  <AlertCircle className="text-rose-600 shrink-0 fill-rose-100" size={18} />
                ) : dbNotification.type === 'info' ? (
                  <AlertCircle className="text-amber-600 shrink-0 fill-amber-100" size={18} />
                ) : (
                  <CheckCircle2 className="text-emerald-600 shrink-0 fill-emerald-50" size={18} />
                )}
                <span className="break-words">{dbNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={clearDbNotification}
                className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${
                  dbNotification.type === 'error'
                    ? 'text-rose-700/60 hover:text-rose-900 hover:bg-rose-100'
                    : dbNotification.type === 'info'
                    ? 'text-amber-700/60 hover:text-amber-900 hover:bg-amber-100'
                    : 'text-emerald-700/60 hover:text-emerald-900 hover:bg-emerald-100/50'
                }`}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Views */}
      {currentView === 'login' && (
        <div className="app-zoom-80 min-h-screen">
          <LoginPage 
            onLoginAsAdmin={(userType, teamId) => {
              setAdminUserType(userType);
              setLoggedInTeamId(teamId);
              setCurrentView('admin');
            }}
            onLoginAsViewer={() => setCurrentView('landing')}
          />
        </div>
      )}

      {currentView === 'admin' && (
        <div className="app-zoom-80 min-h-screen">
          <AdminDashboard 
            onBack={() => {
              setAdminUserType('super');
              setLoggedInTeamId(null);
              setCurrentView('login');
            }}
            adminUserType={adminUserType}
            loggedInTeamId={loggedInTeamId}
          />
        </div>
      )}

      {currentView === '3d' && selectedTeam && (
        <ThreeDViewPage teamId={selectedTeam} onBack={() => setCurrentView('landing')} />
      )}

      {currentView === 'landing' && (
        <div className="app-zoom-80 min-h-screen">
          <LandingPage 
            onSelectTeam={handleSelectTeam} 
            onBack={() => setCurrentView('login')} 
          />
        </div>
      )}
    </div>
  );
}

