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

// Extended result type for playoffs (includes penalties)
interface PlayoffMatchResultExtended extends MatchResult {
  needsPenalties?: boolean;
  penalties?: { team1Penalties: number; team2Penalties: number; rounds: { team1: number; team2: number }[] };
  winnerId?: string;
}

// Get default tournament config
const getDefaultTournamentConfig = (): TournamentConfig => ({
  name: "Campeonato Chileno 2026",
  format: "double",
  participatingTeamIds: defaultTeams.slice(0, 16).map(t => t.id),
  allowOddTeams: false,
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
const BYE_TEAM_ID = "__bye__";

const generateFixture = (
  teamList: Team[],
  format: TournamentFormat,
  allowOddTeams: boolean = false
): Match[] => {
  const matches: Match[] = [];
  const teamIds = teamList.map(t => t.id);

  let n = teamIds.length;

  if (n < 2) return [];

  // If odd teams are allowed, add a BYE to make the algorithm work.
  if (allowOddTeams && n % 2 !== 0) {
    teamIds.push(BYE_TEAM_ID);
    n = teamIds.length;
  }

  // Guard: if still odd, we cannot generate a proper round-robin.
  if (n % 2 !== 0) return [];

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

        // Check if this is a BYE match
        const isByeMatch = homeTeam === BYE_TEAM_ID || awayTeam === BYE_TEAM_ID;
        
        matches.push({
          id: `match-${matchId++}`,
          matchday: matchday + 1,
          homeTeamId: homeTeam === BYE_TEAM_ID ? null : homeTeam,
          awayTeamId: awayTeam === BYE_TEAM_ID ? null : awayTeam,
          homeGoals: isByeMatch ? 0 : null,
          awayGoals: isByeMatch ? 0 : null,
          played: isByeMatch, // BYE matches are automatically "played"
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
      setMatches(generateFixture(teams, tournamentConfig.format, tournamentConfig.allowOddTeams ?? false));
      setStandings(initializeStandings(teams));
    }
  }, []);
  // Get team by ID with current level and name
  const getTeamById = useCallback((id: string | null): Team | undefined => {
    if (!id) return undefined;
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
    
    // Skip bye matches (one team is null)
    if (!match.homeTeamId || !match.awayTeamId) return null;
    
    const homeTeam = getTeamById(match.homeTeamId);
    const awayTeam = getTeamById(match.awayTeamId);
    
    if (!homeTeam || !awayTeam) return null;
    
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
      const secondHomeGoals = dieToGoals(secondHomeRoll);
      const secondAwayGoals = dieToGoals(secondAwayRoll);
      secondRoll = { home: secondHomeRoll, away: secondAwayRoll };

      // Keep whichever roll is best for the stronger team (win > draw > loss),
      // not simply the second roll
      const strongerIsHome = homeTeam.level < awayTeam.level;
      const strongerDiff1 = strongerIsHome ? firstHomeGoals - firstAwayGoals : firstAwayGoals - firstHomeGoals;
      const strongerDiff2 = strongerIsHome ? secondHomeGoals - secondAwayGoals : secondAwayGoals - secondHomeGoals;

      if (strongerDiff2 > strongerDiff1) {
        finalHomeGoals = secondHomeGoals;
        finalAwayGoals = secondAwayGoals;
      }
      // else: keep first roll result (already the default)
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
          // In leg 2, swap home/away: higher seed (team1) plays at home, lower seed (team2) is away
          const leg2: PlayoffMatch = {
            id: `playoff-${matchId++}`,
            round: firstRound,
            matchNumber: i + 1,
            leg: 2,
            team1Id: team1?.teamId, // Higher seed is home in leg 2
            team2Id: team2?.teamId, // Lower seed is away in leg 2
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
    
    // In neutral venue: no home advantage, but level differences still apply
    // We keep real levels, but for needsSecondRoll we treat it as if both were same level for home advantage
    
    const firstTeam1Roll = rollDie();
    const firstTeam2Roll = rollDie();
    const firstTeam1Goals = dieToGoals(firstTeam1Roll);
    const firstTeam2Goals = dieToGoals(firstTeam2Roll);
    
    // In neutral venue, no second roll (no home advantage to apply)
    // But level difference still matters for team with better level
    let requiresSecond = false;
    if (!match.isNeutralVenue) {
      requiresSecond = needsSecondRoll(team1, team2, firstTeam1Goals, firstTeam2Goals);
    } else {
      // In neutral venue: the team with better level (lower number) gets advantage
      // If tied or the better team is already winning/drawing, no second roll
      // If the worse team is winning, the better team gets a second chance
      if (team1.level !== team2.level) {
        const betterTeam = team1.level < team2.level ? 'team1' : 'team2';
        const betterTeamWinning = betterTeam === 'team1' ? firstTeam1Goals > firstTeam2Goals : firstTeam2Goals > firstTeam1Goals;
        const tied = firstTeam1Goals === firstTeam2Goals;
        if (!betterTeamWinning && !tied) {
          // Better level team is losing, they get a second chance
          requiresSecond = true;
        }
      }
    }
    
    let finalTeam1Goals = firstTeam1Goals;
    let finalTeam2Goals = firstTeam2Goals;
    let secondRoll: { home: number; away: number } | undefined;

    if (requiresSecond) {
      const secondTeam1Roll = rollDie();
      const secondTeam2Roll = rollDie();
      const secondTeam1Goals = dieToGoals(secondTeam1Roll);
      const secondTeam2Goals = dieToGoals(secondTeam2Roll);
      secondRoll = { home: secondTeam1Roll, away: secondTeam2Roll };

      // Keep whichever roll is best for the stronger team (win > draw > loss),
      // not simply the second roll
      const strongerIsTeam1 = team1.level < team2.level;
      const strongerDiff1 = strongerIsTeam1 ? firstTeam1Goals - firstTeam2Goals : firstTeam2Goals - firstTeam1Goals;
      const strongerDiff2 = strongerIsTeam1 ? secondTeam1Goals - secondTeam2Goals : secondTeam2Goals - secondTeam1Goals;

      if (strongerDiff2 > strongerDiff1) {
        finalTeam1Goals = secondTeam1Goals;
        finalTeam2Goals = secondTeam2Goals;
      }
      // else: keep first roll result (already the default)
    }
    
    return {
      homeGoals: finalTeam1Goals,
      awayGoals: finalTeam2Goals,
      firstRoll: { home: firstTeam1Roll, away: firstTeam2Roll },
      secondRoll,
      requiredSecondRoll: requiresSecond,
    };
  }, [playoffMatches, getTeamById, rollDie, dieToGoals, needsSecondRoll]);

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
        
        // Recompute aggregate from legs every time (avoids double-counting and fixes inverted globals)
        const hasTwoLegs = !!s.leg2Id;

        const leg1 = s.leg1Id
          ? (s.leg1Id === matchId
              ? { played: true, team1Goals: result.homeGoals, team2Goals: result.awayGoals }
              : (() => {
                  const m = playoffMatches.find(m => m.id === s.leg1Id);
                  return m ? { played: m.played, team1Goals: m.team1Goals ?? 0, team2Goals: m.team2Goals ?? 0 } : null;
                })())
          : null;

        const leg2 = s.leg2Id
          ? (s.leg2Id === matchId
              ? { played: true, team1Goals: result.homeGoals, team2Goals: result.awayGoals }
              : (() => {
                  const m = playoffMatches.find(m => m.id === s.leg2Id);
                  return m ? { played: m.played, team1Goals: m.team1Goals ?? 0, team2Goals: m.team2Goals ?? 0 } : null;
                })())
          : null;

        let team1Agg = 0;
        let team2Agg = 0;

        if (leg1?.played) {
          if (hasTwoLegs) {
            // Leg 1: home = peor seed, away = mejor seed => series.team1 (mejor seed) suma "away"
            team1Agg += leg1.team2Goals;
            team2Agg += leg1.team1Goals;
          } else {
            // Single leg uses match perspective: team1 = local
            team1Agg += leg1.team1Goals;
            team2Agg += leg1.team2Goals;
          }
        }

        if (hasTwoLegs && leg2?.played) {
          // Leg 2: home = mejor seed, away = peor seed
          team1Agg += leg2.team1Goals;
          team2Agg += leg2.team2Goals;
        }

        updatedSeries.team1Aggregate = team1Agg;
        updatedSeries.team2Aggregate = team2Agg;
        
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
    
  }, [playoffMatches, playoffSeries, tournamentConfig.playoffsFormat]);

  // Keep playoff matches (home/away) consistent with series seeds.
  // Fixes: mejor ubicado jugando ambos de local + global invertido por IDs swap.
  useEffect(() => {
    if (!tournamentConfig.playoffsEnabled) return;

    const isSingleLeg = tournamentConfig.playoffsFormat === "single";

    setPlayoffMatches(prev => {
      let changed = false;

      const next = prev.map(m => {
        const s = playoffSeries.find(ps => ps.leg1Id === m.id || ps.leg2Id === m.id);
        if (!s || !s.team1Id || !s.team2Id) return m;

        const hasTwoLegs = !!s.leg2Id;

        // Decide which team is better seeded (smaller seed number)
        let betterId = s.team1Id;
        let worseId = s.team2Id;
        if (s.team1Seed > 0 && s.team2Seed > 0) {
          const team1Better = s.team1Seed <= s.team2Seed;
          betterId = team1Better ? s.team1Id : s.team2Id;
          worseId = team1Better ? s.team2Id : s.team1Id;
        }

        // Single leg (or no return leg): default home = better seed (unless neutral)
        if (isSingleLeg || !hasTwoLegs) {
          const homeId = m.isNeutralVenue ? s.team1Id : betterId;
          const awayId = m.isNeutralVenue ? s.team2Id : worseId;

          if (m.team1Id !== homeId || m.team2Id !== awayId) {
            changed = true;
            return { ...m, team1Id: homeId, team2Id: awayId };
          }
          return m;
        }

        // Two legs: leg 1 local = peor seed, leg 2 local = mejor seed
        const homeId = m.leg === 1 ? worseId : betterId;
        const awayId = m.leg === 1 ? betterId : worseId;

        if (m.team1Id !== homeId || m.team2Id !== awayId) {
          changed = true;
          return { ...m, team1Id: homeId, team2Id: awayId };
        }

        return m;
      });

      return changed ? next : prev;
    });
  }, [playoffSeries, tournamentConfig.playoffsEnabled, tournamentConfig.playoffsFormat]);

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
    setMatches(generateFixture(participatingTeams, tournamentConfig.format, tournamentConfig.allowOddTeams ?? false));
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
    setMatches(generateFixture(participatingTeams, configToUse.format, configToUse.allowOddTeams ?? false));
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

  // Save game - returns serializable state object
  const saveGame = useCallback((): any => {
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
    
    return serializable;
  }, [matches, standings, teamLevels, teamNames, tournamentConfig, playoffMatches, playoffSeries]);

  // Load game from data object
  const loadGame = useCallback((data: any): boolean => {
    if (!data) return false;
    
    try {
      // Restore matches
      setMatches(data.matches);
      
      // Restore standings from array to Map
      const standingsMap = new Map<string, TeamStanding>(data.standings);
      setStandings(standingsMap);
      
      // Restore team levels
      setTeamLevels(data.teamLevels);

      // Restore team names (with fallback for old saves)
      if (data.teamNames) {
        setTeamNames(data.teamNames);
      }
      
      // Restore tournament config (with fallback for old saves)
      if (data.tournamentConfig) {
        setTournamentConfig(data.tournamentConfig);
      }
      
      // Restore playoff data (with fallback for old saves)
      if (data.playoffMatches) {
        setPlayoffMatches(data.playoffMatches);
      }
      if (data.playoffSeries) {
        setPlayoffSeries(data.playoffSeries);
      }
      
      return true;
    } catch (e) {
      console.error("Error loading saved game:", e);
      return false;
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
  };
};
