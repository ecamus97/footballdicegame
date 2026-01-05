import { useState, useCallback, useMemo, useEffect } from "react";
import { Match, TeamStanding, MatchResult, Team, TournamentConfig, TournamentFormat } from "@/types/game";
import { teams as defaultTeams } from "@/data/teams";

const STORAGE_KEY = "campeonato-chileno-2026";

interface SavedGameState {
  matches: Match[];
  standings: Map<string, TeamStanding>;
  teamLevels: Record<string, 1 | 2 | 3 | 4>;
  tournamentConfig: TournamentConfig;
  savedAt: string;
}

// Get default tournament config
const getDefaultTournamentConfig = (): TournamentConfig => ({
  name: "Campeonato Chileno 2026",
  format: "double",
  participatingTeamIds: defaultTeams.map(t => t.id),
});

// Generate round-robin fixture
const generateFixture = (teamList: Team[], format: TournamentFormat): Match[] => {
  const matches: Match[] = [];
  const teamIds = teamList.map(t => t.id);
  const n = teamIds.length;
  
  if (n < 2) return [];
  
  const numRounds = n - 1;
  const half = n / 2;
  
  let matchId = 1;
  
  for (let matchday = 0; matchday < numRounds; matchday++) {
    const indices = teamIds.map((_, i) => i).slice(1);
    
    for (let r = 0; r < matchday; r++) {
      indices.push(indices.shift()!);
    }
    
    const newIndices = [0, ...indices];
    
    for (let i = 0; i < half; i++) {
      const home = newIndices[i];
      const away = newIndices[n - 1 - i];
      
      if (home < n && away < n) {
        const homeTeam = teamIds[matchday % 2 === 0 ? home : away];
        const awayTeam = teamIds[matchday % 2 === 0 ? away : home];
        
        matches.push({
          id: `match-${matchId++}`,
          matchday: matchday + 1,
          homeTeamId: homeTeam,
          awayTeamId: awayTeam,
          homeGoals: null,
          awayGoals: null,
          played: false,
        });
      }
    }
  }
  
  // Create second leg matches (vuelta) if format is double
  if (format === "double") {
    const firstLegMatches = [...matches];
    for (const match of firstLegMatches) {
      matches.push({
        id: `match-${matchId++}`,
        matchday: match.matchday + numRounds,
        homeTeamId: match.awayTeamId,
        awayTeamId: match.homeTeamId,
        homeGoals: null,
        awayGoals: null,
        played: false,
      });
    }
  }
  
  return matches.sort((a, b) => a.matchday - b.matchday);
};

// Initialize standings
const initializeStandings = (teamList: Team[]): Map<string, TeamStanding> => {
  const standings = new Map<string, TeamStanding>();
  
  for (const team of teamList) {
    standings.set(team.id, {
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }
  
  return standings;
};

// Get default team levels
const getDefaultTeamLevels = (): Record<string, 1 | 2 | 3 | 4> => {
  const levels: Record<string, 1 | 2 | 3 | 4> = {};
  for (const team of defaultTeams) {
    levels[team.id] = team.level;
  }
  return levels;
};

export const useGameState = () => {
  const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig>(() => getDefaultTournamentConfig());
  const [teamLevels, setTeamLevels] = useState<Record<string, 1 | 2 | 3 | 4>>(() => getDefaultTeamLevels());
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Map<string, TeamStanding>>(() => new Map());
  const [hasSavedGame, setHasSavedGame] = useState(false);

  // Get participating teams with current levels
  const teams = useMemo(() => {
    return defaultTeams
      .filter(team => tournamentConfig.participatingTeamIds.includes(team.id))
      .map(team => ({
        ...team,
        level: teamLevels[team.id] || team.level,
      }));
  }, [teamLevels, tournamentConfig.participatingTeamIds]);

  // Get all available teams (for configuration)
  const allTeams = useMemo(() => {
    return defaultTeams.map(team => ({
      ...team,
      level: teamLevels[team.id] || team.level,
    }));
  }, [teamLevels]);

  // Initialize tournament on first load or when config changes
  useEffect(() => {
    if (matches.length === 0) {
      setMatches(generateFixture(teams, tournamentConfig.format));
      setStandings(initializeStandings(teams));
    }
  }, []);

  // Check for saved game on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setHasSavedGame(!!saved);
  }, []);

  // Get team by ID with current level
  const getTeamById = useCallback((id: string): Team | undefined => {
    const team = defaultTeams.find(t => t.id === id);
    if (team) {
      return { ...team, level: teamLevels[team.id] || team.level };
    }
    return undefined;
  }, [teamLevels]);

  // Roll a single die (1-6)
  const rollDie = useCallback((): number => {
    return Math.floor(Math.random() * 6) + 1;
  }, []);
  
  // Convert die value to goals
  const dieToGoals = useCallback((die: number): number => {
    return die - 1;
  }, []);
  
  // Check if second roll is needed
  const needsSecondRoll = useCallback((
    homeTeam: Team,
    awayTeam: Team,
    homeGoals: number,
    awayGoals: number
  ): boolean => {
    const levelDiff = Math.abs(homeTeam.level - awayTeam.level);
    const strongerTeam = homeTeam.level < awayTeam.level ? "home" : "away";
    const strongerWins = strongerTeam === "home" 
      ? homeGoals > awayGoals 
      : awayGoals > homeGoals;
    
    if (levelDiff === 0) return false;
    
    if (levelDiff === 1) {
      if (strongerTeam === "away") return false;
      return !strongerWins;
    }
    
    return !strongerWins;
  }, []);
  
  // Simulate a match
  const simulateMatch = useCallback((matchId: string): MatchResult | null => {
    const match = matches.find(m => m.id === matchId);
    if (!match || match.played) return null;
    
    const homeTeam = getTeamById(match.homeTeamId)!;
    const awayTeam = getTeamById(match.awayTeamId)!;
    
    const firstHomeRoll = rollDie();
    const firstAwayRoll = rollDie();
    const firstHomeGoals = dieToGoals(firstHomeRoll);
    const firstAwayGoals = dieToGoals(firstAwayRoll);
    
    const requiresSecond = needsSecondRoll(homeTeam, awayTeam, firstHomeGoals, firstAwayGoals);
    
    let finalHomeGoals = firstHomeGoals;
    let finalAwayGoals = firstAwayGoals;
    let secondRoll: { home: number; away: number } | undefined;
    
    if (requiresSecond) {
      const secondHomeRoll = rollDie();
      const secondAwayRoll = rollDie();
      finalHomeGoals = dieToGoals(secondHomeRoll);
      finalAwayGoals = dieToGoals(secondAwayRoll);
      secondRoll = { home: secondHomeRoll, away: secondAwayRoll };
    }
    
    return {
      homeGoals: finalHomeGoals,
      awayGoals: finalAwayGoals,
      firstRoll: { home: firstHomeRoll, away: firstAwayRoll },
      secondRoll,
      requiredSecondRoll: requiresSecond,
    };
  }, [matches, getTeamById, rollDie, dieToGoals, needsSecondRoll]);
  
  // Confirm match result
  const confirmMatchResult = useCallback((matchId: string, result: MatchResult) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      return {
        ...match,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        played: true,
        firstRoll: result.firstRoll,
        secondRoll: result.secondRoll,
      };
    }));
    
    setStandings(prev => {
      const newStandings = new Map(prev);
      const match = matches.find(m => m.id === matchId)!;
      
      const homeStanding = { ...newStandings.get(match.homeTeamId)! };
      const awayStanding = { ...newStandings.get(match.awayTeamId)! };
      
      homeStanding.played++;
      awayStanding.played++;
      
      homeStanding.goalsFor += result.homeGoals;
      homeStanding.goalsAgainst += result.awayGoals;
      awayStanding.goalsFor += result.awayGoals;
      awayStanding.goalsAgainst += result.homeGoals;
      
      if (result.homeGoals > result.awayGoals) {
        homeStanding.won++;
        homeStanding.points += 3;
        awayStanding.lost++;
      } else if (result.awayGoals > result.homeGoals) {
        awayStanding.won++;
        awayStanding.points += 3;
        homeStanding.lost++;
      } else {
        homeStanding.drawn++;
        awayStanding.drawn++;
        homeStanding.points++;
        awayStanding.points++;
      }
      
      homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
      awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;
      
      newStandings.set(match.homeTeamId, homeStanding);
      newStandings.set(match.awayTeamId, awayStanding);
      
      return newStandings;
    });
  }, [matches]);
  
  // Get sorted standings
  const sortedStandings = useMemo(() => {
    return Array.from(standings.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [standings]);
  
  // Get matches by matchday
  const getMatchesByMatchday = useCallback((matchday: number) => {
    return matches.filter(m => m.matchday === matchday);
  }, [matches]);
  
  // Get total matchdays
  const totalMatchdays = useMemo(() => {
    if (matches.length === 0) return 0;
    return Math.max(...matches.map(m => m.matchday));
  }, [matches]);
  
  // Reset tournament with current config
  const resetTournament = useCallback(() => {
    const participatingTeams = defaultTeams
      .filter(team => tournamentConfig.participatingTeamIds.includes(team.id))
      .map(team => ({
        ...team,
        level: teamLevels[team.id] || team.level,
      }));
    setMatches(generateFixture(participatingTeams, tournamentConfig.format));
    setStandings(initializeStandings(participatingTeams));
  }, [tournamentConfig, teamLevels]);

  // Update tournament config
  const updateTournamentConfig = useCallback((config: Partial<TournamentConfig>) => {
    setTournamentConfig(prev => ({ ...prev, ...config }));
  }, []);

  // Apply config changes and reset tournament
  const applyConfigChanges = useCallback(() => {
    const participatingTeams = defaultTeams
      .filter(team => tournamentConfig.participatingTeamIds.includes(team.id))
      .map(team => ({
        ...team,
        level: teamLevels[team.id] || team.level,
      }));
    setMatches(generateFixture(participatingTeams, tournamentConfig.format));
    setStandings(initializeStandings(participatingTeams));
  }, [tournamentConfig, teamLevels]);

  // Update team level
  const updateTeamLevel = useCallback((teamId: string, level: 1 | 2 | 3 | 4) => {
    setTeamLevels(prev => ({
      ...prev,
      [teamId]: level,
    }));
  }, []);

  // Reset team levels to default
  const resetTeamLevels = useCallback(() => {
    setTeamLevels(getDefaultTeamLevels());
  }, []);

  // Save game to localStorage
  const saveGame = useCallback(() => {
    const state: SavedGameState = {
      matches,
      standings,
      teamLevels,
      tournamentConfig,
      savedAt: new Date().toISOString(),
    };
    
    // Convert Map to array for JSON serialization
    const serializable = {
      ...state,
      standings: Array.from(standings.entries()),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    setHasSavedGame(true);
    return true;
  }, [matches, standings, teamLevels, tournamentConfig]);

  // Load game from localStorage
  const loadGame = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    
    try {
      const parsed = JSON.parse(saved);
      
      // Restore matches
      setMatches(parsed.matches);
      
      // Restore standings from array to Map
      const standingsMap = new Map<string, TeamStanding>(parsed.standings);
      setStandings(standingsMap);
      
      // Restore team levels
      setTeamLevels(parsed.teamLevels);
      
      // Restore tournament config (with fallback for old saves)
      if (parsed.tournamentConfig) {
        setTournamentConfig(parsed.tournamentConfig);
      }
      
      return true;
    } catch (e) {
      console.error("Error loading saved game:", e);
      return false;
    }
  }, []);

  // Delete saved game
  const deleteSavedGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedGame(false);
  }, []);

  // Get saved game info
  const getSavedGameInfo = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    try {
      const parsed = JSON.parse(saved);
      const playedMatches = parsed.matches.filter((m: Match) => m.played).length;
      return {
        savedAt: new Date(parsed.savedAt),
        playedMatches,
        totalMatches: parsed.matches.length,
        tournamentName: parsed.tournamentConfig?.name || "Campeonato Chileno 2026",
      };
    } catch {
      return null;
    }
  }, []);
  
  return {
    matches,
    standings: sortedStandings,
    teams,
    allTeams,
    teamLevels,
    tournamentConfig,
    getTeamById,
    simulateMatch,
    confirmMatchResult,
    getMatchesByMatchday,
    totalMatchdays,
    resetTournament,
    updateTournamentConfig,
    applyConfigChanges,
    updateTeamLevel,
    resetTeamLevels,
    saveGame,
    loadGame,
    deleteSavedGame,
    hasSavedGame,
    getSavedGameInfo,
  };
};