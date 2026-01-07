import { useState, useCallback, useMemo, useEffect } from "react";
import { Match, TeamStanding, MatchResult, Team, TournamentConfig, TournamentFormat, InternationalCup, PlayoffMatch, PlayoffSeries, PlayoffRound } from "@/types/game";
import { teams as defaultTeams } from "@/data/teams";

const STORAGE_KEY = "campeonato-chileno-2026";

interface SavedGameState {
  matches: Match[];
  standings: Map<string, TeamStanding>;
  teamLevels: Record<string, 1 | 2 | 3 | 4>;
  teamNames: Record<string, { name: string; shortName: string }>;
  tournamentConfig: TournamentConfig;
  playoffMatches: PlayoffMatch[];
  playoffSeries: PlayoffSeries[];
  savedAt: string;
}

// Get default tournament config
const getDefaultTournamentConfig = (): TournamentConfig => ({
  name: "Campeonato Chileno 2026",
  format: "double",
  participatingTeamIds: defaultTeams.slice(0, 16).map(t => t.id),
  relegationSpots: 2,
  // Playoffs
  playoffsEnabled: false,
  playoffsFormat: "double",
  playoffsTeams: 4,
  // International cups
  internationalCups: [
    { name: "Copa Libertadores", spots: 4, color: "bg-green-500/20 border-l-green-500" },
    { name: "Copa Sudamericana", spots: 2, color: "bg-blue-500/20 border-l-blue-500" },
  ],
  // Promotion/Relegation playoff
  promotionPlayoffEnabled: false,
  promotionPlayoffSpots: 1,
});

// Get default team names
const getDefaultTeamNames = (): Record<string, { name: string; shortName: string }> => {
  const names: Record<string, { name: string; shortName: string }> = {};
  for (const team of defaultTeams) {
    names[team.id] = { name: team.name, shortName: team.shortName };
  }
  return names;
};

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
  const [teamNames, setTeamNames] = useState<Record<string, { name: string; shortName: string }>>(() => getDefaultTeamNames());
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Map<string, TeamStanding>>(() => new Map());
  const [playoffMatches, setPlayoffMatches] = useState<PlayoffMatch[]>([]);
  const [playoffSeries, setPlayoffSeries] = useState<PlayoffSeries[]>([]);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  // Get participating teams with current levels and names
  const teams = useMemo(() => {
    return defaultTeams
      .filter(team => tournamentConfig.participatingTeamIds.includes(team.id))
      .map(team => ({
        ...team,
        name: teamNames[team.id]?.name || team.name,
        shortName: teamNames[team.id]?.shortName || team.shortName,
        level: teamLevels[team.id] || team.level,
      }));
  }, [teamLevels, teamNames, tournamentConfig.participatingTeamIds]);

  // Get all available teams (for configuration)
  const allTeams = useMemo(() => {
    return defaultTeams.map(team => ({
      ...team,
      name: teamNames[team.id]?.name || team.name,
      shortName: teamNames[team.id]?.shortName || team.shortName,
      level: teamLevels[team.id] || team.level,
    }));
  }, [teamLevels, teamNames]);

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

  // Get team by ID with current level and name
  const getTeamById = useCallback((id: string): Team | undefined => {
    const team = defaultTeams.find(t => t.id === id);
    if (team) {
      return { 
        ...team, 
        name: teamNames[team.id]?.name || team.name,
        shortName: teamNames[team.id]?.shortName || team.shortName,
        level: teamLevels[team.id] || team.level 
      };
    }
    return undefined;
  }, [teamLevels, teamNames]);

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
  
  // Internal function to simulate and get result for a match (without confirmation)
  const getMatchSimulationResult = useCallback((match: Match): MatchResult | null => {
    if (match.played) return null;
    
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
  }, [getTeamById, rollDie, dieToGoals, needsSecondRoll]);

  // Simulate a match (for interactive simulation with modal)
  const simulateMatch = useCallback((matchId: string): MatchResult | null => {
    const match = matches.find(m => m.id === matchId);
    if (!match || match.played) return null;
    return getMatchSimulationResult(match);
  }, [matches, getMatchSimulationResult]);
  
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

  // Check if regular season is complete
  const regularSeasonComplete = useMemo(() => {
    if (matches.length === 0) return false;
    return matches.every(m => m.played);
  }, [matches]);

  // Generate playoff matches when regular season completes
  useEffect(() => {
    if (regularSeasonComplete && tournamentConfig.playoffsEnabled && playoffMatches.length === 0) {
      const sortedStandingsArr = Array.from(standings.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
      
      const qualifiedTeams = sortedStandingsArr.slice(0, tournamentConfig.playoffsTeams);
      const format = tournamentConfig.playoffsFormat;
      const isSingleLeg = format === "single";
      const isFinalNeutral = format !== "final_only";
      
      const newPlayoffMatches: PlayoffMatch[] = [];
      const newPlayoffSeries: PlayoffSeries[] = [];
      let matchId = 1;
      let seriesId = 1;
      
      // Determine rounds based on number of teams
      const rounds: PlayoffRound[] = [];
      if (tournamentConfig.playoffsTeams >= 8) rounds.push("quarterfinals");
      if (tournamentConfig.playoffsTeams >= 4) rounds.push("semifinals");
      rounds.push("final");
      
      // Generate first round matchups
      const firstRound = rounds[0];
      const teamsInFirstRound = firstRound === "quarterfinals" ? 8 : firstRound === "semifinals" ? 4 : 2;
      const matchupsInFirstRound = teamsInFirstRound / 2;
      
      for (let i = 0; i < matchupsInFirstRound; i++) {
        const team1Index = i;
        const team2Index = teamsInFirstRound - 1 - i;
        const team1 = qualifiedTeams[team1Index];
        const team2 = qualifiedTeams[team2Index];
        
        const isNeutral = firstRound === "final" ? isFinalNeutral : isSingleLeg;
        
        // For two-leg format, lower seed plays at home first
        // For single-leg, higher seed plays at home (neutral for final)
        const leg1: PlayoffMatch = {
          id: `playoff-${matchId++}`,
          round: firstRound,
          matchNumber: i + 1,
          leg: 1,
          team1Id: isSingleLeg ? team1?.teamId : team2?.teamId,
          team2Id: isSingleLeg ? team2?.teamId : team1?.teamId,
          team1Goals: null,
          team2Goals: null,
          played: false,
          isNeutralVenue: isNeutral,
        };
        newPlayoffMatches.push(leg1);
        
        let leg2Id: string | null = null;
        if (!isSingleLeg) {
          const leg2: PlayoffMatch = {
            id: `playoff-${matchId++}`,
            round: firstRound,
            matchNumber: i + 1,
            leg: 2,
            team1Id: team1?.teamId,
            team2Id: team2?.teamId,
            team1Goals: null,
            team2Goals: null,
            played: false,
            isNeutralVenue: firstRound === "final" && isFinalNeutral,
          };
          newPlayoffMatches.push(leg2);
          leg2Id = leg2.id;
        }
        
        const series: PlayoffSeries = {
          id: `series-${seriesId++}`,
          round: firstRound,
          matchNumber: i + 1,
          team1Id: team1?.teamId,
          team2Id: team2?.teamId,
          team1Seed: team1Index + 1,
          team2Seed: team2Index + 1,
          leg1Id: leg1.id,
          leg2Id,
          winnerId: null,
          team1Aggregate: 0,
          team2Aggregate: 0,
        };
        newPlayoffSeries.push(series);
      }
      
      // Generate placeholder matches for subsequent rounds
      for (let roundIdx = 1; roundIdx < rounds.length; roundIdx++) {
        const round = rounds[roundIdx];
        const prevRoundMatchups = rounds[roundIdx - 1] === "quarterfinals" ? 4 : 2;
        const matchupsInRound = prevRoundMatchups / 2;
        const isNeutral = round === "final" ? isFinalNeutral : isSingleLeg;
        
        for (let i = 0; i < matchupsInRound; i++) {
          const leg1: PlayoffMatch = {
            id: `playoff-${matchId++}`,
            round,
            matchNumber: i + 1,
            leg: 1,
            team1Id: null,
            team2Id: null,
            team1Goals: null,
            team2Goals: null,
            played: false,
            isNeutralVenue: isNeutral,
          };
          newPlayoffMatches.push(leg1);
          
          let leg2Id: string | null = null;
          if (!isSingleLeg && !(round === "final" && isFinalNeutral)) {
            const leg2: PlayoffMatch = {
              id: `playoff-${matchId++}`,
              round,
              matchNumber: i + 1,
              leg: 2,
              team1Id: null,
              team2Id: null,
              team1Goals: null,
              team2Goals: null,
              played: false,
              isNeutralVenue: false,
            };
            newPlayoffMatches.push(leg2);
            leg2Id = leg2.id;
          }
          
          const series: PlayoffSeries = {
            id: `series-${seriesId++}`,
            round,
            matchNumber: i + 1,
            team1Id: null,
            team2Id: null,
            team1Seed: 0,
            team2Seed: 0,
            leg1Id: leg1.id,
            leg2Id,
            winnerId: null,
            team1Aggregate: 0,
            team2Aggregate: 0,
          };
          newPlayoffSeries.push(series);
        }
      }
      
      setPlayoffMatches(newPlayoffMatches);
      setPlayoffSeries(newPlayoffSeries);
    }
  }, [regularSeasonComplete, tournamentConfig.playoffsEnabled, tournamentConfig.playoffsTeams, tournamentConfig.playoffsFormat, standings, playoffMatches.length]);

  // Get playoff round display name
  const getPlayoffRoundName = useCallback((round: PlayoffRound, leg?: number): string => {
    const names: Record<PlayoffRound, string> = {
      quarterfinals: "Cuartos de Final",
      semifinals: "Semifinales",
      final: "Final",
    };
    const legSuffix = leg === 2 ? " (Vuelta)" : leg === 1 && tournamentConfig.playoffsFormat !== "single" ? " (Ida)" : "";
    return names[round] + legSuffix;
  }, [tournamentConfig.playoffsFormat]);

  // Simulate playoff match
  const simulatePlayoffMatch = useCallback((matchId: string): MatchResult | null => {
    const match = playoffMatches.find(m => m.id === matchId);
    if (!match || match.played || !match.team1Id || !match.team2Id) return null;
    
    const team1 = getTeamById(match.team1Id)!;
    const team2 = getTeamById(match.team2Id)!;
    
    // For neutral venue, use level 2 for both (no home advantage)
    const effectiveTeam1 = match.isNeutralVenue ? { ...team1, level: 2 as const } : team1;
    const effectiveTeam2 = match.isNeutralVenue ? { ...team2, level: 2 as const } : team2;
    
    const firstTeam1Roll = rollDie();
    const firstTeam2Roll = rollDie();
    const firstTeam1Goals = dieToGoals(firstTeam1Roll);
    const firstTeam2Goals = dieToGoals(firstTeam2Roll);
    
    const requiresSecond = !match.isNeutralVenue && needsSecondRoll(effectiveTeam1, effectiveTeam2, firstTeam1Goals, firstTeam2Goals);
    
    let finalTeam1Goals = firstTeam1Goals;
    let finalTeam2Goals = firstTeam2Goals;
    let secondRoll: { home: number; away: number } | undefined;
    
    if (requiresSecond) {
      const secondTeam1Roll = rollDie();
      const secondTeam2Roll = rollDie();
      finalTeam1Goals = dieToGoals(secondTeam1Roll);
      finalTeam2Goals = dieToGoals(secondTeam2Roll);
      secondRoll = { home: secondTeam1Roll, away: secondTeam2Roll };
    }
    
    return {
      homeGoals: finalTeam1Goals,
      awayGoals: finalTeam2Goals,
      firstRoll: { home: firstTeam1Roll, away: firstTeam2Roll },
      secondRoll,
      requiredSecondRoll: requiresSecond,
    };
  }, [playoffMatches, getTeamById, rollDie, dieToGoals, needsSecondRoll]);

  // Extended result type for playoffs (includes penalties)
  interface PlayoffMatchResultExtended extends MatchResult {
    needsPenalties?: boolean;
    penalties?: { team1Penalties: number; team2Penalties: number; rounds: { team1: number; team2: number }[] };
    winnerId?: string;
  }

  // Confirm playoff match result
  const confirmPlayoffMatchResult = useCallback((matchId: string, result: PlayoffMatchResultExtended) => {
    const match = playoffMatches.find(m => m.id === matchId);
    if (!match) return;
    
    // Update the match
    setPlayoffMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        team1Goals: result.homeGoals,
        team2Goals: result.awayGoals,
        played: true,
        firstRoll: result.firstRoll,
        secondRoll: result.secondRoll,
        penalties: result.penalties,
      };
    }));
    
    // Update series aggregate and check for winner
    const series = playoffSeries.find(s => s.leg1Id === matchId || s.leg2Id === matchId);
    if (!series) return;
    
    const isSingleLeg = tournamentConfig.playoffsFormat === "single";
    const isFinalNeutral = tournamentConfig.playoffsFormat !== "final_only" && match.round === "final";
    const isOnlyLeg = isSingleLeg || (isFinalNeutral && match.round === "final") || !series.leg2Id;
    
    setPlayoffSeries(prev => {
      const newSeries = prev.map(s => {
        if (s.id !== series.id) return s;
        
        const updatedSeries = { ...s };
        
        // For two-leg format:
        // - Leg 1: match.team1Id = lower seed (home), match.team2Id = higher seed (away)
        //   So leg 1 goals: team1Goals = lower seed goals, team2Goals = higher seed goals
        // - Leg 2: match.team1Id = higher seed (home), match.team2Id = lower seed (away)
        //   So leg 2 goals: team1Goals = higher seed goals, team2Goals = lower seed goals
        // - Series: team1Id = higher seed, team2Id = lower seed
        
        if (s.leg1Id === matchId) {
          // This is leg 1 - match.team1 = lower seed, match.team2 = higher seed
          // So for series aggregate: series.team1 (higher seed) gets result.awayGoals
          //                          series.team2 (lower seed) gets result.homeGoals
          if (!isOnlyLeg) {
            // Two-leg format - teams are swapped in leg 1
            updatedSeries.team1Aggregate += result.awayGoals; // Higher seed's away goals
            updatedSeries.team2Aggregate += result.homeGoals; // Lower seed's home goals
          } else {
            // Single leg - no swap
            updatedSeries.team1Aggregate += result.homeGoals;
            updatedSeries.team2Aggregate += result.awayGoals;
          }
        } else if (s.leg2Id === matchId) {
          // This is leg 2 - match.team1 = higher seed (home), match.team2 = lower seed (away)
          // So for series aggregate: series.team1 (higher seed) gets result.homeGoals
          //                          series.team2 (lower seed) gets result.awayGoals
          updatedSeries.team1Aggregate += result.homeGoals;
          updatedSeries.team2Aggregate += result.awayGoals;
        }
        
        // Check if series is complete
        const leg1Match = playoffMatches.find(m => m.id === s.leg1Id);
        const leg2Match = s.leg2Id ? playoffMatches.find(m => m.id === s.leg2Id) : null;
        const leg1Played = leg1Match?.played || matchId === s.leg1Id;
        const leg2Played = !s.leg2Id || leg2Match?.played || matchId === s.leg2Id;
        
        if (leg1Played && leg2Played) {
          // Determine winner
          if (result.winnerId) {
            // Winner was determined by penalties
            updatedSeries.winnerId = result.winnerId;
          } else if (updatedSeries.team1Aggregate > updatedSeries.team2Aggregate) {
            updatedSeries.winnerId = s.team1Id;
          } else if (updatedSeries.team2Aggregate > updatedSeries.team1Aggregate) {
            updatedSeries.winnerId = s.team2Id;
          } else {
            // Tied on aggregate - shouldn't happen if penalties were handled correctly
            // But as fallback, use last match winner
            updatedSeries.winnerId = result.homeGoals > result.awayGoals ? match.team1Id : match.team2Id;
          }
        }
        
        return updatedSeries;
      });
      
      // Advance winner to next round
      const updatedCurrentSeries = newSeries.find(s => s.id === series.id);
      if (updatedCurrentSeries?.winnerId) {
        const currentRound = updatedCurrentSeries.round;
        const nextRound: PlayoffRound | null = currentRound === "quarterfinals" ? "semifinals" : currentRound === "semifinals" ? "final" : null;
        
        if (nextRound) {
          // Find the next round series that should receive this winner
          const matchNum = updatedCurrentSeries.matchNumber;
          const nextMatchNum = Math.ceil(matchNum / 2);
          const isTeam1 = matchNum % 2 === 1;
          
          return newSeries.map(s => {
            if (s.round === nextRound && s.matchNumber === nextMatchNum) {
              const updated = { ...s };
              if (isTeam1) {
                updated.team1Id = updatedCurrentSeries.winnerId;
                updated.team1Seed = updatedCurrentSeries.team1Id === updatedCurrentSeries.winnerId ? updatedCurrentSeries.team1Seed : updatedCurrentSeries.team2Seed;
              } else {
                updated.team2Id = updatedCurrentSeries.winnerId;
                updated.team2Seed = updatedCurrentSeries.team1Id === updatedCurrentSeries.winnerId ? updatedCurrentSeries.team1Seed : updatedCurrentSeries.team2Seed;
              }
              return updated;
            }
            return s;
          });
        }
      }
      
      return newSeries;
    });
    
    // Also update playoff matches with teams for next round
    setTimeout(() => {
      setPlayoffMatches(prev => {
        const updatedSeries = playoffSeries.find(s => s.leg1Id === matchId || s.leg2Id === matchId);
        if (!updatedSeries) return prev;
        
        // Get the winner from the result or calculate
        let winnerId = result.winnerId;
        
        if (!winnerId) {
          // Check if the series is complete now
          const leg1Match = prev.find(m => m.id === updatedSeries.leg1Id);
          const leg2Match = updatedSeries.leg2Id ? prev.find(m => m.id === updatedSeries.leg2Id) : null;
          
          const isComplete = (leg1Match?.played || matchId === updatedSeries.leg1Id) && 
                            (!updatedSeries.leg2Id || leg2Match?.played || matchId === updatedSeries.leg2Id);
          
          if (!isComplete) return prev;
          
          // Calculate aggregate using same logic as series update
          let team1Agg = 0;
          let team2Agg = 0;
          
          const hasTwoLegs = !!updatedSeries.leg2Id;
          
          if (leg1Match?.played || matchId === updatedSeries.leg1Id) {
            const l1Goals = matchId === updatedSeries.leg1Id 
              ? { t1: result.homeGoals, t2: result.awayGoals }
              : { t1: leg1Match!.team1Goals || 0, t2: leg1Match!.team2Goals || 0 };
            
            if (hasTwoLegs) {
              // Leg 1 teams are swapped: match.team1 = lower seed, match.team2 = higher seed
              // series.team1 = higher seed, series.team2 = lower seed
              team1Agg += l1Goals.t2; // Higher seed's away goals
              team2Agg += l1Goals.t1; // Lower seed's home goals
            } else {
              team1Agg += l1Goals.t1;
              team2Agg += l1Goals.t2;
            }
          }
          
          if (leg2Match?.played || matchId === updatedSeries.leg2Id) {
            const l2Goals = matchId === updatedSeries.leg2Id
              ? { t1: result.homeGoals, t2: result.awayGoals }
              : { t1: leg2Match!.team1Goals || 0, t2: leg2Match!.team2Goals || 0 };
            
            // Leg 2: match.team1 = higher seed (home), match.team2 = lower seed (away)
            team1Agg += l2Goals.t1;
            team2Agg += l2Goals.t2;
          }
          
          if (team1Agg > team2Agg) {
            winnerId = updatedSeries.team1Id;
          } else if (team2Agg > team1Agg) {
            winnerId = updatedSeries.team2Id;
          }
        }
        
        if (!winnerId) return prev;
        
        // Series is complete, find next round matches
        const currentRound = updatedSeries.round;
        const nextRound: PlayoffRound | null = currentRound === "quarterfinals" ? "semifinals" : currentRound === "semifinals" ? "final" : null;
        
        if (!nextRound) return prev;
        
        const matchNum = updatedSeries.matchNumber;
        const nextMatchNum = Math.ceil(matchNum / 2);
        const isTeam1 = matchNum % 2 === 1;
        
        return prev.map(m => {
          if (m.round === nextRound && m.matchNumber === nextMatchNum) {
            const updated = { ...m };
            if (isTeam1) {
              updated.team1Id = winnerId;
            } else {
              updated.team2Id = winnerId;
            }
            return updated;
          }
          return m;
        });
      });
    }, 100);
  }, [playoffMatches, playoffSeries, tournamentConfig.playoffsFormat]);

  // Get series for a match
  const getSeriesForMatch = useCallback((matchId: string) => {
    return playoffSeries.find(s => s.leg1Id === matchId || s.leg2Id === matchId) || null;
  }, [playoffSeries]);

  // Get leg 1 match for a given match
  const getLeg1Match = useCallback((matchId: string) => {
    const series = playoffSeries.find(s => s.leg2Id === matchId);
    if (!series) return null;
    return playoffMatches.find(m => m.id === series.leg1Id) || null;
  }, [playoffMatches, playoffSeries]);

  // Simulate multiple matchdays at once
  const simulateMatchdays = useCallback((numMatchdays: number) => {
    const unplayedMatches = matches.filter(m => !m.played).sort((a, b) => a.matchday - b.matchday);
    if (unplayedMatches.length === 0) return 0;

    // Get the matchdays to simulate
    const currentMatchday = unplayedMatches[0].matchday;
    const lastMatchday = Math.min(currentMatchday + numMatchdays - 1, totalMatchdays);
    
    const matchesToSimulate = unplayedMatches.filter(m => m.matchday <= lastMatchday);
    
    // Simulate all matches and collect results
    const results: { matchId: string; result: MatchResult }[] = [];
    
    for (const match of matchesToSimulate) {
      const result = getMatchSimulationResult(match);
      if (result) {
        results.push({ matchId: match.id, result });
      }
    }

    // Apply all results at once
    setMatches(prev => prev.map(match => {
      const simResult = results.find(r => r.matchId === match.id);
      if (!simResult) return match;
      
      return {
        ...match,
        homeGoals: simResult.result.homeGoals,
        awayGoals: simResult.result.awayGoals,
        played: true,
        firstRoll: simResult.result.firstRoll,
        secondRoll: simResult.result.secondRoll,
      };
    }));

    // Update standings for all simulated matches
    setStandings(prev => {
      const newStandings = new Map(prev);
      
      for (const { matchId, result } of results) {
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
      }
      
      return newStandings;
    });

    return results.length;
  }, [matches, totalMatchdays, getMatchSimulationResult]);
  
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
    setPlayoffMatches([]);
    setPlayoffSeries([]);
  }, [tournamentConfig, teamLevels]);

  // Update tournament config
  const updateTournamentConfig = useCallback((config: Partial<TournamentConfig>) => {
    setTournamentConfig(prev => ({ ...prev, ...config }));
  }, []);

  // Apply config changes and reset tournament
  const applyConfigChanges = useCallback((newConfig?: TournamentConfig) => {
    const configToUse = newConfig || tournamentConfig;
    const participatingTeams = defaultTeams
      .filter(team => configToUse.participatingTeamIds.includes(team.id))
      .map(team => ({
        ...team,
        level: teamLevels[team.id] || team.level,
      }));
    setMatches(generateFixture(participatingTeams, configToUse.format));
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

  // Update team name
  const updateTeamName = useCallback((teamId: string, name: string, shortName: string) => {
    setTeamNames(prev => ({
      ...prev,
      [teamId]: { name, shortName },
    }));
  }, []);

  // Reset team names to default
  const resetTeamNames = useCallback(() => {
    setTeamNames(getDefaultTeamNames());
  }, []);

  // Save game to localStorage
  const saveGame = useCallback(() => {
    const state: SavedGameState = {
      matches,
      standings,
      teamLevels,
      teamNames,
      tournamentConfig,
      playoffMatches,
      playoffSeries,
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
  }, [matches, standings, teamLevels, teamNames, tournamentConfig, playoffMatches, playoffSeries]);

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

      // Restore team names (with fallback for old saves)
      if (parsed.teamNames) {
        setTeamNames(parsed.teamNames);
      }
      
      // Restore tournament config (with fallback for old saves)
      if (parsed.tournamentConfig) {
        setTournamentConfig(parsed.tournamentConfig);
      }
      
      // Restore playoff data (with fallback for old saves)
      if (parsed.playoffMatches) {
        setPlayoffMatches(parsed.playoffMatches);
      }
      if (parsed.playoffSeries) {
        setPlayoffSeries(parsed.playoffSeries);
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
    teamNames,
    tournamentConfig,
    playoffMatches,
    playoffSeries,
    getTeamById,
    simulateMatch,
    confirmMatchResult,
    simulateMatchdays,
    getMatchesByMatchday,
    totalMatchdays,
    regularSeasonComplete,
    getPlayoffRoundName,
    simulatePlayoffMatch,
    confirmPlayoffMatchResult,
    getSeriesForMatch,
    getLeg1Match,
    resetTournament,
    updateTournamentConfig,
    applyConfigChanges,
    updateTeamLevel,
    resetTeamLevels,
    updateTeamName,
    resetTeamNames,
    saveGame,
    loadGame,
    deleteSavedGame,
    hasSavedGame,
    getSavedGameInfo,
  };
};