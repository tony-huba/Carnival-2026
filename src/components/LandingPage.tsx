import React from 'react';
import { useStore, calculateTeamProgress, calculateTeamScore } from '../store';

interface LandingPageProps {
  onSelectTeam: (teamId: string) => void;
  onBack: () => void;
}

export function LandingPage({ onSelectTeam, onBack }: LandingPageProps) {
  const teams = useStore((state) => state.teams);
  const games = useStore((state) => state.games);
  const eventTargetScore = useStore((state) => state.eventTargetScore);

  // Filter top-level parent teams
  const parentTeams = Object.values(teams).filter(team => !team.parentId);

  const handleParentClick = (parentId: string) => {
    onSelectTeam(parentId);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] flex flex-col p-0 font-sans">
      <div 
        className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full blur-[60px] pointer-events-none z-0" 
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0) 70%)' }} 
      />

      <div className="relative z-10 w-full flex flex-col">
        {/* Navigation / Switch Portal Header */}
        <div className="absolute top-6 left-6 md:left-[80px] z-50 flex gap-4">
          <button 
            onClick={onBack}
            className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-white transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wide"
          >
            ← Switch Portal
          </button>
        </div>

        {/* Dynamic Titles for Parent selection */}
        <div className="pt-[100px] px-8 md:px-[80px] pb-[40px] w-full max-w-[1100px] mx-auto flex flex-col items-start z-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-[2rem] font-[200] text-[#64748b] mb-1">Hello!</h2>
          <h1 className="text-[3.5rem] leading-[1.1] font-[700] text-[#0F172A] tracking-[-0.02em] mb-2">Pick Your Company</h1>
          <p className="text-[1.25rem] text-[#64748b] mt-2">Choose the main sector to open the 3D visual workspace</p>
        </div>

        {/* 1. Parent Companies View */}
        {(() => {
          const scoresMap = parentTeams.map(t => ({
            team: t,
            score: calculateTeamScore(t, games)
          }));
          const maxScore = Math.max(...scoresMap.map(s => s.score));
          const hasScores = maxScore > 0;
          const isDraw = scoresMap.every(s => s.score === maxScore);

          return (
            <div className="w-full max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[32px] px-8 md:px-[80px] z-10 pb-[100px] animate-in fade-in zoom-in-95 duration-200">
              {parentTeams.map(team => {
                 const score = calculateTeamScore(team, games);
                 const isWinning = hasScores && !isDraw && score === maxScore;

                 return (
                   <button
                      key={team.id}
                      onClick={() => handleParentClick(team.id)}
                      className="group relative w-full h-[380px] rounded-[48px] flex flex-col items-center justify-center text-white text-center shadow-[0_20px_40px_rgba(0,0,0,0.1)] cursor-pointer transition-transform duration-200 hover:scale-[1.025] active:scale-[0.98] overflow-hidden"
                      style={{ backgroundColor: team.color }}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {isWinning && (
                        <div className="absolute top-[32px] bg-amber-400 text-slate-900 px-5 py-1.5 rounded-full text-xs font-black tracking-wider flex items-center gap-1 shadow-md animate-bounce">
                          <span>👑</span>
                          <span>CURRENT LEADER</span>
                        </div>
                      )}

                      <div className="text-[4rem] mb-6 relative z-10">{team.emojis}</div>
                      <div className="text-[2.5rem] font-bold mb-2 leading-[1.2] relative z-10 font-sansArabic">
                        {team.nameAr}
                      </div>
                      
                      <div className="absolute bottom-[24px] bg-white/20 backdrop-blur-[10px] px-6 py-2 rounded-full text-[0.875rem] font-semibold flex items-center gap-2">
                        <span className="font-bold">🏆 {score} PTS</span>
                      </div>
                    </button>
                 );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
