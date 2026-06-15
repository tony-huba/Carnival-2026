import React, { useState } from 'react';
import { useStore, calculatePlayerScore, Player } from '../store';
import { cn } from '../lib/utils';
import { Trophy, Award, Filter, ShieldCheck, ArrowDownWideNarrow, Search, X, Camera, Eye, Upload } from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';

interface MvpLeaderboardProps {
  darkMode?: boolean;
  loggedInTeamId?: string | null;
  adminUserType?: 'super' | 'team';
}

export function MvpLeaderboard({ 
  darkMode = false,
  loggedInTeamId = null,
  adminUserType = 'super'
}: MvpLeaderboardProps) {
  const teams = useStore((state) => state.teams);
  const games = useStore((state) => state.games);
  const players = useStore((state) => state.players);

  const updatePlayerAvatar = useStore((state) => state.updatePlayerAvatar);

  // Resolve parent ID for logged-in team to cover both parent and sub-team viewer login states
  const loggedInParentId = loggedInTeamId 
    ? (teams[loggedInTeamId]?.parentId || loggedInTeamId)
    : null;

  // Search states
  const [teamLeaderboardSearchQuery, setTeamLeaderboardSearchQuery] = useState('');
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    loggedInTeamId && !Object.values(teams).some(t => t.parentId === loggedInTeamId)
      ? loggedInTeamId
      : 'all'
  );
  
  // Filter state for individual list
  const [selectedGameId, setSelectedGameId] = useState<string>('all');

  // Popup detail state for clicked player
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Cropping Modal configuration state
  const [croppingPlayer, setCroppingPlayer] = useState<{ id: string; name: string } | null>(null);

  // Avatar Choice options & full viewer state
  const [avatarActionPlayer, setAvatarActionPlayer] = useState<{ id: string; name: string; avatarUrl: string } | null>(null);
  const [viewingAvatarUrl, setViewingAvatarUrl] = useState<{ name: string; url: string } | null>(null);

  // Convert players record to array, filtered to only primary division teams
  const playersList = Object.values(players).filter(p => {
    const team = teams[p.teamId];
    if (!team) return false;
    
    const isPrimary = team.parentId === 'Awlad_Na7mya' || team.parentId === 'Noo7_&Shorakah' || team.id === 'Awlad_Na7mya' || team.id === 'Noo7_&Shorakah';
    if (!isPrimary) return false;
    
    if (loggedInParentId) {
      const playerParentId = team.parentId || team.id;
      return playerParentId === loggedInParentId;
    }
    return true;
  });

  // Filtered games that have MVP scoring enabled
  const mvpGames = games.filter(g => g.isMvpScoring !== false);

  // Group players by team and find MVPs for each team, incorporating searching
  const untruncatedTeamMvps = Object.values(teams).filter(team => team.parentId === 'Awlad_Na7mya' || team.parentId === 'Noo7_&Shorakah').map(team => {
    // Get all players in this team
    const teamPlayers = playersList.filter(p => p.teamId === team.id);
    const filteredTeamPlayers = teamPlayers.filter(p =>
      !teamLeaderboardSearchQuery.trim() || p.name.toLowerCase().includes(teamLeaderboardSearchQuery.toLowerCase())
    );
    // Sort them descending by overall score
    const sortedTeamPlayers = [...filteredTeamPlayers].sort((a, b) => calculatePlayerScore(b) - calculatePlayerScore(a));
    const highestScore = sortedTeamPlayers.length > 0 ? calculatePlayerScore(sortedTeamPlayers[0]) : 0;
    
    return {
      team,
      totalRosterCount: teamPlayers.length,
      players: sortedTeamPlayers,
      highestScore
    };
  });

  const teamMvps = loggedInParentId
    ? untruncatedTeamMvps.filter(({ team }) => {
        // Show all sister/sibling sub-teams under the same parent
        return team.parentId === loggedInParentId;
      })
    : untruncatedTeamMvps;

  // Calculate scores for individual standings based on filter
  const individualStandings = playersList.map(player => {
    let score = 0;
    if (selectedGameId === 'all') {
      score = calculatePlayerScore(player);
    } else if (selectedGameId === 'bonus') {
      score = player.scores['bonus'] || 0;
    } else {
      score = player.scores[selectedGameId] || 0;
    }
    return {
      player,
      score,
      team: teams[player.teamId]
    };
  })
  // We filter out people who have 0 points if a specific game is selected to make the filtered view cleaner, or keep all
  .filter(item => selectedGameId === 'all' || item.score > 0)
  // Search Filter
  .filter(item => !individualSearchQuery.trim() || item.player.name.toLowerCase().includes(individualSearchQuery.toLowerCase()))
  // Team Filter
  .filter(item => selectedTeamId === 'all' || item.player.teamId === selectedTeamId)
  .sort((a, b) => b.score - a.score);

  // Helper to render rank trophy for top 3
  const renderTrophy = (rank: number) => {
    if (rank === 0) {
      return (
        <span className="flex items-center justify-center w-7 h-7 bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-400 rounded-full shadow-sm animate-pulse">
          <Trophy size={14} className="fill-amber-400 text-amber-500" />
        </span>
      );
    }
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-7 h-7 bg-slate-200 text-slate-800 dark:bg-slate-300/15 dark:text-slate-350 rounded-full shadow-sm">
          <Trophy size={14} className="fill-slate-300 text-slate-400" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-7 h-7 bg-amber-50 text-amber-700 dark:bg-amber-600/10 dark:text-amber-600 rounded-full shadow-sm">
          <Trophy size={14} className="fill-amber-600 text-amber-700" />
        </span>
      );
    }
    return (
      <span className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold font-mono border",
        darkMode 
          ? "bg-white/5 border-white/5 text-white/50" 
          : "bg-slate-100 border-slate-200 text-slate-500"
      )}>
        {rank + 1}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      
      {/* SECTION 1: TEAM MVPs (Stacked style) */}
      <div className={cn(
        "rounded-[24px] border p-6 sm:p-8 shadow-sm",
        darkMode 
          ? "bg-slate-950/60 border-white/10 text-white" 
          : "bg-white border-slate-200 text-slate-800"
      )}>
        <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 mb-6 select-none", darkMode ? "border-white/5" : "border-slate-150")}>
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400 fill-amber-400 animate-pulse shrink-0" size={24} />
            <div>
              <h2 className="text-xl font-bold tracking-tight">Team MVPs & Handbooks</h2>
              <p className={cn("text-xs mt-0.5 font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
                Highest scoring players mapped within their Church teams.
              </p>
            </div>
          </div>

          {/* Search bar next to Team Leaderboard */}
          <div className="relative w-full md:w-72">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className={cn("h-4 w-4", darkMode ? "text-white/40" : "text-slate-450")} />
            </div>
            <input
              type="text"
              value={teamLeaderboardSearchQuery}
              onChange={(e) => setTeamLeaderboardSearchQuery(e.target.value)}
              placeholder="🔍 Search players in teams..."
              className={cn(
                "pl-9 pr-8 py-2 w-full rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 border transition-all",
                darkMode 
                  ? "bg-slate-900 border-white/10 text-white/90 placeholder-white/30" 
                  : "bg-slate-50 border-slate-205 text-slate-700 placeholder-slate-400"
              )}
            />
            {teamLeaderboardSearchQuery && (
              <button
                type="button"
                onClick={() => setTeamLeaderboardSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-slate-400 hover:text-slate-200 font-extrabold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Two Big Cards for the two parent teams ("two big cards le kol team") */}
        {(() => {
          const parentTeamsRef = Object.values(teams).filter(t => !t.parentId && (t.id === 'Awlad_Na7mya' || t.id === 'Noo7_&Shorakah'));
          let designParents = parentTeamsRef.length > 0 ? parentTeamsRef : [
            { id: 'Awlad_Na7mya', nameAr: 'أولاد نحميا للمقاولات', emojis: '🏗️🔨', color: '#6C9EE2' },
            { id: 'Noo7_&Shorakah', nameAr: 'نوح وشركاؤه للملاحة', emojis: '🚢⚓', color: '#E29E6C' }
          ];

          if (loggedInTeamId) {
            const loggedInTeamObj = teams[loggedInTeamId];
            if (loggedInTeamObj) {
              const activeParentId = loggedInTeamObj.parentId || loggedInTeamObj.id;
              designParents = designParents.filter(p => p.id === activeParentId);
            }
          }

          return (
            <div className={cn("grid grid-cols-1 gap-6", designParents.length > 1 && "lg:grid-cols-2")}>
              {designParents.map(parent => {
                const parentSubTeams = teamMvps
                  .filter(({ team }) => team.parentId === parent.id)
                  .sort((a, b) => a.team.id.localeCompare(b.team.id, undefined, { numeric: true, sensitivity: 'base' }));

                return (
                  <div
                    key={parent.id}
                    className={cn(
                      "p-5 sm:p-6 rounded-[28px] border shadow-md flex flex-col gap-6",
                      darkMode 
                        ? "bg-slate-900/60 border-white/5" 
                        : "bg-slate-50/40 border-slate-200"
                    )}
                  >
                    {/* Big Parent Header */}
                    <div 
                      className="rounded-2xl p-4 flex items-center justify-between shadow-sm select-none border border-white/10 text-white"
                      style={{ 
                        background: `linear-gradient(135deg, ${parent.color}F5, ${parent.color}D5)`,
                      }}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-4xl filter drop-shadow">{parent.emojis}</span>
                        <div className="text-left">
                          <h3 className="font-extrabold text-base sm:text-lg font-sansArabic tracking-tight">{parent.nameAr}</h3>
                          <p className="text-[10px] uppercase font-bold tracking-widest opacity-90 mt-0.5">
                            {parentSubTeams.length} Sub-Groups Leaderboards
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subgroups grouped within card */}
                    <div className="space-y-6">
                      {parentSubTeams.length === 0 ? (
                        <div className={cn("p-10 rounded-2xl text-center text-xs italic", darkMode ? "text-slate-500" : "text-slate-400")}>
                          No subgroups matched search criteria.
                        </div>
                      ) : (
                        parentSubTeams.map(({ team, players: sortedPlayers, totalRosterCount }) => {
                          return (
                            <div 
                              key={team.id}
                              className={cn(
                                "border rounded-2xl overflow-hidden shadow-sm transition-all duration-300",
                                darkMode 
                                  ? "bg-slate-950/60 border-white/5" 
                                  : "bg-white border-slate-200"
                              )}
                            >
                              {/* Subteam Header */}
                              <div 
                                className="px-4 py-2.5 flex items-center justify-between gap-2.5 text-white select-none"
                                style={{ backgroundColor: team.color }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{team.emojis}</span>
                                  <h4 className="font-bold text-xs sm:text-sm font-sansArabic">{team.nameAr}</h4>
                                </div>
                                <span className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase">
                                  {sortedPlayers.length} / {totalRosterCount} shown
                                </span>
                              </div>

                              {/* Players List */}
                              <div className="p-3">
                                {sortedPlayers.length === 0 ? (
                                  <div className={cn("p-4 text-center text-xs italic", darkMode ? "text-slate-500" : "text-slate-400")}>
                                    No matching players.
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    {sortedPlayers.slice(0, 10).map((player, idx) => {
                                      const totalScore = calculatePlayerScore(player);
                                      const isMvp = idx === 0 && totalScore > 0;
                                      const isTopThree = idx < 3;

                                      return (
                                        <div 
                                          key={player.id}
                                          onClick={() => setSelectedPlayer(player)}
                                          className={cn(
                                            "relative p-2 rounded-xl border flex items-center justify-between gap-3 scale-[1] hover:scale-[1.01] hover:shadow-xs transition-all duration-200 cursor-pointer select-none",
                                            isMvp 
                                              ? darkMode 
                                                ? "bg-amber-400/5 border-amber-400/25 text-amber-200"
                                                : "bg-amber-500/5 border-amber-350 text-amber-900"
                                              : isTopThree
                                                ? darkMode
                                                  ? "bg-white/5 border-white/10 text-white"
                                                  : "bg-slate-50 border-slate-200 text-slate-800"
                                                : darkMode
                                                  ? "bg-black/10 border-white/5 opacity-80 text-white"
                                                  : "bg-white border-slate-150-opacity-90 text-slate-700"
                                          )}
                                          title="Click to view full game scores breakdown"
                                        >
                                          {/* MVP Badge */}
                                          {isMvp && (
                                            <span className="absolute -top-1.5 left-2 bg-amber-400 text-slate-950 font-black text-[7px] uppercase tracking-wider px-1.5 py-0.2 rounded-full shadow-xs flex items-center gap-0.5 leading-none">
                                              <ShieldCheck size={8} className="stroke-[3]" />
                                              <span>MVP</span>
                                            </span>
                                          )}

                                          {/* Player Info */}
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="shrink-0 scale-[0.8]">{renderTrophy(idx)}</div>

                                            <div 
                                              className="w-6.5 h-6.5 rounded-full shrink-0 overflow-hidden flex items-center justify-center font-black text-[9px] text-white shadow-inner relative border scale-[0.9]"
                                              style={{ 
                                                borderColor: team?.color || '#cbd5e1', 
                                                backgroundColor: `${team?.color || '#cbd5e1'}30`
                                              }}
                                            >
                                              {player.avatarUrl ? (
                                                <img 
                                                  src={player.avatarUrl} 
                                                  alt={player.name} 
                                                  className="w-full h-full object-cover" 
                                                  referrerPolicy="no-referrer" 
                                                />
                                              ) : (
                                                <span className="opacity-90 uppercase" style={{ color: team?.color }}>
                                                  {player.name.trim().substring(0, 2)}
                                                </span>
                                              )}
                                            </div>

                                            <div className="truncate">
                                              <h5 className="font-bold text-xs truncate">
                                                {player.name}
                                              </h5>
                                            </div>
                                          </div>

                                          {/* Score */}
                                          <div className="text-right shrink-0">
                                            <span className={cn(
                                              "text-xs font-black font-mono block leading-none",
                                              isMvp ? "text-amber-500 font-extrabold" : ""
                                            )}>
                                              {totalScore} pts
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* SECTION 2: INDIVIDUAL STANDINGS WITH FILTER BY GAMES */}
      <div className={cn(
        "rounded-[24px] border p-6 sm:p-8 shadow-sm space-y-6",
        darkMode 
          ? "bg-slate-950/60 border-white/10 text-white" 
          : "bg-white border-slate-200 text-slate-800"
      )}>
        {/* Header and Filter Controls */}
        <div className={cn("flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 mb-5", darkMode ? "border-white/5" : "border-slate-150")}>
          <div className="flex items-center gap-3">
            <ArrowDownWideNarrow className="text-indigo-400 shrink-0 select-none" size={24} />
            <div>
              <h2 className={cn("text-xl font-extrabold tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Individual Standings</h2>
              <p className={cn("text-xs mt-0.5 font-medium", darkMode ? "text-slate-400" : "text-slate-505")}>
                View who is leading across the entire tournament. Filter by challenges or teams.
              </p>
            </div>
          </div>

          {/* Interactive Filters Panel on the exact same row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto shrink-0">
            
            {/* 1. Name Search Input Pill */}
            <div className="relative min-w-[180px] w-full sm:w-48">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className={cn("h-4 w-4", darkMode ? "text-white/40" : "text-slate-400")} />
              </div>
              <input
                type="text"
                value={individualSearchQuery}
                onChange={(e) => setIndividualSearchQuery(e.target.value)}
                placeholder="Search name..."
                className={cn(
                  "pl-9.5 pr-8 py-2.5 w-full rounded-full text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 border transition-all shadow-sm",
                  darkMode 
                    ? "bg-slate-900 border-white/10 text-white placeholder-white/40" 
                    : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
                )}
              />
              {individualSearchQuery && (
                <button
                  type="button"
                  onClick={() => setIndividualSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-slate-400 hover:text-red-500 font-extrabold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 2. Team Filter Dropdown Pill */}
            {!(adminUserType === 'team' && loggedInTeamId) && (!loggedInParentId || Object.values(teams).some(t => t.parentId === loggedInParentId)) && (
              <div className="relative w-full sm:w-auto">
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className={cn(
                    "pl-4 pr-8 py-2.5 rounded-full text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 border w-full sm:w-auto appearance-none cursor-pointer shadow-sm",
                    darkMode 
                      ? "bg-slate-900 border-white/10 text-white" 
                      : "bg-white border-slate-300 text-slate-800"
                  )}
                >
                  <option value="all">{loggedInParentId ? "🎪 All Sub-teams" : "🎪 All Teams"}</option>
                  {Object.values(teams)
                    .filter(t => {
                      if (loggedInParentId) {
                        return t.parentId === loggedInParentId;
                      }
                      return t.parentId === 'Awlad_Na7mya' || t.parentId === 'Noo7_&Shorakah';
                    })
                    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.emojis} {t.nameAr}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className={cn("h-4 w-4", darkMode ? "text-white/40" : "text-slate-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {/* 3. Challenge/Game Filter Dropdown Pill */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className={cn(
                  "pl-4 pr-8 py-2.5 rounded-full text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 border w-full sm:w-auto appearance-none cursor-pointer shadow-sm",
                  darkMode 
                    ? "bg-slate-900 border-white/10 text-white" 
                    : "bg-white border-slate-300 text-slate-800"
                )}
              >
                <option value="all">🏆 All Challenges (Overall)</option>
                <option value="bonus">🎁 MVP Bonuses</option>
                {mvpGames.map(g => (
                  <option key={g.id} value={g.id}>🎮 {g.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className={cn("h-4 w-4", darkMode ? "text-white/40" : "text-slate-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Global Individuals Leaderboard Items */}
        {individualStandings.length === 0 ? (
          <div className={cn("p-16 text-center text-xs italic border border-dashed rounded-2xl", darkMode ? "text-slate-500 border-white/10" : "text-slate-400 border-slate-200")}>
            {individualSearchQuery || selectedTeamId !== 'all' ? "No matches found matching your filters." : "No scores registered for this challenge scale yet."}
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
            {individualStandings.map(({ player, score, team }, index) => {
              const isTopThree = index < 3;
              return (
                <div 
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.012] hover:shadow-sm select-none animate-in fade-in duration-100",
                    darkMode 
                      ? isTopThree 
                        ? "bg-white/5 border-white/15" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                      : isTopThree
                        ? "bg-slate-50 border-slate-250 shadow-sm"
                        : "bg-white border-slate-150 hover:bg-slate-50"
                  )}
                  title="Click to view full game scores breakdown"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Rank Trophy Column */}
                    <div className="shrink-0 w-8 flex justify-center">{renderTrophy(index)}</div>
 
                    {/* Roster Player circular avatar fallback initials & Team color */}
                    <div className="flex items-center gap-3 truncate">
                      <div 
                        className="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center font-black text-xs text-white shadow-inner relative border-2"
                        style={{ 
                          borderColor: team?.color || '#cbd5e1', 
                          backgroundColor: `${team?.color || '#cbd5e1'}35`
                        }}
                      >
                        {player.avatarUrl ? (
                          <img 
                            src={player.avatarUrl} 
                            alt={player.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <span className="opacity-95 uppercase font-extrabold" style={{ color: team?.color }}>
                            {player.name.trim().substring(0, 2)}
                          </span>
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm tracking-tight truncate">{player.name}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono shrink-0",
                            darkMode ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500"
                          )}>
                            {team?.emojis} {team?.nameAr}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player Score display */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn(
                      "text-base font-black font-mono tracking-tight",
                      isTopThree ? "text-amber-500 dark:text-amber-400 text-lg" : ""
                    )}>
                      {score}
                    </span>
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", darkMode ? "text-slate-500" : "text-slate-400")}>
                      pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PLAYER DETAIL MODAL BREAKDOWN (GORGEOUS OVERLAY POPUP FOR ACCUMULATED CHALLENGES SCORE) */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div 
            className={cn(
              "w-full max-w-md rounded-[28px] overflow-hidden border shadow-2xl relative transition-all duration-300 transform scale-100 animate-in zoom-in-95",
              darkMode 
                ? "bg-slate-900 border-[#ffbb00]/10 text-white" 
                : "bg-white border-slate-200 text-slate-800"
            )}
          >
            {/* Header with Team Color and Close button */}
            <div 
              className="p-6 text-white relative flex flex-col justify-end min-h-[140px]"
              style={{ backgroundColor: teams[selectedPlayer.teamId]?.color || '#3b82f6' }}
            >
              <button 
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full cursor-pointer transition select-none"
                title="Close"
              >
                <X size={14} className="stroke-[3]" />
              </button>

              <div className="flex items-center gap-4.5">
                {/* Large clickable circular avatar with edit overlay and fallback initials */}
                <div 
                  onClick={() => {
                    if (selectedPlayer.avatarUrl) {
                      setAvatarActionPlayer({ id: selectedPlayer.id, name: selectedPlayer.name, avatarUrl: selectedPlayer.avatarUrl });
                    } else {
                      setCroppingPlayer({ id: selectedPlayer.id, name: selectedPlayer.name });
                    }
                  }}
                  className="w-16 h-16 rounded-full shrink-0 overflow-hidden bg-white/10 border-2 border-white/40 shadow-md relative group cursor-pointer hover:border-white transition-all select-none flex items-center justify-center font-black text-xl text-white"
                  title={selectedPlayer.avatarUrl ? "Click to view or edit profile picture" : "Click to upload profile picture"}
                >
                  {selectedPlayer.avatarUrl ? (
                    <img 
                      src={selectedPlayer.avatarUrl} 
                      alt={selectedPlayer.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="opacity-90 uppercase font-black">
                      {selectedPlayer.name.trim().substring(0, 2)}
                    </span>
                  )}
                  {/* Edit Camera icon overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200 text-white">
                    <Camera size={16} className="stroke-[3]" />
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-black tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white inline-block">
                    {teams[selectedPlayer.teamId]?.nameAr || 'No Team'}
                  </span>
                  <h3 className="text-xl font-black tracking-tight mt-2 font-sans overflow-hidden text-ellipsis whitespace-nowrap">
                    {selectedPlayer.name}
                  </h3>
                </div>
              </div>
            </div>

            {/* Score List Panel */}
            <div className="p-6 space-y-5">
              
              {/* Overall Total Points card */}
              <div className={cn(
                "p-4 rounded-2xl flex items-center justify-between border shadow-inner",
                darkMode ? "bg-[#0b121e]/80 border-white/5" : "bg-slate-50 border-slate-100"
              )}>
                <div>
                  <h4 className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Overall Accumulated Score
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Sum of all challenge games + bonuses</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-3xl font-black font-mono text-amber-500 leading-none">
                    {calculatePlayerScore(selectedPlayer)}
                  </span>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider block mt-0.5", darkMode ? "text-slate-500" : "text-slate-405")}>
                    total pts
                  </span>
                </div>
              </div>

              {/* Individual games list */}
              <div className="space-y-3">
                <h4 className={cn("text-[10px] font-extrabold uppercase tracking-widest border-b pb-2 flex items-center justify-between", darkMode ? "border-white/5 text-slate-400" : "border-slate-150 text-slate-500")}>
                  <span>🎯 Challenges Breakdown</span>
                  <span className="font-mono text-[9px] lowercase text-slate-405">points received</span>
                </h4>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                  
                  {/* Bonus score row */}
                  {(() => {
                    const bonusVal = selectedPlayer.scores['bonus'] || 0;
                    return (
                      <div className={cn(
                        "p-3 rounded-xl border flex flex-col gap-1.5 bg-amber-500/5",
                        darkMode ? "border-amber-400/10" : "border-amber-500/15"
                      )}>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-amber-500 flex items-center gap-1">🎁 MVP Bonus Points</span>
                          <span className="font-mono font-black text-amber-500">+{bonusVal} pts</span>
                        </div>
                        <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, Math.max(0, bonusVal))}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Regular games list */}
                  {mvpGames.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-4">No other challenge games active.</p>
                  ) : (
                    mvpGames.map(g => {
                      const pts = selectedPlayer.scores[g.id] || 0;
                      const max = g.maxPoints || 100;
                      const percentage = Math.min(100, Math.max(0, (pts / max) * 100));

                      return (
                        <div key={g.id} className={cn(
                          "p-3 rounded-xl border flex flex-col gap-1.5 transition-colors",
                          darkMode ? "bg-[#0b1320]/45 border-white/5 hover:bg-[#0b1320]/75" : "bg-white border-slate-150 hover:bg-slate-50"
                        )}>
                          <div className="flex justify-between items-center text-xs">
                            <span className={cn("font-bold truncate mr-2", darkMode ? "text-slate-300" : "text-slate-705")}>
                              🎮 {g.name}
                            </span>
                            <div className="shrink-0 flex items-baseline gap-0.5 font-mono">
                              <span className={cn("font-black text-sm", pts > 0 ? "text-emerald-500" : darkMode ? "text-white/40" : "text-slate-400")}>
                                {pts}
                              </span>
                              <span className="text-[9px] text-slate-400">/{max} pts</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-305" 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="w-full bg-[#0F172A] border border-transparent hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition select-none cursor-pointer text-center"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Avatar Action Choice Dialog */}
      {avatarActionPlayer && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-amber-500 flex items-center gap-1.5 font-sans">
                📸 Profile Photo Options
              </h3>
              <button 
                type="button" 
                onClick={() => setAvatarActionPlayer(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-red-500 transition"
              >
                <X size={15} />
              </button>
            </div>
            
            <p className="text-slate-600 font-semibold text-sm mb-6 text-center leading-relaxed">
              What would you like to do for <strong className="text-slate-900 font-black">{avatarActionPlayer.name}</strong>?
            </p>
            
            <div className="flex flex-col gap-3 font-sans font-bold text-xs">
              <button
                type="button"
                onClick={() => {
                  setViewingAvatarUrl({ name: avatarActionPlayer.name, url: avatarActionPlayer.avatarUrl });
                  setAvatarActionPlayer(null);
                }}
                className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Eye size={15} />
                View Profile Picture
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCroppingPlayer({ id: avatarActionPlayer.id, name: avatarActionPlayer.name });
                  setAvatarActionPlayer(null);
                }}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Upload size={15} />
                Upload New Photo
              </button>
              
              <button
                type="button"
                onClick={() => setAvatarActionPlayer(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Avatar Circular Screen Lightbox */}
      {viewingAvatarUrl && (
        <div 
          onClick={() => setViewingAvatarUrl(null)}
          className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm cursor-zoom-out select-none animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="w-full max-w-sm rounded-3xl overflow-hidden bg-transparent flex flex-col items-center animate-in zoom-in-95 duration-200"
          >
            <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full overflow-hidden border-4 border-amber-400 shadow-2xl bg-slate-900 flex items-center justify-center">
              <img 
                src={viewingAvatarUrl.url} 
                alt={viewingAvatarUrl.name}
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="mt-5 text-center px-4">
              <h4 className="text-white text-lg font-black tracking-tight font-sans">{viewingAvatarUrl.name}</h4>
              <p className="text-slate-400 text-xs mt-1.5 font-semibold">Profile Photo</p>
            </div>

            <button
              type="button"
              onClick={() => setViewingAvatarUrl(null)}
              className="mt-6 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-full border border-white/10 transition cursor-pointer font-sans"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}

      {/* Player Profile Image Cropper Modal popup trigger */}
      {croppingPlayer && (
        <ImageCropperModal
          playerName={croppingPlayer.name}
          playerId={croppingPlayer.id}
          onClose={() => setCroppingPlayer(null)}
          onSaveAvatar={(url) => {
            updatePlayerAvatar(croppingPlayer.id, url);
            // Sync with current detail overlay active card
            if (selectedPlayer && selectedPlayer.id === croppingPlayer.id) {
              setSelectedPlayer((prev) => (prev ? { ...prev, avatarUrl: url } : null));
            }
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
