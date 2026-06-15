import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://idujtthwtkwoeolyawtj.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdWp0dGh3dGt3b2VvbHlhd3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk1ODIsImV4cCI6MjA5NDk4NTU4Mn0.2YKDZmhOhp9Ny2NfchGKS-LeQ4NgLjragFoZR8yhrrg';

const isConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create the Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export function translateText(txt: string): string {
  return txt || '';
}

// High-level synchronization API to persist our application state to the database
export const supabaseSync = {
  // Fetch everything upon app load
  async loadAllState() {
    try {
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('unconfigured')) {
        console.warn('Supabase is unconfigured or using placeholder. Using local fallback.');
        return null;
      }

      // Define standard fetch promise
      const fetchPromise = (async () => {
        // Fetch all tables concurrently to maximize loading speed
        const [
          daysRes,
          gamesRes,
          subGamesRes,
          teamsRes,
          subTeamsRes,
          teamScoresRes,
          activityScoresRes,
          playersRes,
          playerScoresRes,
          settingsRes
        ] = await Promise.all([
          supabase.from('days').select('*'),
          supabase.from('games').select('*'),
          supabase.from('sub_games').select('*'),
          supabase.from('teams').select('*'),
          supabase.from('sub_teams').select('*'),
          supabase.from('team_scores').select('*'),
          supabase.from('activity_score').select('*'),
          supabase.from('players').select('*'),
          supabase.from('player_scores').select('*'),
          supabase.from('settings').select('*')
        ]);

        if (daysRes.error) throw daysRes.error;
        if (gamesRes.error) throw gamesRes.error;
        if (subGamesRes.error) throw subGamesRes.error;
        if (teamsRes.error) throw teamsRes.error;
        if (teamScoresRes.error) throw teamScoresRes.error;
        if (playersRes.error) throw playersRes.error;
        if (playerScoresRes.error) throw playerScoresRes.error;

        const daysData = daysRes.data;
        const gamesData = gamesRes.data;
        const subGamesData = subGamesRes.data;
        const teamsData = teamsRes.data;
        const teamScoresData = teamScoresRes.data;
        const playersData = playersRes.data;
        const playerScoresData = playerScoresRes.data;

        // Sub-teams and activity_score might not exist/be initialized in some setups, fallback gracefully
        const subTeamsData = subTeamsRes.error ? [] : (subTeamsRes.data || []);
        const activityScoresData = activityScoresRes.error ? [] : (activityScoresRes.data || []);

        const settingsData = settingsRes.data;
        const settingsError = settingsRes.error;
        
        let targetScore = 500;
        let adminPin = '1234';
        if (!settingsError && settingsData) {
          const row = settingsData.find(s => s.key === 'event_target_score');
          if (row) targetScore = parseInt(row.value, 10) || 500;

          const pinRow = settingsData.find(s => s.key === 'admin_pin');
          if (pinRow) adminPin = pinRow.value || '1234';
        }

        return {
          daysData,
          gamesData,
          subGamesData,
          teamsData,
          subTeamsData,
          teamScoresData,
          activityScoresData,
          playersData,
          playerScoresData,
          targetScore,
          adminPin
        };
      })();

      // 40 seconds timeout promise (extended to support cold starts and sleeping DB instances safely)
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('Supabase loading timed out after 40 seconds. Switching to local state fallback.');
          resolve(null);
        }, 40000);
      });

      const result = await Promise.race([fetchPromise, timeoutPromise]);
      if (!result) {
        return null;
      }

      const {
        daysData,
        gamesData,
        subGamesData,
        teamsData,
        subTeamsData,
        teamScoresData,
        activityScoresData,
        playersData,
        playerScoresData,
        targetScore,
        adminPin
      } = result;

      // Transform raw base DB objects to frontend app structure
      const daysRecord: Record<string, any> = {};
      daysData?.forEach(day => {
        daysRecord[day.id] = {
          id: day.id,
          name: day.name,
          date: day.date
        };
      });

      // Prepare subgames grouping
      const subgamesByGameId: Record<string, any[]> = {};
      subGamesData?.forEach(sg => {
        if (!subgamesByGameId[sg.game_id]) {
          subgamesByGameId[sg.game_id] = [];
        }
        subgamesByGameId[sg.game_id].push({
          id: sg.id,
          name: sg.name,
          maxPoints: sg.max_points
        });
      });

      const gamesList = (gamesData || []).map(g => {
        const nameParts = (g.name || '').split('|');
        const cleanName = nameParts[0];
        let allowedSubTeamIds: string[] | undefined = undefined;
        if (nameParts[1]) {
          try {
            allowedSubTeamIds = JSON.parse(nameParts[1]);
          } catch(e) {}
        }
        return {
          id: g.id,
          name: cleanName,
          maxPoints: g.max_points,
          subGames: subgamesByGameId[g.id] || [],
          isTeamScoring: g.is_team_scoring,
          isMvpScoring: g.is_mvp_scoring,
          dayId: g.day_id,
          allowedSubTeamIds
        };
      });

      // Prepare team scores grouping
      const scoresByTeamId: Record<string, Record<string, number>> = {};
      teamScoresData?.forEach(row => {
        if (!scoresByTeamId[row.team_id]) {
          scoresByTeamId[row.team_id] = {};
        }
        scoresByTeamId[row.team_id][row.score_id] = row.score;
      });

      // Merge activity scores
      activityScoresData?.forEach(row => {
        if (!scoresByTeamId[row.team_id]) {
          scoresByTeamId[row.team_id] = {};
        }
        scoresByTeamId[row.team_id][row.score_id] = row.score;
      });

      const teamsRecord: Record<string, any> = {};
      teamsData?.forEach(t => {
        teamsRecord[t.id] = {
          id: t.id,
          nameAr: translateText(t.name_ar),
          emojis: t.emojis,
          color: t.color,
          code: t.code,
          parentId: t.parent_id || null,
          scores: scoresByTeamId[t.id] || {}
        };
      });

      subTeamsData?.forEach(st => {
        teamsRecord[st.id] = {
          id: st.id,
          nameAr: translateText(st.name_ar),
          emojis: st.emojis,
          color: st.color,
          code: st.code,
          parentId: st.parent_id || null,
          scores: scoresByTeamId[st.id] || {}
        };
      });

      // Merge fallback default teams if they don't exist in Supabase to avoid losing them
      const defaultTeams: Record<string, any> = {
        Awlad_Na7mya: { id: 'Awlad_Na7mya', nameAr: 'أولاد نحميا للمقاولات', emojis: '🏗️🔨', color: '#6C9EE2', code: '1234', parentId: null },
        'Noo7_&Shorakah': { id: 'Noo7_&Shorakah', nameAr: 'نوح وشركاؤه للملاحة', emojis: '🚢🌊', color: '#F9A01B', code: '5678', parentId: null },
        
        Sub_Awlad_Na7_1: { id: 'Sub_Awlad_Na7_1', nameAr: 'فريق 1', emojis: '🧱🏗️', color: '#6C9EE2', code: '11111', parentId: 'Awlad_Na7mya' },
        Sub_Awlad_Na7_2: { id: 'Sub_Awlad_Na7_2', nameAr: 'فريق 2', emojis: '🔨👷', color: '#5488D0', code: '22222', parentId: 'Awlad_Na7mya' },
        Sub_Awlad_Na7_3: { id: 'Sub_Awlad_Na7_3', nameAr: 'فريق 3', emojis: '📐🏛️', color: '#3F72BD', code: '33333', parentId: 'Awlad_Na7mya' },
        Sub_Awlad_Na7_4: { id: 'Sub_Awlad_Na7_4', nameAr: 'فريق 4', emojis: '🛠️🔧', color: '#2E5FA3', code: '44444', parentId: 'Awlad_Na7mya' },
        Sub_Awlad_Na7_5: { id: 'Sub_Awlad_Na7_5', nameAr: 'فريق 5', emojis: '🏗️💪', color: '#6C9EE2', code: '55555', parentId: 'Awlad_Na7mya' },
        Sub_Awlad_Na7_6: { id: 'Sub_Awlad_Na7_6', nameAr: 'فريق 6', emojis: '🏛️🧱', color: '#5488D0', code: '66666', parentId: 'Awlad_Na7mya' },
        
        Sub_Noo7_1: { id: 'Sub_Noo7_1', nameAr: 'فريق 1', emojis: '⚓🚢', color: '#F9A01B', code: '2221', parentId: 'Noo7_&Shorakah' },
        Sub_Noo7_2: { id: 'Sub_Noo7_2', nameAr: 'فريق 2', emojis: '⛵🌊', color: '#E08B0E', code: '2222', parentId: 'Noo7_&Shorakah' },
        Sub_Noo7_3: { id: 'Sub_Noo7_3', nameAr: 'فريق 3', emojis: '🧭🗺️', color: '#C77703', code: '2223', parentId: 'Noo7_&Shorakah' },
        Sub_Noo7_4: { id: 'Sub_Noo7_4', nameAr: 'فريق 4', emojis: '🕊️🌿', color: '#AB6200', code: '2224', parentId: 'Noo7_&Shorakah' },
        Sub_Noo7_5: { id: 'Sub_Noo7_5', nameAr: 'فريق 5', emojis: '⚓⛵', color: '#F9A01B', code: '2225', parentId: 'Noo7_&Shorakah' },
        Sub_Noo7_6: { id: 'Sub_Noo7_6', nameAr: 'فريق 6', emojis: '🌊🧭', color: '#E08B0E', code: '2226', parentId: 'Noo7_&Shorakah' },
      };

      const hasDBCreatedTeams = (teamsData && teamsData.length > 0) || (subTeamsData && subTeamsData.length > 0);
      
      if (!hasDBCreatedTeams) {
        Object.keys(defaultTeams).forEach(id => {
          if (!teamsRecord[id]) {
            teamsRecord[id] = {
              ...defaultTeams[id],
              scores: scoresByTeamId[id] || {}
            };
          }
        });
      }

      // Prepare player scores grouping
      const scoresByPlayerId: Record<string, Record<string, number>> = {};
      playerScoresData?.forEach(row => {
        if (!scoresByPlayerId[row.player_id]) {
          scoresByPlayerId[row.player_id] = {};
        }
        scoresByPlayerId[row.player_id][row.target_id] = row.score;
      });

      const playersRecord: Record<string, any> = {};
      playersData?.forEach(p => {
        playersRecord[p.id] = {
          id: p.id,
          name: p.name,
          teamId: p.team_id,
          avatarUrl: p.avatar_url || '',
          scores: scoresByPlayerId[p.id] || {}
        };
      });

      return {
        days: daysRecord,
        games: gamesList,
        teams: teamsRecord,
        players: playersRecord,
        eventTargetScore: targetScore,
        adminPin: adminPin,
      };

    } catch (e) {
      console.error('Error fetching state from Supabase:', e);
      return null;
    }
  },

  // Save/Upsert Day to Supabase
  async saveDay(id: string, name: string, date: string) {
    try {
      const { error } = await supabase.from('days').upsert({ id, name, date });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error writing day:', e);
      throw e;
    }
  },

  // Delete Day
  async deleteDay(id: string) {
    try {
      const { error } = await supabase.from('days').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error deleting day:', e);
      throw e;
    }
  },

  // Save/Upsert Game to Supabase
  async saveGame(id: string, name: string, maxPoints: number, isTeamScoring: boolean, isMvpScoring: boolean, dayId?: string, allowedSubTeamIds?: string[]) {
    try {
      const dbName = allowedSubTeamIds && allowedSubTeamIds.length > 0 
        ? `${name}|${JSON.stringify(allowedSubTeamIds)}`
        : name;
      const { error } = await supabase.from('games').upsert({
        id,
        name: dbName,
        max_points: maxPoints,
        is_team_scoring: isTeamScoring,
        is_mvp_scoring: isMvpScoring,
        day_id: dayId || null
      });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error writing game:', e);
      throw e;
    }
  },

  // Delete Game
  async deleteGame(id: string) {
    try {
      const { error } = await supabase.from('games').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error deleting game:', e);
      throw e;
    }
  },

  // Save/Upsert SubGame
  async saveSubGame(id: string, gameId: string, name: string, maxPoints: number) {
    try {
      const { error } = await supabase.from('sub_games').upsert({
        id,
        game_id: gameId,
        name,
        max_points: maxPoints
      });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error writing sub_game:', e);
      throw e;
    }
  },

  // Delete SubGame
  async deleteSubGame(id: string) {
    try {
      const { error } = await supabase.from('sub_games').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error deleting sub_game:', e);
      throw e;
    }
  },

  // Upsert Team Info
  async saveTeam(id: string, nameAr: string, emojis: string, color: string, code: string, parentId?: string | null) {
    try {
      const isSubTeam = parentId || id.startsWith('Sub_') || id.includes('_');
      const tableToUse = isSubTeam ? 'sub_teams' : 'teams';
      const { error } = await supabase.from(tableToUse).upsert({
        id,
        name_ar: nameAr,
        emojis,
        color,
        code,
        parent_id: parentId || null
      });
      if (error) {
        // Fallback to update on the other table if schema differs or if some rows are placed differently
        const { error: fallbackError } = await supabase.from(tableToUse === 'sub_teams' ? 'teams' : 'sub_teams').upsert({
          id,
          name_ar: nameAr,
          emojis,
          color,
          code,
          parent_id: parentId || null
        });
        if (fallbackError) throw fallbackError;
      }
    } catch (e) {
      console.error('Supabase Error writing team:', e);
      throw e;
    }
  },

  // Upsert Team Score
  async saveTeamScore(teamId: string, scoreId: string, score: number) {
    try {
      if (scoreId.startsWith('activity_')) {
        const { error } = await supabase.from('activity_score').upsert({
          team_id: teamId,
          score_id: scoreId,
          score
        });
        if (error) {
          console.warn('Failed to save to activity_score, falling back to team_scores:', error);
          const { error: fallbackErr } = await supabase.from('team_scores').upsert({
            team_id: teamId,
            score_id: scoreId,
            score
          });
          if (fallbackErr) throw fallbackErr;
        }
      } else {
        const { error } = await supabase.from('team_scores').upsert({
          team_id: teamId,
          score_id: scoreId,
          score
        });
        if (error) throw error;
      }
    } catch (e) {
      console.error('Supabase Error writing team score:', e);
      throw e;
    }
  },

  // Insert row into points_log
  async insertPointsLog(teamId: string, activityType: string, activityId: string, points: number, dayId?: string) {
    try {
      await supabase.from('points_log').insert({
        team_id: teamId,
        activity_type: activityType,
        activity_id: activityId,
        points: points,
        day_id: dayId || null
      });
    } catch (e) {
      // Consume silently to avoid filling logs or triggering warning dialogues
    }
  },

  // Update team's current_score directly in Support table
  async updateTeamCurrentScore(teamId: string, currentScore: number) {
    try {
      const isSubTeam = teamId.startsWith('Sub_') || teamId.includes('_');
      const tableToUse = isSubTeam ? 'sub_teams' : 'teams';
      const { error } = await supabase.from(tableToUse).update({
        current_score: currentScore
      }).eq('id', teamId);
      if (error) {
        // Fallback to update on the other table
        await supabase.from(tableToUse === 'sub_teams' ? 'teams' : 'sub_teams').update({
          current_score: currentScore
        }).eq('id', teamId);
      }
    } catch (e) {
      console.warn('Updating team current score failed gracefully:', e);
    }
  },

  // Save/Upsert Player
  async savePlayer(id: string, name: string, teamId: string) {
    try {
      const { error } = await supabase.from('players').upsert({
        id,
        name,
        team_id: teamId
      });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error writing player:', e);
      throw e;
    }
  },

  // Delete Player
  async deletePlayer(id: string) {
    try {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error deleting player:', e);
      throw e;
    }
  },

  // Delete Team
  async deleteTeam(id: string, parentId?: string | null) {
    try {
      const isSubTeam = parentId || id.startsWith('Sub_') || id.includes('_');
      const tableToUse = isSubTeam ? 'sub_teams' : 'teams';
      const { error } = await supabase.from(tableToUse).delete().eq('id', id);
      if (error) {
        const { error: fallbackError } = await supabase.from(tableToUse === 'sub_teams' ? 'teams' : 'sub_teams').delete().eq('id', id);
        if (fallbackError) throw fallbackError;
      }
    } catch (e) {
      console.error('Supabase Error deleting team:', e);
      throw e;
    }
  },

  // Save Player Avatar public URL or Base64
  async savePlayerAvatar(playerId: string, avatarUrl: string) {
    try {
      const { error } = await supabase.from('players').update({
        avatar_url: avatarUrl
      }).eq('id', playerId);
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error updating player avatar:', e);
      throw e;
    }
  },

  // Save/Upsert Player Score
  async savePlayerScore(playerId: string, targetId: string, score: number) {
    try {
      const { error } = await supabase.from('player_scores').upsert({
        player_id: playerId,
        target_id: targetId,
        score
      });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error writing player score:', e);
      throw e;
    }
  },

  // Save global settings
  async saveSetting(key: string, value: string) {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase Error updating setting:', e);
      throw e;
    }
  }
};
