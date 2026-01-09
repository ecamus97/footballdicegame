import { useState, useCallback, useMemo } from "react";
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
  getNextPowerOf2,
  calculateByes,
  getGroupLetter,
  PenaltyResult
} from "@/types/competition";
import { Team } from "@/types/game";
import { teams as defaultTeams } from "@/data/teams";

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
  if (format === "double") {
    const firstLegMatches = [...matches];
    firstLegMatches.forEach(match => {
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

// Generate knockout bracket with byes
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
  // For standard bracket: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
  // Simplified: place by seed order, byes go to top seeds
  sortedBySeeds.forEach((team, index) => {
    if (index < numByes) {
      // This team gets a bye - will appear in second round
      // For now, mark as advancing
    }
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

export const useCompetitionState = () => {
  const [competitionState, setCompetitionState] = useState<CompetitionState | null>(null);
  const [teamLevels, setTeamLevels] = useState<Record<string, 1 | 2 | 3 | 4>>({});
  const [teamNames, setTeamNames] = useState<Record<string, { name: string; shortName: string }>>({});

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

  // Execute a draw step (for visual draw)
  const executeDrawStep = useCallback(() => {
    if (!competitionState?.drawState || competitionState.drawState.isComplete) return null;
    
    const drawState = { ...competitionState.drawState };
    const { pots, remainingTeams, groups } = drawState;
    
    if (remainingTeams.length === 0) {
      drawState.isComplete = true;
      setCompetitionState(prev => prev ? { ...prev, drawState } : null);
      return { type: "complete" as const };
    }
    
    // Pick random team from current pot
    const currentPot = pots[drawState.currentPotIndex];
    const teamsInPot = remainingTeams.filter(t => t.potId === currentPot.id);
    
    if (teamsInPot.length === 0) {
      // Move to next pot
      drawState.currentPotIndex++;
      drawState.currentTeamIndex = 0;
      setCompetitionState(prev => prev ? { ...prev, drawState } : null);
      return executeDrawStep();
    }
    
    // Random selection
    const randomIndex = Math.floor(Math.random() * teamsInPot.length);
    const selectedTeam = teamsInPot[randomIndex];
    
    // Find group with space that doesn't have a team from this pot
    const availableGroups = groups!.filter(g => {
      const hasSpaceInGroup = g.teamIds.length < 4;
      const hasTeamFromPot = drawState.drawnTeams.some(
        dt => dt.groupId === g.id && dt.potId === selectedTeam.potId
      );
      return hasSpaceInGroup && !hasTeamFromPot;
    });
    
    if (availableGroups.length === 0) return null;
    
    const targetGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
    
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

  // Simulate group match
  const rollDie = useCallback((): number => Math.floor(Math.random() * 6) + 1, []);
  const dieToGoals = useCallback((die: number): number => die - 1, []);

  const simulateGroupMatch = useCallback((matchId: string): { homeGoals: number; awayGoals: number; firstRoll: { home: number; away: number } } | null => {
    if (!competitionState?.groups) return null;
    
    let targetMatch: GroupMatch | undefined;
    for (const group of competitionState.groups) {
      targetMatch = group.matches.find(m => m.id === matchId);
      if (targetMatch) break;
    }
    
    if (!targetMatch || targetMatch.played) return null;
    
    const homeRoll = rollDie();
    const awayRoll = rollDie();
    
    return {
      homeGoals: dieToGoals(homeRoll),
      awayGoals: dieToGoals(awayRoll),
      firstRoll: { home: homeRoll, away: awayRoll },
    };
  }, [competitionState, rollDie, dieToGoals]);

  // Confirm group match result
  const confirmGroupMatchResult = useCallback((
    matchId: string, 
    result: { homeGoals: number; awayGoals: number; firstRoll: { home: number; away: number } }
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

  // Advance to knockout stage
  const advanceToKnockout = useCallback(() => {
    if (!isGroupStageComplete || !competitionState?.config.knockoutConfig) return;
    
    const qualifiedTeams = getQualifiedTeamsFromGroups();
    const seeds = qualifiedTeams.map((_, i) => i + 1);
    
    const { matches, series } = generateKnockoutBracket(
      qualifiedTeams,
      seeds,
      competitionState.config.knockoutConfig.matchFormat,
      competitionState.config.knockoutConfig.finalFormat
    );
    
    setCompetitionState(prev => prev ? {
      ...prev,
      phase: "knockout",
      knockoutMatches: matches,
      knockoutSeries: series,
      qualifiedFromGroups: qualifiedTeams,
    } : null);
  }, [isGroupStageComplete, competitionState, getQualifiedTeamsFromGroups]);

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
    isGroupStageComplete,
    getQualifiedTeamsFromGroups,
    advanceToKnockout,
    resetCompetition,
    teamLevels,
    setTeamLevels,
    teamNames,
    setTeamNames,
  };
};
