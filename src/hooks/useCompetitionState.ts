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
  CustomTeam,
  getNextPowerOf2,
  calculateByes,
  getGroupLetter,
  PenaltyResult
} from "@/types/competition";
import { Team } from "@/types/game";

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
  const [customTeamsData, setCustomTeamsData] = useState<CustomTeam[]>([]);

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
  const rollDie = useCallback((): number => Math.floor(Math.random() * 6) + 1, []);
  const dieToGoals = useCallback((die: number): number => die - 1, []);

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
    
    const homeLevel = homeTeam.level;
    const awayLevel = awayTeam.level;
    const levelDiff = Math.abs(homeLevel - awayLevel);
    const strongerIsHome = homeLevel < awayLevel;
    
    // First roll
    const homeRoll1 = rollDie();
    const awayRoll1 = rollDie();
    const homeGoals1 = dieToGoals(homeRoll1);
    const awayGoals1 = dieToGoals(awayRoll1);
    
    // Determine if second roll is needed based on rules
    let requiredSecondRoll = false;
    let useSecondRoll = false;
    
    // Same level: No advantage
    if (levelDiff === 0) {
      requiredSecondRoll = false;
    }
    // 1 level difference: Only if stronger is HOME and doesn't win
    else if (levelDiff === 1) {
      if (strongerIsHome) {
        const strongerWon = homeGoals1 > awayGoals1;
        requiredSecondRoll = !strongerWon;
      } else {
        // Stronger is away with 1 level diff = no advantage
        requiredSecondRoll = false;
      }
    }
    // 2+ levels difference: Stronger always has advantage regardless of venue
    else {
      const strongerWon = strongerIsHome 
        ? homeGoals1 > awayGoals1 
        : awayGoals1 > homeGoals1;
      requiredSecondRoll = !strongerWon;
    }
    
    // Calculate final result
    let finalHomeGoals = homeGoals1;
    let finalAwayGoals = awayGoals1;
    let secondRoll: { home: number; away: number } | undefined;
    
    if (requiredSecondRoll) {
      // Second roll (will be triggered by UI, but we pre-calculate)
      const homeRoll2 = rollDie();
      const awayRoll2 = rollDie();
      secondRoll = { home: homeRoll2, away: awayRoll2 };
      
      // Use second roll result as final
      finalHomeGoals = dieToGoals(homeRoll2);
      finalAwayGoals = dieToGoals(awayRoll2);
    }
    
    return {
      homeGoals: finalHomeGoals,
      awayGoals: finalAwayGoals,
      firstRoll: { home: homeRoll1, away: awayRoll1 },
      secondRoll,
      requiredSecondRoll,
    };
  }, [competitionState, rollDie, dieToGoals, getTeamById]);

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
    
    const team1Level = team1.level;
    const team2Level = team2.level;
    const levelDiff = Math.abs(team1Level - team2Level);
    const strongerIsTeam1 = team1Level < team2Level;
    
    // First roll
    const team1Roll1 = rollDie();
    const team2Roll1 = rollDie();
    const team1Goals1 = dieToGoals(team1Roll1);
    const team2Goals1 = dieToGoals(team2Roll1);
    
    let requiredSecondRoll = false;
    
    // Level advantage rules
    if (levelDiff === 0) {
      requiredSecondRoll = false;
    } else if (isNeutral) {
      // Neutral venue: stronger team has advantage if not winning
      const strongerWon = strongerIsTeam1 
        ? team1Goals1 > team2Goals1 
        : team2Goals1 > team1Goals1;
      requiredSecondRoll = !strongerWon && levelDiff >= 1;
    } else if (levelDiff === 1) {
      // 1 level diff: only if stronger is home (team1) and doesn't win
      if (strongerIsTeam1) {
        requiredSecondRoll = team1Goals1 <= team2Goals1;
      } else {
        requiredSecondRoll = false;
      }
    } else {
      // 2+ levels: stronger always has advantage
      const strongerWon = strongerIsTeam1 
        ? team1Goals1 > team2Goals1 
        : team2Goals1 > team1Goals1;
      requiredSecondRoll = !strongerWon;
    }
    
    let finalTeam1Goals = team1Goals1;
    let finalTeam2Goals = team2Goals1;
    let secondRoll: { team1: number; team2: number } | undefined;
    
    if (requiredSecondRoll) {
      const team1Roll2 = rollDie();
      const team2Roll2 = rollDie();
      secondRoll = { team1: team1Roll2, team2: team2Roll2 };
      finalTeam1Goals = dieToGoals(team1Roll2);
      finalTeam2Goals = dieToGoals(team2Roll2);
    }
    
    // Check if we need penalties (for single leg or second leg with tied aggregate)
    let penalties: { team1Penalties: number; team2Penalties: number; rounds: { team1: number; team2: number }[] } | undefined;
    let winnerId: string | undefined;
    
    if (isSingleLeg || isSecondLeg) {
      // Calculate aggregate
      // For second leg:
      // - match.team1Id = series.team2Id (home in vuelta)
      // - match.team2Id = series.team1Id (away in vuelta)
      // - series.team1Aggregate = goals scored by series.team1 in leg1
      // - series.team2Aggregate = goals scored by series.team2 in leg1
      // 
      // In second leg match result:
      // - finalTeam1Goals = goals by match.team1 (series.team2) in vuelta
      // - finalTeam2Goals = goals by match.team2 (series.team1) in vuelta
      
      let seriesTeam1TotalGoals = 0;
      let seriesTeam2TotalGoals = 0;
      
      if (isSecondLeg) {
        // series.team1's total = leg1 goals + vuelta goals (as away in vuelta, i.e., finalTeam2Goals)
        // series.team2's total = leg1 goals + vuelta goals (as home in vuelta, i.e., finalTeam1Goals)
        seriesTeam1TotalGoals = (series.team1Aggregate || 0) + finalTeam2Goals;
        seriesTeam2TotalGoals = (series.team2Aggregate || 0) + finalTeam1Goals;
      } else {
        // Single leg
        seriesTeam1TotalGoals = finalTeam1Goals;
        seriesTeam2TotalGoals = finalTeam2Goals;
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
        // winnerId should be the match.team1Id or match.team2Id of the current match
        winnerId = team1Pens > team2Pens ? match.team1Id! : match.team2Id!;
      } else {
        // Determine winner - in second leg context, we return match.team1Id or match.team2Id
        if (isSecondLeg) {
          // seriesTeam1 = match.team2, seriesTeam2 = match.team1
          winnerId = seriesTeam1TotalGoals > seriesTeam2TotalGoals 
            ? match.team2Id! // series.team1 won
            : match.team1Id!; // series.team2 won
        } else {
          winnerId = seriesTeam1TotalGoals > seriesTeam2TotalGoals 
            ? match.team1Id! 
            : match.team2Id!;
        }
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
      
      // Update the match
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
      
      // Find and update series
      const match = prev.knockoutMatches.find(m => m.id === matchId);
      if (!match) return prev;
      
      const updatedSeries = prev.knockoutSeries.map(s => {
        if (s.leg1Id !== matchId && s.leg2Id !== matchId) return s;
        
        const updated = { ...s };
        const isSecondLeg = s.leg2Id === matchId;
        const isSingleLeg = !s.leg2Id;
        
        // Get the match to understand team mapping
        // In leg1: team1Id = series.team1Id (home), team2Id = series.team2Id (away)
        // In leg2: team1Id = series.team2Id (home), team2Id = series.team1Id (away)
        // So we need to correctly assign goals to series teams
        
        // Update aggregates
        if (isSingleLeg) {
          // Single leg: match.team1 = series.team1, match.team2 = series.team2
          updated.team1Aggregate = result.team1Goals;
          updated.team2Aggregate = result.team2Goals;
        } else if (!isSecondLeg) {
          // First leg: series.team1 is home (match.team1), series.team2 is away (match.team2)
          // So series.team1's goals = match.team1Goals (home goals)
          // And series.team2's goals = match.team2Goals (away goals)
          updated.team1Aggregate = result.team1Goals;
          updated.team2Aggregate = result.team2Goals;
        } else {
          // Second leg: series.team2 is home (match.team1), series.team1 is away (match.team2)
          // So in the second leg:
          // match.team1Goals = series.team2's home goals
          // match.team2Goals = series.team1's away goals
          updated.team1Aggregate = (s.team1Aggregate || 0) + result.team2Goals;
          updated.team2Aggregate = (s.team2Aggregate || 0) + result.team1Goals;
        }
        
        // Set winner if determined
        if (result.winnerId) {
          // Map the winnerId from match context to series context
          if (isSecondLeg) {
            // In second leg, match.team1Id = series.team2Id
            // So if winnerId = match.team1Id, it means series.team2 won
            // And if winnerId = match.team2Id, it means series.team1 won
            const leg2Match = prev.knockoutMatches.find(m => m.id === matchId);
            if (leg2Match) {
              if (result.winnerId === leg2Match.team1Id) {
                updated.winnerId = s.team2Id;
              } else {
                updated.winnerId = s.team1Id;
              }
            }
          } else {
            updated.winnerId = result.winnerId;
          }
        } else if (isSingleLeg || isSecondLeg) {
          if (updated.team1Aggregate > updated.team2Aggregate) {
            updated.winnerId = s.team1Id;
          } else if (updated.team2Aggregate > updated.team1Aggregate) {
            updated.winnerId = s.team2Id;
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
          const isFirstTeam = completedSeries.bracketPosition % 2 === 1;
          
          const nextSeriesIndex = updatedSeries.findIndex(
            s => s.round === nextRound && s.bracketPosition === nextBracketPosition
          );
          
          if (nextSeriesIndex !== -1) {
            const nextSeries = { ...updatedSeries[nextSeriesIndex] };
            if (isFirstTeam) {
              nextSeries.team1Id = completedSeries.winnerId;
            } else {
              nextSeries.team2Id = completedSeries.winnerId;
            }
            updatedSeries[nextSeriesIndex] = nextSeries;
            
            // Also update matches for that series
            updatedMatches.forEach((m, i) => {
              if (m.round === nextRound && m.bracketPosition === nextBracketPosition) {
                if (isFirstTeam) {
                  updatedMatches[i] = { ...m, team1Id: completedSeries.winnerId };
                } else {
                  updatedMatches[i] = { ...m, team2Id: completedSeries.winnerId };
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
