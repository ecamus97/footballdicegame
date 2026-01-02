import { useState, useCallback, useMemo } from "react";
import { Match, TeamStanding, MatchResult, Team } from "@/types/game";
import { teams } from "@/data/teams";

// Generate round-robin fixture (ida y vuelta)
const generateFixture = (): Match[] => {
  const matches: Match[] = [];
  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  
  // Round-robin algorithm
  const rounds: string[][] = [];
  const teamList = [...teamIds];
  
  // If odd number of teams, add a "bye"
  if (n % 2 !== 0) {
    teamList.push("BYE");
  }
  
  const numTeams = teamList.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;
  
  const teamIndices = teamList.map((_, i) => i).slice(1);
  
  for (let round = 0; round < numRounds; round++) {
    const roundMatches: [string, string][] = [];
    
    const newIndices = [0, ...teamIndices];
    
    for (let i = 0; i < half; i++) {
      const home = newIndices[i];
      const away = newIndices[numTeams - 1 - i];
      
      if (teamList[home] !== "BYE" && teamList[away] !== "BYE") {
        // Alternate home/away by round
        if (round % 2 === 0) {
          roundMatches.push([teamList[home], teamList[away]]);
        } else {
          roundMatches.push([teamList[away], teamList[home]]);
        }
      }
    }
    
    rounds.push(roundMatches.flat());
    
    // Rotate
    teamIndices.push(teamIndices.shift()!);
  }
  
  // Create first leg matches (ida)
  let matchId = 1;
  for (let matchday = 0; matchday < numRounds; matchday++) {
    const roundTeams = [];
    const teamList2 = [...teamIds];
    const indices = teamList2.map((_, i) => i).slice(1);
    
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
  
  // Create second leg matches (vuelta)
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
  
  return matches.sort((a, b) => a.matchday - b.matchday);
};

// Initialize standings
const initializeStandings = (): Map<string, TeamStanding> => {
  const standings = new Map<string, TeamStanding>();
  
  for (const team of teams) {
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

export const useGameState = () => {
  const [matches, setMatches] = useState<Match[]>(() => generateFixture());
  const [standings, setStandings] = useState<Map<string, TeamStanding>>(() => initializeStandings());
  
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
    
    // Same level - no second roll
    if (levelDiff === 0) {
      return false;
    }
    
    // 1 level difference
    if (levelDiff === 1) {
      // Stronger team is away - no advantage
      if (strongerTeam === "away") {
        return false;
      }
      // Stronger team is home and didn't win - second roll
      return !strongerWins;
    }
    
    // 2+ level difference - stronger team gets second roll if not winning
    return !strongerWins;
  }, []);
  
  // Simulate a match
  const simulateMatch = useCallback((matchId: string): MatchResult | null => {
    const match = matches.find(m => m.id === matchId);
    if (!match || match.played) return null;
    
    const homeTeam = teams.find(t => t.id === match.homeTeamId)!;
    const awayTeam = teams.find(t => t.id === match.awayTeamId)!;
    
    // First roll
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
  }, [matches, rollDie, dieToGoals, needsSecondRoll]);
  
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
    
    // Update standings
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
    return Math.max(...matches.map(m => m.matchday));
  }, [matches]);
  
  // Reset tournament
  const resetTournament = useCallback(() => {
    setMatches(generateFixture());
    setStandings(initializeStandings());
  }, []);
  
  return {
    matches,
    standings: sortedStandings,
    simulateMatch,
    confirmMatchResult,
    getMatchesByMatchday,
    totalMatchdays,
    resetTournament,
  };
};
