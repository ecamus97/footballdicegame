import { useState, useCallback, useMemo, useEffect } from "react";
import { 
  CompetitionConfig, 
  CompetitionState, 
  CompetitionType,
  Group,
  GroupMatch,
  GroupStanding,
  KnockoutMatch,
  KnockoutSeries,
  KnockoutRound,
  DrawState,
  DrawPot,
  ThirdPlaceTeam,
  MatchFormat,
  CustomTeam,
  getNextPowerOf2,
  calculateByes,
  getGroupLetter,
  PenaltyResult
} from "@/types/competition";
import { Team } from "@/types/game";
import { rollDie, dieToGoals, needsSecondRoll, pickBetterRollForStrongerTeam } from "@/lib/diceMatch";

// ============= Group Stage Logic =============

// Generate round-robin matches for a group of 4 teams
const generateGroupMatches = (
  groupId: string,
  teamIds: string[],
  format: MatchFormat
): GroupMatch[] => {
  const matches: GroupMatch[] = [];
  let matchId = 1;
  
  // For 4 teams: 3 matchdays with 2 matches each
  // Matchday 1: 1v4, 2v3
  // Matchday 2: 1v3, 4v2
  // Matchday 3: 1v2, 3v4
  const schedule = [
    [[0, 3], [1, 2]], // Matchday 1
    [[0, 2], [3, 1]], // Matchday 2
    [[0, 1], [2, 3]], // Matchday 3
  ];
  
  schedule.forEach((matchday, mdIndex) => {
    matchday.forEach(([home, away]) => {
      matches.push({
        id: `${groupId}-match-${matchId++}`,
        groupId,
        matchday: mdIndex + 1,
        homeTeamId: teamIds[home],
        awayTeamId: teamIds[away],
        homeGoals: null,
        awayGoals: null,
        played: false,
      });
    });
  });
  
  // Add return matches for double format
  // Swap matchday 2 with matchday 5 so teams alternate home/away
  if (format === "double") {
    const firstLegMatches = [...matches];
    firstLegMatches.forEach(match => {
      // Return matches: matchday 1->4, 2->5, 3->6
      // But we want to swap 2 and 5 so: 1->4, 2->5 (will be swapped below), 3->6
      matches.push({
        id: `${groupId}-match-${matchId++}`,
        groupId,
        matchday: match.matchday + 3,
        homeTeamId: match.awayTeamId,
        awayTeamId: match.homeTeamId,
        homeGoals: null,
        awayGoals: null,
        played: false,
      });
    });
    
    // Swap matchday 2 with matchday 5 for proper home/away alternation
    matches.forEach((match, idx) => {
      if (match.matchday === 2) {
        matches[idx] = { ...match, matchday: 5 };
      } else if (match.matchday === 5) {
        matches[idx] = { ...match, matchday: 2 };
      }
    });
  }
  
  return matches;
};

// Initialize group standings
const initializeGroupStandings = (teamIds: string[]): GroupStanding[] => {
  return teamIds.map((teamId, index) => ({
    teamId,
    position: index + 1,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));
};

// Sort group standings
const sortGroupStandings = (standings: GroupStanding[]): GroupStanding[] => {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  }).map((standing, index) => ({ ...standing, position: index + 1 }));
};

// ============= Knockout Stage Logic =============

// Get rounds needed for knockout stage
const getKnockoutRounds = (numTeams: number): KnockoutRound[] => {
  const bracketSize = getNextPowerOf2(numTeams);
  const rounds: KnockoutRound[] = [];
  
  if (bracketSize >= 64) rounds.push("round_of_64");
  if (bracketSize >= 32) rounds.push("round_of_32");
  if (bracketSize >= 16) rounds.push("round_of_16");
  if (bracketSize >= 8) rounds.push("quarterfinals");
  if (bracketSize >= 4) rounds.push("semifinals");
  rounds.push("final");
  
  return rounds;
};

// Generate knockout bracket with byes (original function for random/seeded bracket)
const generateKnockoutBracket = (
  teamIds: string[],
  seeds: number[],
  matchFormat: MatchFormat,
  finalFormat: MatchFormat
): { matches: KnockoutMatch[]; series: KnockoutSeries[] } => {
  const matches: KnockoutMatch[] = [];
  const series: KnockoutSeries[] = [];
  
  const numTeams = teamIds.length;
  const bracketSize = getNextPowerOf2(numTeams);
  const numByes = bracketSize - numTeams;
  const rounds = getKnockoutRounds(numTeams);
  const firstRound = rounds[0];
  
  // Create seeding with byes - top seeds get byes
  const seededTeams: (string | null)[] = new Array(bracketSize).fill(null);
  const sortedBySeeds = teamIds
    .map((id, i) => ({ id, seed: seeds[i] || i + 1 }))
    .sort((a, b) => a.seed - b.seed);
  
  // Place teams in bracket positions
  sortedBySeeds.forEach((team, index) => {
    seededTeams[index] = team.id;
  });
  
  let matchId = 1;
  let seriesId = 1;
  
  // Generate first round matchups
  const numFirstRoundMatches = bracketSize / 2;
  
  for (let i = 0; i < numFirstRoundMatches; i++) {
    const team1Index = i;
    const team2Index = bracketSize - 1 - i;
    const team1Id = seededTeams[team1Index];
    const team2Id = seededTeams[team2Index];
    
    const isBye = !team1Id || !team2Id;
    const isFinal = firstRound === "final";
    const format = isFinal ? finalFormat : matchFormat;
    const isNeutral = format === "neutral";
    const isSingleLeg = format === "single" || format === "neutral";
    
    // Create leg 1
    const leg1: KnockoutMatch = {
      id: `knockout-${matchId++}`,
      round: firstRound,
      bracketPosition: i + 1,
      leg: 1,
      team1Id,
      team2Id,
      team1Goals: isBye ? 0 : null,
      team2Goals: isBye ? 0 : null,
      played: isBye,
      isNeutralVenue: isNeutral,
      isBye,
    };
    matches.push(leg1);
    
    let leg2Id: string | null = null;
    if (!isSingleLeg && !isBye) {
      const leg2: KnockoutMatch = {
        id: `knockout-${matchId++}`,
        round: firstRound,
        bracketPosition: i + 1,
        leg: 2,
        team1Id: team2Id,
        team2Id: team1Id,
        team1Goals: null,
        team2Goals: null,
        played: false,
        isNeutralVenue: false,
        isBye: false,
      };
      matches.push(leg2);
      leg2Id = leg2.id;
    }
    
    const newSeries: KnockoutSeries = {
      id: `series-${seriesId++}`,
      round: firstRound,
      bracketPosition: i + 1,
      team1Id,
      team2Id,
      team1Seed: team1Index + 1,
      team2Seed: team2Index + 1,
      leg1Id: leg1.id,
      leg2Id,
      winnerId: isBye ? (team1Id || team2Id) : null,
      team1Aggregate: 0,
      team2Aggregate: 0,
      isBye,
    };
    series.push(newSeries);
  }
  
  // Generate placeholder matches for subsequent rounds
  for (let roundIdx = 1; roundIdx < rounds.length; roundIdx++) {
    const round = rounds[roundIdx];
    const prevRound = rounds[roundIdx - 1];
    const prevRoundMatches = series.filter(s => s.round === prevRound).length;
    const numMatchesInRound = prevRoundMatches / 2;
    
    const isFinal = round === "final";
    const format = isFinal ? finalFormat : matchFormat;
    const isNeutral = format === "neutral";
    const isSingleLeg = format === "single" || format === "neutral";
    
    for (let i = 0; i < numMatchesInRound; i++) {
      const leg1: KnockoutMatch = {
        id: `knockout-${matchId++}`,
        round,
        bracketPosition: i + 1,
        leg: 1,
        team1Id: null,
        team2Id: null,
        team1Goals: null,
        team2Goals: null,
        played: false,
        isNeutralVenue: isNeutral,
        isBye: false,
      };
      matches.push(leg1);
      
      let leg2Id: string | null = null;
      if (!isSingleLeg) {
        const leg2: KnockoutMatch = {
          id: `knockout-${matchId++}`,
          round,
          bracketPosition: i + 1,
          leg: 2,
          team1Id: null,
          team2Id: null,
          team1Goals: null,
          team2Goals: null,
          played: false,
          isNeutralVenue: false,
          isBye: false,
        };
        matches.push(leg2);
        leg2Id = leg2.id;
      }
      
      const newSeries: KnockoutSeries = {
        id: `series-${seriesId++}`,
        round,
        bracketPosition: i + 1,
        team1Id: null,
        team2Id: null,
        team1Seed: 0,
        team2Seed: 0,
        leg1Id: leg1.id,
        leg2Id,
        winnerId: null,
        team1Aggregate: 0,
        team2Aggregate: 0,
        isBye: false,
      };
      series.push(newSeries);
    }
  }
  
  return { matches, series };
};

// Generate knockout bracket with FIXED matchups (for groups_knockout format)
// Teams are already paired: [team1A, team2A, team1B, team2B, ...]
// Each consecutive pair becomes a matchup
const generateKnockoutBracketWithFixedMatchups = (
  teamIds: string[],
  seeds: number[],
  matchFormat: MatchFormat,
  finalFormat: MatchFormat
): { matches: KnockoutMatch[]; series: KnockoutSeries[] } => {
  const matches: KnockoutMatch[] = [];
  const series: KnockoutSeries[] = [];
  
  const numTeams = teamIds.length;
  const numFirstRoundMatchups = Math.ceil(numTeams / 2);
  const rounds = getKnockoutRounds(numTeams);
  const firstRound = rounds[0];
  
  let matchId = 1;
  let seriesId = 1;
  
  // Generate first round matchups from pre-paired teams
  // Teams come in pairs: [1A, 2B, 1C, 2D, 1B, 2A, 1D, 2C]
  // So matchups are: 1A vs 2B, 1C vs 2D, 1B vs 2A, 1D vs 2C
  for (let i = 0; i < numFirstRoundMatchups; i++) {
    const team1Id = teamIds[i * 2] || null;
    const team2Id = teamIds[i * 2 + 1] || null;
    
    const isBye = !team1Id || !team2Id;
    const isFinal = firstRound === "final";
    const format = isFinal ? finalFormat : matchFormat;
    const isNeutral = format === "neutral";
    const isSingleLeg = format === "single" || format === "neutral";
    
    // Create leg 1 - team1 (better seed/position) is AWAY first
    // So team2 (lower seed) is HOME in first leg
    const leg1: KnockoutMatch = {
      id: `knockout-${matchId++}`,
      round: firstRound,
      bracketPosition: i + 1,
      leg: 1,
      team1Id: team2Id, // Lower seed is home in leg 1
      team2Id: team1Id, // Higher seed is away in leg 1
      team1Goals: isBye ? 0 : null,
      team2Goals: isBye ? 0 : null,
      played: isBye,
      isNeutralVenue: isNeutral,
      isBye,
    };
    matches.push(leg1);
    
    let leg2Id: string | null = null;
    if (!isSingleLeg && !isBye) {
      const leg2: KnockoutMatch = {
        id: `knockout-${matchId++}`,
        round: firstRound,
        bracketPosition: i + 1,
        leg: 2,
        team1Id: team1Id, // Higher seed is home in leg 2
        team2Id: team2Id, // Lower seed is away in leg 2
        team1Goals: null,
        team2Goals: null,
        played: false,
        isNeutralVenue: false,
        isBye: false,
      };
      matches.push(leg2);
      leg2Id = leg2.id;
    }
    
    // In series, team1 is the BETTER seed (first place), team2 is the worse seed
    const newSeries: KnockoutSeries = {
      id: `series-${seriesId++}`,
      round: firstRound,
      bracketPosition: i + 1,
      team1Id: team1Id, // Better position (1st place)
      team2Id: team2Id, // Worse position (2nd place)
      team1Seed: i * 2 + 1,
      team2Seed: i * 2 + 2,
      leg1Id: leg1.id,
      leg2Id,
      winnerId: isBye ? (team1Id || team2Id) : null,
      team1Aggregate: 0,
      team2Aggregate: 0,
      isBye,
    };
    series.push(newSeries);
  }
  
  // Generate placeholder matches for subsequent rounds
  for (let roundIdx = 1; roundIdx < rounds.length; roundIdx++) {
    const round = rounds[roundIdx];
    const prevRound = rounds[roundIdx - 1];
    const prevRoundMatches = series.filter(s => s.round === prevRound).length;
    const numMatchesInRound = Math.ceil(prevRoundMatches / 2);
    
    const isFinal = round === "final";
    const format = isFinal ? finalFormat : matchFormat;
    const isNeutral = format === "neutral";
    const isSingleLeg = format === "single" || format === "neutral";
    
    for (let i = 0; i < numMatchesInRound; i++) {
      const leg1: KnockoutMatch = {
        id: `knockout-${matchId++}`,
        round,
        bracketPosition: i + 1,
        leg: 1,
        team1Id: null,
        team2Id: null,
        team1Goals: null,
        team2Goals: null,
        played: false,
        isNeutralVenue: isNeutral,
        isBye: false,
      };
      matches.push(leg1);
      
      let leg2Id: string | null = null;
      if (!isSingleLeg) {
        const leg2: KnockoutMatch = {
          id: `knockout-${matchId++}`,
          round,
          bracketPosition: i + 1,
          leg: 2,
          team1Id: null,
          team2Id: null,
          team1Goals: null,
          team2Goals: null,
          played: false,
          isNeutralVenue: false,
          isBye: false,
        };
        matches.push(leg2);
        leg2Id = leg2.id;
      }
      
      const newSeries: KnockoutSeries = {
        id: `series-${seriesId++}`,
        round,
        bracketPosition: i + 1,
        team1Id: null,
        team2Id: null,
        team1Seed: 0,
        team2Seed: 0,
        leg1Id: leg1.id,
        leg2Id,
        winnerId: null,
        team1Aggregate: 0,
        team2Aggregate: 0,
        isBye: false,
      };
      series.push(newSeries);
    }
  }
  
  return { matches, series };
};

// ============= Draw Logic =============

const initializeDrawState = (
  pots: DrawPot[],
  numGroups: number
): DrawState => {
  const groups: Group[] = [];
  
  for (let i = 0; i < numGroups; i++) {
    groups.push({
      id: `group-${i}`,
      name: `Grupo ${getGroupLetter(i)}`,
      letter: getGroupLetter(i),
      teamIds: [],
      matches: [],
      standings: [],
    });
  }
  
  const remainingTeams = pots.flatMap(pot => 
    pot.teamIds.map(teamId => ({ teamId, potId: pot.id }))
  );
  
  return {
    phase: "groups",
    isComplete: false,
    currentPotIndex: 0,
    currentTeamIndex: 0,
    drawnTeams: [],
    remainingTeams,
    pots,
    groups,
  };
};

// ============= Main Hook =============

// Auto-save current session (not the named saves) so a page refresh keeps you
// where you were instead of dropping back to the landing screen.
const AUTOSAVE_KEY = "footballdicegame_autosave";

interface AutosaveData {
  competitionState: CompetitionState;
  customTeamsData: CustomTeam[];
  teamLevels: Record<string, 1 | 2 | 3 | 4>;
}

const loadAutosave = (): AutosaveData | null => {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AutosaveData;
  } catch {
    return null;
  }
};

export const useCompetitionState = () => {
  const [competitionState, setCompetitionState] = useState<CompetitionState | null>(
    () => loadAutosave()?.competitionState ?? null
  );
  const [teamLevels, setTeamLevels] = useState<Record<string, 1 | 2 | 3 | 4>>(
    () => loadAutosave()?.teamLevels ?? {}
  );
  const [customTeamsData, setCustomTeamsData] = useState<CustomTeam[]>(
    () => loadAutosave()?.customTeamsData ?? []
  );

  // Keep the autosave in sync with the current session; clear it when there's
  // no active competition (e.g. after "Volver al inicio" or "Reiniciar").
  useEffect(() => {
    try {
      if (competitionState) {
        localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({ competitionState, customTeamsData, teamLevels })
        );
      } else {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } catch {
      // Ignore storage errors (e.g. quota exceeded or private browsing)
    }
  }, [competitionState, customTeamsData, teamLevels]);

  // Get team by ID from custom teams data
  const getTeamById = useCallback((id: string | null): Team | undefined => {
    if (!id) return undefined;
    const customTeam = customTeamsData.find(t => t.id === id);
    if (customTeam) {
      return { 
        id: customTeam.id,
        name: customTeam.name,
        shortName: customTeam.shortName,
        level: teamLevels[customTeam.id] || customTeam.level 
      };
    }
    // Fallback for legacy team IDs
    return {
      id,
      name: id,
      shortName: id.slice(0, 3).toUpperCase(),
      level: teamLevels[id] || 3
    };
  }, [teamLevels, customTeamsData]);

  // Initialize a new competition
  const initializeCompetition = useCallback((config: CompetitionConfig) => {
    const state: CompetitionState = {
      config,
      phase: "setup",
    };
    
    // Initialize based on competition type
    switch (config.type) {
      case "knockout":
        // Direct knockout - go straight to knockout phase
        if (config.knockoutConfig) {
          const teamIds = config.participatingTeamIds;
          const seeds = teamIds.map((_, i) => i + 1);
          const { matches, series } = generateKnockoutBracket(
            teamIds,
            seeds,
            config.knockoutConfig.matchFormat,
            config.knockoutConfig.finalFormat
          );
          state.knockoutMatches = matches;
          state.knockoutSeries = series;
          state.phase = "knockout";
        }
        break;
        
      case "groups_knockout":
        // Groups + Knockout - need draw first
        if (config.groupConfig && config.pots) {
          state.drawState = initializeDrawState(
            config.pots,
            config.groupConfig.numGroups
          );
          state.phase = "draw";
        }
        break;
        
      case "qualifying_groups_knockout":
        // Qualifying + Groups + Knockout
        if (config.qualifyingConfig) {
          // Generate qualifying bracket
          const qualifyingTeamIds = config.participatingTeamIds.slice(
            0, config.qualifyingConfig.teamsEntering
          );
          const seeds = qualifyingTeamIds.map((_, i) => i + 1);
          const { matches, series } = generateKnockoutBracket(
            qualifyingTeamIds,
            seeds,
            config.qualifyingConfig.matchFormat,
            config.qualifyingConfig.matchFormat
          );
          state.qualifyingMatches = matches;
          state.qualifyingSeries = series;
          state.phase = "qualifying";
        }
        break;
    }
    
    setCompetitionState(state);
  }, []);

  // Execute a draw step (for visual draw) - Sequential group assignment (A, B, C, etc.)
  const executeDrawStep = useCallback(() => {
    if (!competitionState?.drawState || competitionState.drawState.isComplete) return null;
    
    const drawState = { ...competitionState.drawState };
    const { pots, remainingTeams, groups, drawnTeams } = drawState;
    
    if (remainingTeams.length === 0) {
      drawState.isComplete = true;
      setCompetitionState(prev => prev ? { ...prev, drawState } : null);
      return { type: "complete" as const };
    }
    
    // Get current pot
    const currentPot = pots[drawState.currentPotIndex];
    if (!currentPot) {
      drawState.isComplete = true;
      setCompetitionState(prev => prev ? { ...prev, drawState } : null);
      return { type: "complete" as const };
    }
    
    const teamsInPot = remainingTeams.filter(t => t.potId === currentPot.id);
    
    if (teamsInPot.length === 0) {
      // Move to next pot - but don't recurse, return null and let next call handle it
      if (drawState.currentPotIndex < pots.length - 1) {
        drawState.currentPotIndex++;
        drawState.currentTeamIndex = 0;
        setCompetitionState(prev => prev ? { ...prev, drawState } : null);
        // Return a pot_change event so the UI knows to continue
        return { type: "pot_change" as const };
      } else {
        drawState.isComplete = true;
        setCompetitionState(prev => prev ? { ...prev, drawState } : null);
        return { type: "complete" as const };
      }
    }
    
    // Random selection from current pot
    const randomIndex = Math.floor(Math.random() * teamsInPot.length);
    const selectedTeam = teamsInPot[randomIndex];
    
    // Find next group that needs a team from this pot (sequential order: A, B, C, etc.)
    // Count how many teams from this pot are already assigned
    const teamsFromThisPotAssigned = drawnTeams.filter(dt => dt.potId === currentPot.id).length;
    
    // The next group to receive a team is the one at index teamsFromThisPotAssigned
    const targetGroup = groups![teamsFromThisPotAssigned];
    
    if (!targetGroup) {
      // All groups have a team from this pot, move to next pot
      if (drawState.currentPotIndex < pots.length - 1) {
        drawState.currentPotIndex++;
        drawState.currentTeamIndex = 0;
        setCompetitionState(prev => prev ? { ...prev, drawState } : null);
        return { type: "pot_change" as const };
      } else {
        drawState.isComplete = true;
        setCompetitionState(prev => prev ? { ...prev, drawState } : null);
        return { type: "complete" as const };
      }
    }
    
    // Update state
    targetGroup.teamIds.push(selectedTeam.teamId);
    drawState.drawnTeams.push({
      teamId: selectedTeam.teamId,
      potId: selectedTeam.potId,
      groupId: targetGroup.id,
    });
    drawState.remainingTeams = remainingTeams.filter(t => t.teamId !== selectedTeam.teamId);
    drawState.currentTeamIndex++;
    
    setCompetitionState(prev => prev ? { ...prev, drawState } : null);
    
    return {
      type: "assign_group" as const,
      teamId: selectedTeam.teamId,
      groupId: targetGroup.id,
    };
  }, [competitionState]);

  // Complete the draw and generate group matches
  const completeDraw = useCallback(() => {
    if (!competitionState?.drawState?.isComplete) return;
    
    const { groups } = competitionState.drawState;
    if (!groups || !competitionState.config.groupConfig) return;
    
    const format = competitionState.config.groupConfig.matchFormat;
    
    // Generate matches and standings for each group
    const updatedGroups = groups.map(group => ({
      ...group,
      matches: generateGroupMatches(group.id, group.teamIds, format),
      standings: initializeGroupStandings(group.teamIds),
    }));
    
    setCompetitionState(prev => prev ? {
      ...prev,
      phase: "groups",
      groups: updatedGroups,
    } : null);
  }, [competitionState]);

  // Simulate group match with level-based advantage rules
  const simulateGroupMatch = useCallback((matchId: string): {
    homeGoals: number;
    awayGoals: number;
    firstRoll: { home: number; away: number };
    secondRoll?: { home: number; away: number };
    requiredSecondRoll: boolean;
  } | null => {
    if (!competitionState?.groups) return null;

    let targetMatch: GroupMatch | undefined;
    for (const group of competitionState.groups) {
      targetMatch = group.matches.find(m => m.id === matchId);
      if (targetMatch) break;
    }

    if (!targetMatch || targetMatch.played) return null;

    // Get teams and their levels
    const homeTeam = getTeamById(targetMatch.homeTeamId);
    const awayTeam = getTeamById(targetMatch.awayTeamId);

    if (!homeTeam || !awayTeam) return null;

    // First roll
    const homeRoll1 = rollDie();
    const awayRoll1 = rollDie();
    const homeGoals1 = dieToGoals(homeRoll1);
    const awayGoals1 = dieToGoals(awayRoll1);

    const requiredSecondRoll = needsSecondRoll({
      team1Level: homeTeam.level,
      team2Level: awayTeam.level,
      team1Goals: homeGoals1,
      team2Goals: awayGoals1,
    });

    // Calculate final result
    let finalHomeGoals = homeGoals1;
    let finalAwayGoals = awayGoals1;
    let secondRoll: { home: number; away: number } | undefined;

    if (requiredSecondRoll) {
      // Second roll (will be triggered by UI, but we pre-calculate)
      const homeRoll2 = rollDie();
      const awayRoll2 = rollDie();
      secondRoll = { home: homeRoll2, away: awayRoll2 };

      const homeGoals2 = dieToGoals(homeRoll2);
      const awayGoals2 = dieToGoals(awayRoll2);

      // Keep whichever roll is best for the stronger team (win > draw > loss),
      // not simply the second roll
      const best = pickBetterRollForStrongerTeam(
        homeTeam.level,
        awayTeam.level,
        { team1Goals: homeGoals1, team2Goals: awayGoals1 },
        { team1Goals: homeGoals2, team2Goals: awayGoals2 }
      );
      finalHomeGoals = best.team1Goals;
      finalAwayGoals = best.team2Goals;
    }

    return {
      homeGoals: finalHomeGoals,
      awayGoals: finalAwayGoals,
      firstRoll: { home: homeRoll1, away: awayRoll1 },
      secondRoll,
      requiredSecondRoll,
    };
  }, [competitionState, getTeamById]);

  // Confirm group match result
  const confirmGroupMatchResult = useCallback((
    matchId: string, 
    result: { 
      homeGoals: number; 
      awayGoals: number; 
      firstRoll: { home: number; away: number };
      secondRoll?: { home: number; away: number };
      requiredSecondRoll: boolean;
    }
  ) => {
    if (!competitionState?.groups) return;
    
    setCompetitionState(prev => {
      if (!prev?.groups) return prev;
      
      const updatedGroups = prev.groups.map(group => {
        const matchIndex = group.matches.findIndex(m => m.id === matchId);
        if (matchIndex === -1) return group;
        
        const match = group.matches[matchIndex];
        const updatedMatches = [...group.matches];
        updatedMatches[matchIndex] = {
          ...match,
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          played: true,
          firstRoll: result.firstRoll,
        };
        
        // Update standings
        let standings = [...group.standings];
        const homeStandingIdx = standings.findIndex(s => s.teamId === match.homeTeamId);
        const awayStandingIdx = standings.findIndex(s => s.teamId === match.awayTeamId);
        
        if (homeStandingIdx !== -1 && awayStandingIdx !== -1) {
          const homeStanding = { ...standings[homeStandingIdx] };
          const awayStanding = { ...standings[awayStandingIdx] };
          
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
          
          standings[homeStandingIdx] = homeStanding;
          standings[awayStandingIdx] = awayStanding;
          standings = sortGroupStandings(standings);
        }
        
        return {
          ...group,
          matches: updatedMatches,
          standings,
        };
      });
      
      return { ...prev, groups: updatedGroups };
    });
  }, [competitionState]);

  // Simulate entire matchday across all groups
  const simulateGroupMatchday = useCallback((matchday: number) => {
    if (!competitionState?.groups) return;
    
    setCompetitionState(prev => {
      if (!prev?.groups) return prev;
      
      const updatedGroups = prev.groups.map(group => {
        let matches = [...group.matches];
        let standings = [...group.standings];
        
        matches.forEach((match, matchIndex) => {
          if (match.matchday !== matchday || match.played) return;
          
          const homeRoll = Math.floor(Math.random() * 6) + 1;
          const awayRoll = Math.floor(Math.random() * 6) + 1;
          const homeGoals = homeRoll - 1;
          const awayGoals = awayRoll - 1;
          
          matches[matchIndex] = {
            ...match,
            homeGoals,
            awayGoals,
            played: true,
            firstRoll: { home: homeRoll, away: awayRoll },
          };
          
          // Update standings
          const homeStandingIdx = standings.findIndex(s => s.teamId === match.homeTeamId);
          const awayStandingIdx = standings.findIndex(s => s.teamId === match.awayTeamId);
          
          if (homeStandingIdx !== -1 && awayStandingIdx !== -1) {
            const homeStanding = { ...standings[homeStandingIdx] };
            const awayStanding = { ...standings[awayStandingIdx] };
            
            homeStanding.played++;
            awayStanding.played++;
            homeStanding.goalsFor += homeGoals;
            homeStanding.goalsAgainst += awayGoals;
            awayStanding.goalsFor += awayGoals;
            awayStanding.goalsAgainst += homeGoals;
            
            if (homeGoals > awayGoals) {
              homeStanding.won++;
              homeStanding.points += 3;
              awayStanding.lost++;
            } else if (awayGoals > homeGoals) {
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
            
            standings[homeStandingIdx] = homeStanding;
            standings[awayStandingIdx] = awayStanding;
          }
        });
        
        return {
          ...group,
          matches,
          standings: sortGroupStandings(standings),
        };
      });
      
      return { ...prev, groups: updatedGroups };
    });
  }, [competitionState]);

  // Check if group stage is complete
  const isGroupStageComplete = useMemo(() => {
    if (!competitionState?.groups) return false;
    return competitionState.groups.every(group => 
      group.matches.every(match => match.played)
    );
  }, [competitionState?.groups]);

  // Get qualified teams from groups
  const getQualifiedTeamsFromGroups = useCallback((): string[] => {
    if (!competitionState?.groups || !competitionState.config.groupConfig) return [];
    
    const { qualificationRule, bestThirdsCount } = competitionState.config.groupConfig;
    const qualified: string[] = [];
    const thirds: ThirdPlaceTeam[] = [];
    
    for (const group of competitionState.groups) {
      const sortedStandings = sortGroupStandings(group.standings);
      
      // First place always qualifies
      if (sortedStandings[0]) {
        qualified.push(sortedStandings[0].teamId);
      }
      
      // Second place qualifies for certain rules
      if (
        (qualificationRule === "first_second" || qualificationRule === "first_second_best_thirds") 
        && sortedStandings[1]
      ) {
        qualified.push(sortedStandings[1].teamId);
      }
      
      // Collect thirds for best thirds rule
      if (qualificationRule === "first_second_best_thirds" && sortedStandings[2]) {
        thirds.push({
          teamId: sortedStandings[2].teamId,
          groupId: group.id,
          groupLetter: group.letter,
          standing: sortedStandings[2],
        });
      }
    }
    
    // Sort and select best thirds
    if (qualificationRule === "first_second_best_thirds" && bestThirdsCount) {
      const sortedThirds = thirds.sort((a, b) => {
        if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
        if (b.standing.goalDifference !== a.standing.goalDifference) 
          return b.standing.goalDifference - a.standing.goalDifference;
        return b.standing.goalsFor - a.standing.goalsFor;
      });
      
      const bestThirds = sortedThirds.slice(0, bestThirdsCount);
      qualified.push(...bestThirds.map(t => t.teamId));
    }
    
    return qualified;
  }, [competitionState]);

  // Advance to knockout stage with proper bracket seeding
  // Teams from same group go to opposite sides of bracket
  // Example for 2 groups: 1A vs 2B (top), 1B vs 2A (bottom)
  // Example for 4 groups: 1A vs 2B, 1C vs 2D (top), 1B vs 2A, 1D vs 2C (bottom)
  const advanceToKnockout = useCallback(() => {
    if (!isGroupStageComplete || !competitionState?.config.knockoutConfig) return;
    if (!competitionState.groups || !competitionState.config.groupConfig) return;
    
    const { qualificationRule } = competitionState.config.groupConfig;
    const numGroups = competitionState.groups.length;
    
    // Get qualified teams organized by group and position
    const qualifiedByPosition: { teamId: string; groupIndex: number; position: number }[] = [];
    
    for (let i = 0; i < numGroups; i++) {
      const group = competitionState.groups[i];
      const sortedStandings = sortGroupStandings(group.standings);
      
      // First place
      if (sortedStandings[0]) {
        qualifiedByPosition.push({
          teamId: sortedStandings[0].teamId,
          groupIndex: i,
          position: 1,
        });
      }
      
      // Second place (if rule allows)
      if ((qualificationRule === "first_second" || qualificationRule === "first_second_best_thirds") 
          && sortedStandings[1]) {
        qualifiedByPosition.push({
          teamId: sortedStandings[1].teamId,
          groupIndex: i,
          position: 2,
        });
      }
    }
    
    // Add best thirds if applicable (handled separately)
    if (qualificationRule === "first_second_best_thirds" && competitionState.config.groupConfig.bestThirdsCount) {
      const thirds: ThirdPlaceTeam[] = [];
      for (const group of competitionState.groups) {
        const sortedStandings = sortGroupStandings(group.standings);
        if (sortedStandings[2]) {
          thirds.push({
            teamId: sortedStandings[2].teamId,
            groupId: group.id,
            groupLetter: group.letter,
            standing: sortedStandings[2],
          });
        }
      }
      const sortedThirds = thirds.sort((a, b) => {
        if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
        if (b.standing.goalDifference !== a.standing.goalDifference) 
          return b.standing.goalDifference - a.standing.goalDifference;
        return b.standing.goalsFor - a.standing.goalsFor;
      });
      const bestThirds = sortedThirds.slice(0, competitionState.config.groupConfig.bestThirdsCount);
      bestThirds.forEach((t, idx) => {
        qualifiedByPosition.push({
          teamId: t.teamId,
          groupIndex: competitionState.groups!.findIndex(g => g.id === t.groupId),
          position: 3,
        });
      });
    }
    
    // Now arrange teams so teams from same group go to opposite sides of bracket
    // For first/second rule with n groups, we create n matchups
    // Pattern: 1A vs 2B (top), 1B vs 2A (bottom), 1C vs 2D (top), 1D vs 2C (bottom), etc.
    
    const orderedTeams: string[] = [];
    const firsts = qualifiedByPosition.filter(t => t.position === 1).sort((a, b) => a.groupIndex - b.groupIndex);
    const seconds = qualifiedByPosition.filter(t => t.position === 2).sort((a, b) => a.groupIndex - b.groupIndex);
    const thirds = qualifiedByPosition.filter(t => t.position === 3);
    
    if (qualificationRule === "first_second" || qualificationRule === "first_second_best_thirds") {
      // Simplified World-Cup-style crossing (inspired by the 48-team format):
      // - T = number of qualifying third-place teams (0 for "first_second")
      // - The last T groups are "third-facing": their 1st place team faces a best-third,
      //   and their 2nd place teams are paired against each other.
      // - The remaining (numGroups - T) groups do a double crossover: 1X vs 2Y and 1Y vs 2X,
      //   so no team ever faces a team from its own group.
      const matchups: { team1: string; team2: string }[] = [];
      const T = thirds.length;

      const allGroupIndices = Array.from({ length: numGroups }, (_, i) => i);
      const thirdFacingIndices = T > 0 ? allGroupIndices.slice(numGroups - T) : [];
      const crossoverIndices = T > 0 ? allGroupIndices.slice(0, numGroups - T) : allGroupIndices;

      // Crossover pairs: 1A vs 2B and 1B vs 2A
      for (let i = 0; i < crossoverIndices.length; i += 2) {
        const groupA = crossoverIndices[i];
        const groupB = crossoverIndices[i + 1];
        if (groupB === undefined) break;

        const firstA = firsts.find(t => t.groupIndex === groupA);
        const firstB = firsts.find(t => t.groupIndex === groupB);
        const secondA = seconds.find(t => t.groupIndex === groupA);
        const secondB = seconds.find(t => t.groupIndex === groupB);

        if (firstA && secondB) matchups.push({ team1: firstA.teamId, team2: secondB.teamId });
        if (firstB && secondA) matchups.push({ team1: firstB.teamId, team2: secondA.teamId });
      }

      // Second-vs-second pairs among the third-facing groups
      for (let i = 0; i < thirdFacingIndices.length; i += 2) {
        const groupA = thirdFacingIndices[i];
        const groupB = thirdFacingIndices[i + 1];
        if (groupB === undefined) break;

        const secondA = seconds.find(t => t.groupIndex === groupA);
        const secondB = seconds.find(t => t.groupIndex === groupB);
        if (secondA && secondB) matchups.push({ team1: secondA.teamId, team2: secondB.teamId });
      }

      // First-vs-third pairs, avoiding a team facing a third from its own group
      if (T > 0) {
        const slotHosts = thirdFacingIndices
          .map(groupIndex => ({
            groupLetter: competitionState.groups![groupIndex]?.letter,
            first: firsts.find(t => t.groupIndex === groupIndex),
          }))
          .filter(s => s.first);

        const assignment = thirds.map(t => ({
          teamId: t.teamId,
          groupLetter: competitionState.groups![t.groupIndex]?.letter,
        }));

        // Resolve same-group conflicts by swapping with another slot
        for (let i = 0; i < assignment.length && i < slotHosts.length; i++) {
          if (assignment[i].groupLetter === slotHosts[i].groupLetter) {
            for (let j = 0; j < assignment.length; j++) {
              if (j === i) continue;
              if (
                assignment[j].groupLetter !== slotHosts[i].groupLetter &&
                assignment[i].groupLetter !== slotHosts[j]?.groupLetter
              ) {
                [assignment[i], assignment[j]] = [assignment[j], assignment[i]];
                break;
              }
            }
          }
        }

        slotHosts.forEach((slot, idx) => {
          const third = assignment[idx];
          if (slot.first && third) {
            matchups.push({ team1: slot.first.teamId, team2: third.teamId });
          }
        });
      }

      matchups.forEach(m => orderedTeams.push(m.team1, m.team2));
    } else {
      // first_only rule - just use firsts in order
      firsts.forEach(t => orderedTeams.push(t.teamId));
    }
    
    const seeds = orderedTeams.map((_, i) => i + 1);
    
    const { matches, series } = generateKnockoutBracketWithFixedMatchups(
      orderedTeams,
      seeds,
      competitionState.config.knockoutConfig.matchFormat,
      competitionState.config.knockoutConfig.finalFormat
    );
    
    setCompetitionState(prev => prev ? {
      ...prev,
      phase: "knockout",
      knockoutMatches: matches,
      knockoutSeries: series,
      qualifiedFromGroups: orderedTeams,
    } : null);
  }, [isGroupStageComplete, competitionState, getQualifiedTeamsFromGroups]);

  // Simulate knockout match with level-based advantage rules
  const simulateKnockoutMatch = useCallback((matchId: string): { 
    team1Goals: number; 
    team2Goals: number; 
    firstRoll: { team1: number; team2: number };
    secondRoll?: { team1: number; team2: number };
    requiredSecondRoll: boolean;
    penalties?: {
      team1Penalties: number;
      team2Penalties: number;
      rounds: { team1: number; team2: number }[];
    };
    winnerId?: string;
  } | null => {
    if (!competitionState?.knockoutMatches || !competitionState?.knockoutSeries) return null;
    
    const match = competitionState.knockoutMatches.find(m => m.id === matchId);
    if (!match || match.played || !match.team1Id || !match.team2Id) return null;
    
    const series = competitionState.knockoutSeries.find(s => s.leg1Id === matchId || s.leg2Id === matchId);
    if (!series) return null;
    
    const team1 = getTeamById(match.team1Id);
    const team2 = getTeamById(match.team2Id);
    
    if (!team1 || !team2) return null;
    
    const isNeutral = match.isNeutralVenue;
    const isSecondLeg = series.leg2Id === matchId;
    const isSingleLeg = !series.leg2Id;

    // First roll
    const team1Roll1 = rollDie();
    const team2Roll1 = rollDie();
    const team1Goals1 = dieToGoals(team1Roll1);
    const team2Goals1 = dieToGoals(team2Roll1);

    const requiredSecondRoll = needsSecondRoll({
      team1Level: team1.level,
      team2Level: team2.level,
      team1Goals: team1Goals1,
      team2Goals: team2Goals1,
      isNeutral,
    });

    let finalTeam1Goals = team1Goals1;
    let finalTeam2Goals = team2Goals1;
    let secondRoll: { team1: number; team2: number } | undefined;

    if (requiredSecondRoll) {
      const team1Roll2 = rollDie();
      const team2Roll2 = rollDie();
      secondRoll = { team1: team1Roll2, team2: team2Roll2 };

      const team1Goals2 = dieToGoals(team1Roll2);
      const team2Goals2 = dieToGoals(team2Roll2);

      // Keep whichever roll is best for the stronger team (win > draw > loss),
      // not simply the second roll
      const best = pickBetterRollForStrongerTeam(
        team1.level,
        team2.level,
        { team1Goals: team1Goals1, team2Goals: team2Goals1 },
        { team1Goals: team1Goals2, team2Goals: team2Goals2 }
      );
      finalTeam1Goals = best.team1Goals;
      finalTeam2Goals = best.team2Goals;
    }
    
    // Check if we need penalties (for single leg or second leg with tied aggregate)
    let penalties: { team1Penalties: number; team2Penalties: number; rounds: { team1: number; team2: number }[] } | undefined;
    let winnerId: string | undefined;
    
    if (isSingleLeg || isSecondLeg) {
      // Calculate aggregate by TEAM ID
      // Get leg1 match to find goals scored by each series team
      const leg1Match = competitionState.knockoutMatches.find(m => m.id === series.leg1Id);
      
      let seriesTeam1TotalGoals = 0;
      let seriesTeam2TotalGoals = 0;
      
      // Add leg1 goals (already played)
      if (leg1Match && leg1Match.played && leg1Match.team1Goals !== null && leg1Match.team2Goals !== null) {
        // In leg1, match.team1 is home, match.team2 is away
        if (leg1Match.team1Id === series.team1Id) {
          // series.team1 was home in leg1
          seriesTeam1TotalGoals += leg1Match.team1Goals;
          seriesTeam2TotalGoals += leg1Match.team2Goals;
        } else {
          // series.team2 was home in leg1
          seriesTeam1TotalGoals += leg1Match.team2Goals;
          seriesTeam2TotalGoals += leg1Match.team1Goals;
        }
      }
      
      // Add current match goals (leg2 or single leg)
      if (isSecondLeg) {
        // In this match (leg2), match.team1Id is home, match.team2Id is away
        if (match.team1Id === series.team1Id) {
          // series.team1 is home in leg2
          seriesTeam1TotalGoals += finalTeam1Goals;
          seriesTeam2TotalGoals += finalTeam2Goals;
        } else {
          // series.team2 is home in leg2
          seriesTeam1TotalGoals += finalTeam2Goals;
          seriesTeam2TotalGoals += finalTeam1Goals;
        }
      } else {
        // Single leg - map match teams to series teams
        if (match.team1Id === series.team1Id) {
          seriesTeam1TotalGoals = finalTeam1Goals;
          seriesTeam2TotalGoals = finalTeam2Goals;
        } else {
          seriesTeam1TotalGoals = finalTeam2Goals;
          seriesTeam2TotalGoals = finalTeam1Goals;
        }
      }
      
      if (seriesTeam1TotalGoals === seriesTeam2TotalGoals) {
        // Penalties needed
        const penaltyRounds: { team1: number; team2: number }[] = [];
        let team1Pens = 0;
        let team2Pens = 0;
        
        // Initial 5 rounds
        for (let i = 0; i < 5; i++) {
          const t1 = Math.random() > 0.25 ? 1 : 0;
          const t2 = Math.random() > 0.25 ? 1 : 0;
          penaltyRounds.push({ team1: t1, team2: t2 });
          team1Pens += t1;
          team2Pens += t2;
        }
        
        // Sudden death if still tied
        while (team1Pens === team2Pens) {
          const t1 = Math.random() > 0.25 ? 1 : 0;
          const t2 = Math.random() > 0.25 ? 1 : 0;
          penaltyRounds.push({ team1: t1, team2: t2 });
          team1Pens += t1;
          team2Pens += t2;
        }
        
        penalties = { team1Penalties: team1Pens, team2Penalties: team2Pens, rounds: penaltyRounds };
        // Winner based on penalties - return the MATCH team that won
        // penalties.team1 = match.team1, penalties.team2 = match.team2
        winnerId = team1Pens > team2Pens ? match.team1Id! : match.team2Id!;
      } else {
        // Determine winner by aggregate - return the MATCH team that won
        // We need to map series winner to match team
        const seriesWinnerId = seriesTeam1TotalGoals > seriesTeam2TotalGoals 
          ? series.team1Id 
          : series.team2Id;
        winnerId = seriesWinnerId!;
      }
    }
    
    return {
      team1Goals: finalTeam1Goals,
      team2Goals: finalTeam2Goals,
      firstRoll: { team1: team1Roll1, team2: team2Roll1 },
      secondRoll,
      requiredSecondRoll,
      penalties,
      winnerId,
    };
  }, [competitionState, getTeamById, rollDie, dieToGoals]);

  // Confirm knockout match result
  // CRITICAL: Calculate aggregate by TEAM ID, not by match position
  // In a two-leg series:
  // - Leg 1: Team A (home) vs Team B (away) → A scores homeGoals, B scores awayGoals
  // - Leg 2: Team B (home) vs Team A (away) → B scores homeGoals, A scores awayGoals
  // - Global A = A's goals in leg1 (home) + A's goals in leg2 (away)
  // - Global B = B's goals in leg1 (away) + B's goals in leg2 (home)
  const confirmKnockoutMatchResult = useCallback((
    matchId: string,
    result: {
      team1Goals: number;
      team2Goals: number;
      firstRoll: { team1: number; team2: number };
      secondRoll?: { team1: number; team2: number };
      requiredSecondRoll: boolean;
      penalties?: { team1Penalties: number; team2Penalties: number; rounds: { team1: number; team2: number }[] };
      winnerId?: string;
    }
  ) => {
    if (!competitionState?.knockoutMatches || !competitionState?.knockoutSeries) return;
    
    setCompetitionState(prev => {
      if (!prev?.knockoutMatches || !prev?.knockoutSeries) return prev;
      
      // Update the match with results
      const updatedMatches = prev.knockoutMatches.map(m => {
        if (m.id !== matchId) return m;
        return {
          ...m,
          team1Goals: result.team1Goals,
          team2Goals: result.team2Goals,
          played: true,
          firstRoll: { home: result.firstRoll.team1, away: result.firstRoll.team2 },
          secondRoll: result.secondRoll ? { home: result.secondRoll.team1, away: result.secondRoll.team2 } : undefined,
          penalties: result.penalties ? {
            team1Penalties: result.penalties.team1Penalties,
            team2Penalties: result.penalties.team2Penalties,
            rounds: result.penalties.rounds,
          } : undefined,
        };
      });
      
      // Find the match we just updated (with new results)
      const currentMatch = updatedMatches.find(m => m.id === matchId);
      if (!currentMatch) return prev;
      
      // Update series with correct aggregate calculation
      const updatedSeries = prev.knockoutSeries.map(s => {
        if (s.leg1Id !== matchId && s.leg2Id !== matchId) return s;
        
        const updated = { ...s };
        const isLeg1 = s.leg1Id === matchId;
        const isLeg2 = s.leg2Id === matchId;
        const isSingleLeg = !s.leg2Id;
        
        // Get both leg matches to calculate aggregate correctly
        const leg1Match = updatedMatches.find(m => m.id === s.leg1Id);
        const leg2Match = s.leg2Id ? updatedMatches.find(m => m.id === s.leg2Id) : null;
        
        // CRITICAL FIX: Calculate aggregate by TEAM ID
        // For each match, we check: which series team is home, which is away
        // Then sum their goals accordingly
        
        let seriesTeam1Goals = 0;
        let seriesTeam2Goals = 0;
        
        // Calculate leg 1 goals for each series team
        if (leg1Match && leg1Match.played && leg1Match.team1Goals !== null && leg1Match.team2Goals !== null) {
          // In leg1, who is home (match.team1Id) and who is away (match.team2Id)?
          if (leg1Match.team1Id === s.team1Id) {
            // series.team1 is home in leg1
            seriesTeam1Goals += leg1Match.team1Goals;
            seriesTeam2Goals += leg1Match.team2Goals;
          } else if (leg1Match.team1Id === s.team2Id) {
            // series.team2 is home in leg1
            seriesTeam1Goals += leg1Match.team2Goals;
            seriesTeam2Goals += leg1Match.team1Goals;
          }
        }
        
        // Calculate leg 2 goals for each series team
        if (leg2Match && leg2Match.played && leg2Match.team1Goals !== null && leg2Match.team2Goals !== null) {
          // In leg2, who is home (match.team1Id) and who is away (match.team2Id)?
          if (leg2Match.team1Id === s.team1Id) {
            // series.team1 is home in leg2
            seriesTeam1Goals += leg2Match.team1Goals;
            seriesTeam2Goals += leg2Match.team2Goals;
          } else if (leg2Match.team1Id === s.team2Id) {
            // series.team2 is home in leg2
            seriesTeam1Goals += leg2Match.team2Goals;
            seriesTeam2Goals += leg2Match.team1Goals;
          }
        }
        
        updated.team1Aggregate = seriesTeam1Goals;
        updated.team2Aggregate = seriesTeam2Goals;
        
        // Determine winner
        const seriesComplete = isSingleLeg || (isLeg2 && leg2Match?.played);
        
        if (seriesComplete) {
          if (result.penalties) {
            // Winner from penalties - map from match context to series context
            // In penalties, result.winnerId is the match.team1Id or match.team2Id
            // We need to map it to series.team1Id or series.team2Id
            if (result.winnerId === currentMatch.team1Id) {
              // The match.team1 won - find which series team that is
              if (currentMatch.team1Id === s.team1Id) {
                updated.winnerId = s.team1Id;
              } else {
                updated.winnerId = s.team2Id;
              }
            } else if (result.winnerId === currentMatch.team2Id) {
              // The match.team2 won - find which series team that is
              if (currentMatch.team2Id === s.team1Id) {
                updated.winnerId = s.team1Id;
              } else {
                updated.winnerId = s.team2Id;
              }
            }
          } else {
            // Winner by aggregate
            if (updated.team1Aggregate > updated.team2Aggregate) {
              updated.winnerId = s.team1Id;
            } else if (updated.team2Aggregate > updated.team1Aggregate) {
              updated.winnerId = s.team2Id;
            }
          }
        }
        
        return updated;
      });
      
      // If series has a winner, advance to next round
      const completedSeries = updatedSeries.find(s => s.leg1Id === matchId || s.leg2Id === matchId);
      if (completedSeries?.winnerId) {
        // Find next round series and update teams
        const currentRound = completedSeries.round;
        const rounds: KnockoutRound[] = ["preliminary_1", "preliminary_2", "preliminary_3", "round_of_64", "round_of_32", "round_of_16", "quarterfinals", "semifinals", "final"];
        const currentRoundIndex = rounds.indexOf(currentRound);
        const nextRound = rounds[currentRoundIndex + 1];
        
        if (nextRound) {
          const nextBracketPosition = Math.ceil(completedSeries.bracketPosition / 2);
          const isFirstTeamInNextSeries = completedSeries.bracketPosition % 2 === 1;
          
          const nextSeriesIndex = updatedSeries.findIndex(
            s => s.round === nextRound && s.bracketPosition === nextBracketPosition
          );
          
          if (nextSeriesIndex !== -1) {
            const nextSeries = { ...updatedSeries[nextSeriesIndex] };
            
            // Place winner in next series
            if (isFirstTeamInNextSeries) {
              nextSeries.team1Id = completedSeries.winnerId;
            } else {
              nextSeries.team2Id = completedSeries.winnerId;
            }
            updatedSeries[nextSeriesIndex] = nextSeries;
            
            // Update matches for the next series
            // For two-leg format:
            // - Leg1: team2 (worse seed) is HOME, team1 (better seed) is AWAY
            // - Leg2: team1 (better seed) is HOME, team2 (worse seed) is AWAY
            const nextSeriesUpdated = updatedSeries[nextSeriesIndex];
            
            updatedMatches.forEach((m, i) => {
              if (m.round === nextRound && m.bracketPosition === nextBracketPosition) {
                if (m.leg === 1) {
                  // Leg1: series.team2 is home (match.team1), series.team1 is away (match.team2)
                  updatedMatches[i] = { 
                    ...m, 
                    team1Id: nextSeriesUpdated.team2Id,
                    team2Id: nextSeriesUpdated.team1Id
                  };
                } else {
                  // Leg2: series.team1 is home (match.team1), series.team2 is away (match.team2)
                  updatedMatches[i] = { 
                    ...m, 
                    team1Id: nextSeriesUpdated.team1Id,
                    team2Id: nextSeriesUpdated.team2Id
                  };
                }
              }
            });
          }
        } else {
          // This was the final - set champion
          return {
            ...prev,
            knockoutMatches: updatedMatches,
            knockoutSeries: updatedSeries,
            phase: "complete" as const,
            championId: completedSeries.winnerId,
          };
        }
      }
      
      return {
        ...prev,
        knockoutMatches: updatedMatches,
        knockoutSeries: updatedSeries,
      };
    });
  }, [competitionState]);

  // Go back to groups view (for navigation)
  const goToPhase = useCallback((phase: "groups" | "knockout") => {
    if (!competitionState) return;
    setCompetitionState(prev => prev ? { ...prev, viewingPhase: phase } : null);
  }, [competitionState]);

  // Save competition state
  const saveCompetition = useCallback((name: string): any => {
    if (!competitionState) return null;
    return {
      competitionState,
      customTeamsData,
      teamLevels,
      savedAt: new Date().toISOString(),
    };
  }, [competitionState, customTeamsData, teamLevels]);

  // Load competition state
  const loadCompetition = useCallback((data: any): boolean => {
    try {
      if (data.competitionState) {
        setCompetitionState(data.competitionState);
      }
      if (data.customTeamsData) {
        setCustomTeamsData(data.customTeamsData);
      }
      if (data.teamLevels) {
        setTeamLevels(data.teamLevels);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Reset competition
  const resetCompetition = useCallback(() => {
    setCompetitionState(null);
  }, []);

  return {
    competitionState,
    getTeamById,
    initializeCompetition,
    executeDrawStep,
    completeDraw,
    simulateGroupMatch,
    confirmGroupMatchResult,
    simulateGroupMatchday,
    isGroupStageComplete,
    getQualifiedTeamsFromGroups,
    advanceToKnockout,
    simulateKnockoutMatch,
    confirmKnockoutMatchResult,
    goToPhase,
    saveCompetition,
    loadCompetition,
    resetCompetition,
    teamLevels,
    setTeamLevels,
    customTeamsData,
    setCustomTeamsData,
  };
};
