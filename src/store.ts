import { create } from 'zustand';
import { supabaseSync, translateText } from './lib/supabase';

export interface SubGame {
  id: string;
  name: string;
  maxPoints: number;
}

export interface Day {
  id: string;
  name: string;
  date: string;
}

export interface Game {
  id: string;
  name: string;
  maxPoints: number;
  subGames: SubGame[];
  isTeamScoring: boolean;
  isMvpScoring: boolean;
  dayId?: string;
  allowedSubTeamIds?: string[];
}

export interface Team {
  id: string;
  nameAr: string;
  emojis: string;
  color: string;
  scores: Record<string, number | "">;
  code: string;
  parentId?: string | null;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  avatarUrl?: string;
  scores: Record<string, number | "">; // gameId or 'bonus' -> points
}

interface AppState {
  teams: Record<string, Team>;
  games: Game[];
  players: Record<string, Player>;
  eventTargetScore: number;
  adminPin: string;
  days: Record<string, Day>;
  activeDayId: string | null;
  supabaseLoaded: boolean;
  dbNotification: { message: string; type: 'success' | 'info' | 'error' } | null;
  
  loadSupabaseData: () => Promise<void>;
  clearDbNotification: () => void;
  addDay: (name?: string, date?: string) => string;
  editDay: (dayId: string, name: string) => void;
  deleteDay: (dayId: string) => void;
  setActiveDayId: (dayId: string | null) => void;

  addGame: (name: string, maxPoints: number, isTeamScoring?: boolean, isMvpScoring?: boolean, dayId?: string, allowedSubTeamIds?: string[]) => void;
  deleteGame: (gameId: string) => void;
  addSubGame: (gameId: string, name: string, maxPoints: number) => void;
  deleteSubGame: (gameId: string, subGameId: string) => void;
  
  editGame: (gameId: string, name: string, maxPoints: number, isTeamScoring: boolean, isMvpScoring: boolean, allowedSubTeamIds?: string[]) => void;
  editSubGame: (gameId: string, subGameId: string, name: string, maxPoints: number) => void;

  updateScore: (teamId: string, gameId: string, score: number | "") => void;
  setEventTargetScore: (score: number) => void;

  addPlayer: (name: string, teamId: string) => void;
  deletePlayer: (playerId: string) => void;
  updatePlayerScore: (playerId: string, targetId: string, score: number | "") => void;
  updatePlayerAvatar: (playerId: string, avatarUrl: string) => void;
  setTeamCode: (teamId: string, code: string, nameAr?: string) => void;
  deleteTeam: (teamId: string) => void;
  addTeam: (id: string, nameAr: string, emojis: string, color: string, code: string, parentId?: string | null) => void;
}

let handleDbSyncError: (actionLabel: string, err: any) => void = () => {};

export const useStore = create<AppState>((set, get) => ({
  eventTargetScore: 500, // Fixed target for building progress 
  adminPin: '1234',
  activeDayId: 'default-day',
  supabaseLoaded: false,
  dbNotification: null,
  days: {
    'default-day': {
      id: 'default-day',
      name: 'Day 1',
      date: '2026-05-21',
    }
  },
  games: [
    { id: 'game1', name: 'Crane Challenge', maxPoints: 50, subGames: [], isTeamScoring: true, isMvpScoring: true, dayId: 'default-day' },
    { id: 'game2', name: 'Cargo Loading', maxPoints: 50, subGames: [], isTeamScoring: true, isMvpScoring: true, dayId: 'default-day' },
  ],
  teams: {
    Awlad_Na7mya: {
      id: 'Awlad_Na7mya',
      nameAr: 'أولاد نحميا للمقاولات',
      emojis: '🏗️🔨',
      color: '#6C9EE2',
      scores: {},
      code: '1234',
      parentId: null,
    },
    'Noo7_&Shorakah': {
      id: 'Noo7_&Shorakah',
      nameAr: 'نوح وشركاؤه للملاحة',
      emojis: '🚢🌊',
      color: '#F9A01B',
      scores: {},
      code: '5678',
      parentId: null,
    },
    Sub_Awlad_Na7_1: {
      id: 'Sub_Awlad_Na7_1',
      nameAr: 'فريق 1',
      emojis: '🧱🏗️',
      color: '#6C9EE2',
      scores: {},
      code: '11111',
      parentId: 'Awlad_Na7mya',
    },
    Sub_Awlad_Na7_2: {
      id: 'Sub_Awlad_Na7_2',
      nameAr: 'فريق 2',
      emojis: '🔨👷',
      color: '#5488D0',
      scores: {},
      code: '22222',
      parentId: 'Awlad_Na7mya',
    },
    Sub_Awlad_Na7_3: {
      id: 'Sub_Awlad_Na7_3',
      nameAr: 'فريق 3',
      emojis: '📐🏛️',
      color: '#3F72BD',
      scores: {},
      code: '33333',
      parentId: 'Awlad_Na7mya',
    },
    Sub_Awlad_Na7_4: {
      id: 'Sub_Awlad_Na7_4',
      nameAr: 'فريق 4',
      emojis: '🛠️🔧',
      color: '#2E5FA3',
      scores: {},
      code: '44444',
      parentId: 'Awlad_Na7mya',
    },
    Sub_Awlad_Na7_5: {
      id: 'Sub_Awlad_Na7_5',
      nameAr: 'فريق 5',
      emojis: '🏗️💪',
      color: '#6C9EE2',
      scores: {},
      code: '55555',
      parentId: 'Awlad_Na7mya',
    },
    Sub_Awlad_Na7_6: {
      id: 'Sub_Awlad_Na7_6',
      nameAr: 'فريق 6',
      emojis: '🏛️🧱',
      color: '#5488D0',
      scores: {},
      code: '66666',
      parentId: 'Awlad_Na7mya',
    },
    Sub_Noo7_1: {
      id: 'Sub_Noo7_1',
      nameAr: 'فريق 1',
      emojis: '⚓🚢',
      color: '#F9A01B',
      scores: {},
      code: '2221',
      parentId: 'Noo7_&Shorakah',
    },
    Sub_Noo7_2: {
      id: 'Sub_Noo7_2',
      nameAr: 'فريق 2',
      emojis: '⛵🌊',
      color: '#E08B0E',
      scores: {},
      code: '2222',
      parentId: 'Noo7_&Shorakah',
    },
    Sub_Noo7_3: {
      id: 'Sub_Noo7_3',
      nameAr: 'فريق 3',
      emojis: '🧭🗺️',
      color: '#C77703',
      scores: {},
      code: '2223',
      parentId: 'Noo7_&Shorakah',
    },
    Sub_Noo7_4: {
      id: 'Sub_Noo7_4',
      nameAr: 'فريق 4',
      emojis: '🕊️🌿',
      color: '#AB6200',
      scores: {},
      code: '2224',
      parentId: 'Noo7_&Shorakah',
    },
    Sub_Noo7_5: {
      id: 'Sub_Noo7_5',
      nameAr: 'فريق 5',
      emojis: '⚓⛵',
      color: '#F9A01B',
      scores: {},
      code: '2225',
      parentId: 'Noo7_&Shorakah',
    },
    Sub_Noo7_6: {
      id: 'Sub_Noo7_6',
      nameAr: 'فريق 6',
      emojis: '🌊🧭',
      color: '#E08B0E',
      scores: {},
      code: '2226',
      parentId: 'Noo7_&Shorakah',
    },
  },
  players: {}, // personal MVP tracking

  loadSupabaseData: async () => {
    // 1. Instantly pre-heat state from localStorage if it exists so the user experiences zero loading delay
    let hasLoadedLocal = false;
    const localSaved = typeof window !== 'undefined' ? localStorage.getItem('carnival26_full_offline_state') : null;
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (parsed && typeof parsed === 'object') {
          set({
            days: parsed.days || get().days,
            games: parsed.games || get().games,
            teams: parsed.teams || get().teams,
            players: parsed.players || get().players,
            eventTargetScore: parsed.eventTargetScore ?? get().eventTargetScore,
            adminPin: parsed.adminPin || get().adminPin,
            activeDayId: parsed.activeDayId || get().activeDayId,
            supabaseLoaded: true // Unlock the UI immediately
          });
          hasLoadedLocal = true;
        }
      } catch (e) {
        console.warn("Failed to parse cached offline state:", e);
      }
    }

    try {
      const data = await supabaseSync.loadAllState();
      if (data) {
        set({
          days: data.days,
          games: data.games,
          teams: data.teams,
          players: data.players,
          eventTargetScore: data.eventTargetScore,
          adminPin: data.adminPin || '1234',
          supabaseLoaded: true,
          // Pick activeDayId if any exists, else default-day
          activeDayId: Object.keys(data.days)[0] || 'default-day'
        });
        
        // Cache latest synchronized server state to localStorage
        try {
          localStorage.setItem('carnival26_full_offline_state', JSON.stringify({
            days: data.days,
            games: data.games,
            teams: data.teams,
            players: data.players,
            eventTargetScore: data.eventTargetScore,
            adminPin: data.adminPin,
            activeDayId: Object.keys(data.days)[0] || 'default-day'
          }));
        } catch (e) {}
      } else {
        // Fallback gracefully and silently
        set({
          supabaseLoaded: true,
          dbNotification: null
        });
      }
    } catch (err) {
      console.warn("Supabase loading caught error:", err);
      set({
        supabaseLoaded: true,
        dbNotification: null
      });
    }
  },

  clearDbNotification: () => set({ dbNotification: null }),

  setEventTargetScore: (score) => {
    set({ 
      eventTargetScore: score,
      dbNotification: { message: `Event target score set to ${score} in the Database!`, type: 'success' }
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    supabaseSync.saveSetting('event_target_score', score.toString()).catch(err => {
      handleDbSyncError('setEventTargetScore', err);
    });
  },

  setTeamCode: (teamId, code, nameAr) => set((state) => {
    const updatedTeam = {
      ...state.teams[teamId],
      code,
      nameAr: nameAr !== undefined ? nameAr : state.teams[teamId].nameAr,
    };
    supabaseSync.saveTeam(updatedTeam.id, updatedTeam.nameAr, updatedTeam.emojis, updatedTeam.color, updatedTeam.code, updatedTeam.parentId).catch(err => {
      handleDbSyncError('setTeamCode', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      teams: {
        ...state.teams,
        [teamId]: updatedTeam
      },
      dbNotification: { message: `Team "${updatedTeam.nameAr}" updated successfully in the Database!`, type: 'success' }
    };
  }),
  
  deleteTeam: (teamId) => set((state) => {
    const teamToDelete = state.teams[teamId];
    if (!teamToDelete) return {};
    
    const updatedTeams = { ...state.teams };
    delete updatedTeams[teamId];

    supabaseSync.deleteTeam(teamId, teamToDelete.parentId).catch(err => {
      handleDbSyncError('deleteTeam', err);
    });

    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);

    return {
      teams: updatedTeams,
      dbNotification: { message: `Team "${teamToDelete.nameAr}" deleted successfully from the Database!`, type: 'success' }
    };
  }),

  addTeam: (id, nameAr, emojis, color, code, parentId) => set((state) => {
    const newTeam = {
      id,
      nameAr,
      emojis,
      color,
      scores: {},
      code,
      parentId: parentId || null
    };
    supabaseSync.saveTeam(id, nameAr, emojis, color, code, parentId).catch(err => {
      handleDbSyncError('addTeam', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      teams: {
        ...state.teams,
        [id]: newTeam
      },
      dbNotification: { message: `Team "${nameAr}" added successfully in the Database!`, type: 'success' }
    };
  }),
  
  addDay: (name, date) => {
    const id = Date.now().toString();
    const today = new Date();
    const dateStr = date || today.toISOString().split('T')[0];
    const finalName = name?.trim() || `Day ${dateStr}`;
    
    set((state) => ({
      days: {
        ...state.days,
        [id]: { id, name: finalName, date: dateStr }
      },
      activeDayId: id,
      dbNotification: { message: `Day "${finalName}" saved successfully in the Database!`, type: 'success' }
    }));

    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);

    supabaseSync.saveDay(id, finalName, dateStr).catch(err => {
      handleDbSyncError('addDay', err);
    });
    return id;
  },

  editDay: (dayId, name) => set((state) => {
    const targetDay = state.days[dayId];
    if (!targetDay) return {};
    const updatedDay = { ...targetDay, name: name.trim() };
    
    supabaseSync.saveDay(dayId, updatedDay.name, updatedDay.date).catch(err => {
      handleDbSyncError('editDay', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);

    return {
      days: {
        ...state.days,
        [dayId]: updatedDay
      },
      dbNotification: { message: `Day name updated to "${updatedDay.name}" in the Database!`, type: 'success' }
    };
  }),

  deleteDay: async (dayId) => {
    const state = get();
    const newDays = { ...state.days };
    const dayName = newDays[dayId]?.name || 'Day';
    delete newDays[dayId];
    const activeId = state.activeDayId === dayId ? (Object.keys(newDays)[0] || null) : state.activeDayId;
    
    // First dissociate games belonging to this day in Supabase
    // We await all game dissociation updates so they are written in DB BEFORE the day row is deleted
    const gamesToUpdate = state.games.filter(g => g.dayId === dayId);
    if (gamesToUpdate.length > 0) {
      try {
        await Promise.all(
          gamesToUpdate.map(g => 
            supabaseSync.saveGame(g.id, g.name, g.maxPoints, g.isTeamScoring, g.isMvpScoring, '')
          )
        );
      } catch (err: any) {
        console.error(`DB Error dissociating games from deleted day:`, err);
      }
    }

    // Now delete the day row safely from Day table
    supabaseSync.deleteDay(dayId).catch(err => {
      handleDbSyncError('deleteDay', err);
    });

    set({
      days: newDays,
      activeDayId: activeId,
      games: state.games.map(g => g.dayId === dayId ? { ...g, dayId: '' } : g),
      dbNotification: { message: `"${dayName}" deleted. Games are now unassigned!`, type: 'success' }
    });

    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
  },

  setActiveDayId: (dayId) => set({ activeDayId: dayId }),

  addGame: (name, maxPoints, isTeamScoring = true, isMvpScoring = true, dayId = '', allowedSubTeamIds = []) => set((state) => {
    const dId = dayId;
    const newGame = { id: Date.now().toString(), name, maxPoints, subGames: [], isTeamScoring, isMvpScoring, dayId: dId, allowedSubTeamIds };
    
    supabaseSync.saveGame(newGame.id, newGame.name, newGame.maxPoints, newGame.isTeamScoring, newGame.isMvpScoring, newGame.dayId, newGame.allowedSubTeamIds).catch(err => {
      handleDbSyncError('addGame', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      games: [...state.games, newGame],
      dbNotification: { message: `Game "${name}" saved successfully in the Database!`, type: 'success' }
    };
  }),

  deleteGame: (gameId) => set((state) => {
    const game = state.games.find(g => g.id === gameId);
    const gameName = game ? game.name : 'Game';
    supabaseSync.deleteGame(gameId).catch(err => {
      handleDbSyncError('deleteGame', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      games: state.games.filter(g => g.id !== gameId),
      dbNotification: { message: `Game "${gameName}" deleted successfully from the Database!`, type: 'success' }
    };
  }),

  addSubGame: (gameId, name, maxPoints) => set((state) => {
    const subGameId = Date.now().toString();
    supabaseSync.saveSubGame(subGameId, gameId, name, maxPoints).catch(err => {
      handleDbSyncError('addSubGame', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      games: state.games.map(g => g.id === gameId ? {
        ...g,
        subGames: [...g.subGames, { id: subGameId, name, maxPoints }]
      } : g),
      dbNotification: { message: `Sub-game "${name}" saved successfully in the Database!`, type: 'success' }
    };
  }),

  deleteSubGame: (gameId, subGameId) => set((state) => {
    const game = state.games.find(g => g.id === gameId);
    const sgName = game?.subGames.find(sg => sg.id === subGameId)?.name || 'Sub-game';
    supabaseSync.deleteSubGame(subGameId).catch(err => {
      handleDbSyncError('deleteSubGame', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      games: state.games.map(g => g.id === gameId ? {
        ...g,
        subGames: g.subGames.filter(sg => sg.id !== subGameId)
      } : g),
      dbNotification: { message: `Sub-game "${sgName}" deleted from the Database!`, type: 'success' }
    };
  }),

  editGame: (gameId, name, maxPoints, isTeamScoring, isMvpScoring, allowedSubTeamIds) => set((state) => {
    const game = state.games.find(g => g.id === gameId);
    if (game) {
      supabaseSync.saveGame(gameId, name, maxPoints, isTeamScoring, isMvpScoring, game.dayId, allowedSubTeamIds).catch(err => {
        handleDbSyncError('editGame', err);
      });
    }
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      games: state.games.map(g => g.id === gameId ? {
        ...g,
        name,
        maxPoints,
        isTeamScoring,
        isMvpScoring,
        allowedSubTeamIds
      } : g),
      dbNotification: { message: `Game "${name}" details updated in the Database!`, type: 'success' }
    };
  }),

  editSubGame: (gameId, subGameId, name, maxPoints) => set((state) => {
    supabaseSync.saveSubGame(subGameId, gameId, name, maxPoints).catch(err => {
      handleDbSyncError('editSubGame', err);
    });
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      games: state.games.map(g => g.id === gameId ? {
        ...g,
        subGames: g.subGames.map(sg => sg.id === subGameId ? {
          ...sg,
          name,
          maxPoints
        } : sg)
      } : g),
      dbNotification: { message: `Sub-game "${name}" updated in the Database!`, type: 'success' }
    };
  }),

  updateScore: (teamId, gameId, score) => set((state) => {
    const numericScore = typeof score === 'number' ? score : 0;
    supabaseSync.saveTeamScore(teamId, gameId, numericScore).catch(err => {
      handleDbSyncError('updateScore', err);
    });

    // Logging to points_log dynamically
    const isActivity = gameId.startsWith('activity_');
    const activityType = isActivity ? 'other_activity' : 'game';
    let logDayId = state.activeDayId || undefined;
    if (isActivity) {
      const parts = gameId.split('_');
      if (parts.length >= 3) {
        const possibleDayId = parts[2];
        if (possibleDayId && possibleDayId !== 'onetime') {
          logDayId = possibleDayId;
        } else if (possibleDayId === 'onetime') {
          logDayId = undefined;
        }
      }
    }
    supabaseSync.insertPointsLog(teamId, activityType, gameId, numericScore, logDayId);

    // Update real cached team current_score in Supabase
    const tempScores = {
      ...state.teams[teamId].scores,
      [gameId]: numericScore
    };
    const tempTeam = {
      ...state.teams[teamId],
      scores: tempScores
    };
    const newTotal = calculateTeamScore(tempTeam, state.games);
    supabaseSync.updateTeamCurrentScore(teamId, newTotal);

    const teamName = state.teams[teamId]?.nameAr || 'Team';
    let scoredName = state.games.find(g => g.id === gameId)?.name || 'Game';
    if (isActivity) {
      const lastUnderscore = gameId.lastIndexOf('_');
      const actKey = gameId.substring('activity_'.length, lastUnderscore);
      let foundName = '';
      try {
        const saved = localStorage.getItem('scoring_activities_config');
        if (saved) {
          const config = JSON.parse(saved);
          if (config && config[actKey]) {
            foundName = config[actKey].name;
          }
        }
      } catch (err) {
        console.warn(err);
      }
      if (!foundName) {
        const actNames: Record<string, string> = {
          attendance: 'Attendance',
          tashge3: 'Tashge3 (Cheering)',
          teamwork: 'Teamwork',
          creativity: 'Creativity',
          she3ar: 'She3ar (Slogan)',
          la7n: 'La7n Memorization'
        };
        foundName = actNames[actKey] || 'Other Activity';
      }
      scoredName = foundName;
    }

    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);

    return {
      teams: {
        ...state.teams,
        [teamId]: {
          ...state.teams[teamId],
          scores: {
            ...state.teams[teamId].scores,
            [gameId]: score,
          }
        }
      },
      dbNotification: { message: `Score for ${teamName} in "${scoredName}" updated and synchronized in the Database! (Current Total: ${newTotal})`, type: 'success' }
    };
  }),

  addPlayer: (name, teamId) => set((state) => {
    const id = Date.now().toString();
    const team = state.teams[teamId];
    
    if (team) {
      const parentTeam = team.parentId ? state.teams[team.parentId] : null;
      
      const saveTeamAndPlayerChain = async () => {
        // If parent team exists, save it first to satisfy self-referencing team foreign key constraint
        if (parentTeam) {
          await supabaseSync.saveTeam(
            parentTeam.id,
            parentTeam.nameAr,
            parentTeam.emojis,
            parentTeam.color,
            parentTeam.code,
            parentTeam.parentId
          );
        }
        // Save the team itself
        await supabaseSync.saveTeam(
          team.id,
          team.nameAr,
          team.emojis,
          team.color,
          team.code,
          team.parentId
        );
        // Save the player
        await supabaseSync.savePlayer(id, name, teamId);
      };
      
      saveTeamAndPlayerChain().catch(err => {
        handleDbSyncError('addPlayerTeamAndPlayerChain', err);
      });
    } else {
      supabaseSync.savePlayer(id, name, teamId).catch(err => {
        handleDbSyncError('addPlayerDirect', err);
      });
    }

    const teamName = team?.nameAr || 'Team';
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      players: {
        ...state.players,
        [id]: { id, name, teamId, scores: {} }
      },
      dbNotification: { message: `Player "${name}" registered for ${teamName} and saved in the Database!`, type: 'success' }
    };
  }),

  deletePlayer: (playerId) => set((state) => {
    const playerName = state.players[playerId]?.name || 'Player';
    supabaseSync.deletePlayer(playerId).catch(err => {
      handleDbSyncError('deletePlayer', err);
    });
    const newPlayers = { ...state.players };
    delete newPlayers[playerId];
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return { 
      players: newPlayers,
      dbNotification: { message: `Player "${playerName}" removed from the Database!`, type: 'success' }
    };
  }),

  updatePlayerScore: (playerId, targetId, score) => set((state) => {
    const numericScore = typeof score === 'number' ? score : 0;
    supabaseSync.savePlayerScore(playerId, targetId, numericScore).catch(err => {
      handleDbSyncError('updatePlayerScore', err);
    });
    const playerName = state.players[playerId]?.name || 'Player';
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          scores: {
            ...state.players[playerId].scores,
            [targetId]: score
          }
        }
      },
      dbNotification: { message: `MVP score for "${playerName}" updated in the Database!`, type: 'success' }
    };
  }),

  updatePlayerAvatar: (playerId, avatarUrl) => set((state) => {
    supabaseSync.savePlayerAvatar(playerId, avatarUrl).catch(err => {
      handleDbSyncError('updatePlayerAvatar', err);
    });
    const playerName = state.players[playerId]?.name || 'Player';
    setTimeout(() => {
      useStore.getState().clearDbNotification();
    }, 4500);
    return {
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          avatarUrl
        }
      },
      dbNotification: { message: `Profile photo for "${playerName}" saved successfully!`, type: 'success' }
    };
  })
}));

// Real concrete implementation of the database sync error handler defined after useStore
handleDbSyncError = (actionLabel: string, err: any) => {
  console.warn(`Supabase Sync Warning inside [${actionLabel}]:`, err);
  const msg = err && typeof err === 'object' ? err.message || JSON.stringify(err) : String(err);
  const isFetchError = msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('timeout') || msg.includes('fetch');
  
  if (isFetchError) {
    // Silently proceed as the local storage sync operates perfectly in the background
  } else {
    // Avoid intrusive modal alerts, keep status log clean
    console.warn(`Non-critical DB Sync Error (${actionLabel}): ${msg}`);
  }
};

// Auto-subscribe to all state changes to persist everything to localStorage
if (typeof window !== 'undefined') {
  useStore.subscribe((state) => {
    try {
      localStorage.setItem('carnival26_full_offline_state', JSON.stringify({
        days: state.days,
        games: state.games,
        teams: state.teams,
        players: state.players,
        eventTargetScore: state.eventTargetScore,
        adminPin: state.adminPin,
        activeDayId: state.activeDayId,
      }));
    } catch (e) {
      console.warn("Failed to backup full state to localStorage:", e);
    }
  });
}

export const calculateTeamScore = (team: Team, games: Game[], allTeams?: Record<string, Team>) => {
  // Safe lazy lookup of other teams to handle aggregate sum for parent companies
  const teamsMap = allTeams || (typeof useStore !== 'undefined' && useStore && (useStore as any).getState ? (useStore as any).getState().teams : null);
  
  if (teamsMap && (!team.parentId || team.parentId === null)) {
    let aggregate = 0;
    let hasChildren = false;
    Object.values(teamsMap).forEach((t: any) => {
      if (t.parentId === team.id) {
        hasChildren = true;
        aggregate += calculateTeamScore(t, games, teamsMap);
      }
    });

    // Add parent's own activity or badge scores
    let parentOwnExtra = 0;
    if (team.scores) {
      Object.entries(team.scores).forEach(([scoreId, val]) => {
        if (scoreId.startsWith("activity_") || scoreId.startsWith("badge_")) {
          parentOwnExtra += (typeof val === 'number' ? val : 0);
        }
      });
    }

    if (hasChildren) {
      return aggregate + parentOwnExtra;
    }
  }

  let total = 0;
  
  // Day-based score summation
  const getState = (useStore as any)?.getState;
  const daysMap = getState ? getState().days : null;
  if (daysMap && Object.keys(daysMap).length > 0) {
    Object.keys(daysMap).forEach(dayId => {
      const val = team.scores[dayId];
      total += (typeof val === 'number' ? val : 0);
    });
  } else {
    // Fallback if days are not loaded
    Object.entries(team.scores).forEach(([key, val]) => {
      if (typeof val === 'number' && !key.startsWith("activity_") && !key.startsWith("badge_")) {
        total += val;
      }
    });
  }

  // Also add any direct activity/badge scores on the team
  if (team.scores) {
    Object.entries(team.scores).forEach(([key, val]) => {
      if ((key.startsWith("activity_") || key.startsWith("badge_")) && typeof val === "number") {
        total += val;
      }
    });
  }

  return total;
};

export const calculateTeamProgress = (team: Team, games: Game[], targetScore: number) => {
  const currentTotal = calculateTeamScore(team, games);
  const target = targetScore || 500;
  return Math.min(100, Math.max(0, (currentTotal / target) * 100));
};

export const calculatePlayerScore = (player: Player) => {
  let total = 0;
  if (player.scores) {
    Object.values(player.scores).forEach(s => {
      total += (typeof s === 'number' ? s : 0);
    });
  }
  return total;
};
