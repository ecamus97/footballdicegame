// Competition Types - Motor Universal de Competiciones

export type CompetitionType = 
  | "league"                  // Liga regular
  | "league_playoffs"         // Liga + Playoffs
  | "knockout"                // Eliminatoria directa
  | "groups_knockout"         // Fase de grupos + Eliminatoria
  | "qualifying_groups_knockout"; // Fase previa + Grupos + Eliminatoria

export type MatchFormat = "single" | "double" | "neutral"; // ida, ida/vuelta, partido único neutral

export type QualificationRule = 
  | "first_only"       // Solo primeros de grupo
  | "first_second"     // 1° y 2° de cada grupo
  | "first_second_best_thirds"; // 1°, 2° y mejores terceros

export type DrawMethod = "automatic" | "visual"; // Sorteo automático o visual paso a paso

// Pot/Bombo for draws
export interface DrawPot {
  id: string;
  name: string;
  teamIds: string[];
}

// Group configuration
export interface GroupConfig {
  numGroups: number;       // Número de grupos (8, 12, 16, etc.)
  teamsPerGroup: 4;        // Siempre 4 equipos por grupo
  matchFormat: MatchFormat; // Formato de partidos en grupo
  qualificationRule: QualificationRule;
  bestThirdsCount?: number; // Cantidad de mejores terceros que clasifican
}

// Knockout/Elimination configuration
export interface KnockoutConfig {
  totalTeams: number;      // Equipos en eliminatoria
  matchFormat: MatchFormat; // Formato general
  finalFormat: MatchFormat; // Formato de la final (puede ser diferente)
  seedByPosition: boolean;  // Si usar posiciones para cruces o sorteo
}

// Qualifying phase configuration
export interface QualifyingConfig {
  rounds: number;           // Número de rondas previas
  teamsEntering: number;    // Equipos que entran en fase previa
  matchFormat: MatchFormat;
  directToGroups: number;   // Equipos clasificados directamente a grupos
}

// Full competition configuration
export interface CompetitionConfig {
  id: string;
  name: string;
  type: CompetitionType;
  
  // Participating teams
  participatingTeamIds: string[];
  
  // League settings (for league and league_playoffs types)
  leagueFormat?: MatchFormat;
  
  // Group stage settings
  groupConfig?: GroupConfig;
  
  // Knockout stage settings
  knockoutConfig?: KnockoutConfig;
  
  // Qualifying phase settings
  qualifyingConfig?: QualifyingConfig;
  
  // Draw settings
  drawMethod: DrawMethod;
  pots?: DrawPot[];
  
  // Legacy compatibility - kept from TournamentConfig
  relegationSpots: number;
  internationalCups: { name: string; spots: number; color: string }[];
  promotionPlayoffEnabled: boolean;
  promotionPlayoffSpots: number;
}

// ============= Group Stage Types =============

export interface Group {
  id: string;
  name: string;            // "Grupo A", "Grupo B", etc.
  letter: string;          // "A", "B", etc.
  teamIds: string[];
  matches: GroupMatch[];
  standings: GroupStanding[];
}

export interface GroupMatch {
  id: string;
  groupId: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
  firstRoll?: { home: number; away: number };
  secondRoll?: { home: number; away: number };
}

export interface GroupStanding {
  teamId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// For best thirds calculation
export interface ThirdPlaceTeam {
  teamId: string;
  groupId: string;
  groupLetter: string;
  standing: GroupStanding;
}

// ============= Knockout Stage Types =============

export type KnockoutRound = 
  | "preliminary_1" | "preliminary_2" | "preliminary_3"  // Fases previas
  | "round_of_64" | "round_of_32" | "round_of_16"        // Rondas eliminatorias
  | "quarterfinals" | "semifinals" | "final";

export interface KnockoutMatch {
  id: string;
  round: KnockoutRound;
  bracketPosition: number;  // Posición en el bracket (1-32 para round of 64, etc.)
  leg: 1 | 2;
  team1Id: string | null;
  team2Id: string | null;
  team1Goals: number | null;
  team2Goals: number | null;
  played: boolean;
  isNeutralVenue: boolean;
  isBye: boolean;           // Si es un "bye" (avance automático)
  firstRoll?: { home: number; away: number };
  secondRoll?: { home: number; away: number };
  penalties?: PenaltyResult;
}

export interface KnockoutSeries {
  id: string;
  round: KnockoutRound;
  bracketPosition: number;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number;
  team2Seed: number;
  leg1Id: string | null;
  leg2Id: string | null;     // null for single-leg
  winnerId: string | null;
  team1Aggregate: number;
  team2Aggregate: number;
  isBye: boolean;
}

export interface PenaltyResult {
  team1Penalties: number;
  team2Penalties: number;
  rounds: { team1: number; team2: number }[];
}

// ============= Draw System Types =============

export type DrawPhase = "groups" | "knockout";

export interface DrawState {
  phase: DrawPhase;
  isComplete: boolean;
  currentPotIndex: number;
  currentTeamIndex: number;
  drawnTeams: { teamId: string; potId: string; groupId?: string; position?: number }[];
  remainingTeams: { teamId: string; potId: string }[];
  pots: DrawPot[];
  groups?: Group[];
}

export interface DrawAnimation {
  type: "pick_ball" | "reveal_team" | "assign_group" | "complete";
  teamId?: string;
  groupId?: string;
  delay: number;
}

// ============= Competition State =============

export interface CompetitionState {
  config: CompetitionConfig;
  phase: "setup" | "draw" | "qualifying" | "groups" | "knockout" | "complete";
  
  // Phase data
  drawState?: DrawState;
  groups?: Group[];
  qualifyingMatches?: KnockoutMatch[];
  qualifyingSeries?: KnockoutSeries[];
  knockoutMatches?: KnockoutMatch[];
  knockoutSeries?: KnockoutSeries[];
  
  // Qualified teams for next phase
  qualifiedFromQualifying?: string[];
  qualifiedFromGroups?: string[];
  thirdPlaceRanking?: ThirdPlaceTeam[];
  
  // Champion
  championId?: string | null;
}

// ============= Helper Functions =============

export const getCompetitionTypeName = (type: CompetitionType): string => {
  const names: Record<CompetitionType, string> = {
    league: "Liga",
    league_playoffs: "Liga + Playoffs",
    knockout: "Eliminatoria Directa",
    groups_knockout: "Grupos + Eliminatoria",
    qualifying_groups_knockout: "Fase Previa + Grupos + Eliminatoria",
  };
  return names[type];
};

export const getKnockoutRoundName = (round: KnockoutRound): string => {
  const names: Record<KnockoutRound, string> = {
    preliminary_1: "Fase Previa 1",
    preliminary_2: "Fase Previa 2", 
    preliminary_3: "Fase Previa 3",
    round_of_64: "64avos de Final",
    round_of_32: "32avos de Final",
    round_of_16: "Octavos de Final",
    quarterfinals: "Cuartos de Final",
    semifinals: "Semifinales",
    final: "Final",
  };
  return names[round];
};

export const getMatchFormatName = (format: MatchFormat): string => {
  const names: Record<MatchFormat, string> = {
    single: "Solo ida",
    double: "Ida y vuelta",
    neutral: "Partido único (neutral)",
  };
  return names[format];
};

export const getQualificationRuleName = (rule: QualificationRule): string => {
  const names: Record<QualificationRule, string> = {
    first_only: "Solo primeros de grupo",
    first_second: "1° y 2° de cada grupo",
    first_second_best_thirds: "1°, 2° y mejores terceros",
  };
  return names[rule];
};

// Calculate number of teams needed for knockout based on qualified teams
export const calculateKnockoutTeams = (
  numGroups: number, 
  rule: QualificationRule, 
  bestThirds?: number
): number => {
  switch (rule) {
    case "first_only":
      return numGroups;
    case "first_second":
      return numGroups * 2;
    case "first_second_best_thirds":
      return numGroups * 2 + (bestThirds || 0);
  }
};

// Get next power of 2 for bracket size
export const getNextPowerOf2 = (n: number): number => {
  let power = 1;
  while (power < n) power *= 2;
  return power;
};

// Calculate number of byes needed
export const calculateByes = (totalTeams: number): number => {
  const bracketSize = getNextPowerOf2(totalTeams);
  return bracketSize - totalTeams;
};

// Generate group letter from index
export const getGroupLetter = (index: number): string => {
  return String.fromCharCode(65 + index); // A, B, C, ...
};

// Validate team count for groups (must be multiple of 4)
export const isValidGroupsTeamCount = (numTeams: number): boolean => {
  return numTeams >= 4 && numTeams % 4 === 0;
};

// Validate team count for knockout (must be even, ideally power of 2)
export const isValidKnockoutTeamCount = (numTeams: number): boolean => {
  return numTeams >= 2 && numTeams % 2 === 0;
};

// Check if number is power of 2
export const isPowerOf2 = (n: number): boolean => {
  return n > 0 && (n & (n - 1)) === 0;
};
