export type TeamLevel = 1 | 2 | 3 | 4;

export type TournamentFormat = "single" | "double"; // ida o ida y vuelta

export type PlayoffFormat = "none" | "single" | "double" | "final_only";

export interface InternationalCup {
  name: string;
  spots: number;
  color: string; // HSL color class for styling
}

export interface TournamentConfig {
  name: string;
  format: TournamentFormat;
  participatingTeamIds: string[];
  /** Permite cantidad impar de equipos (1 equipo libre por fecha). */
  allowOddTeams?: boolean;
  relegationSpots: number;
  // Playoffs
  playoffsEnabled: boolean;
  playoffsFormat: PlayoffFormat;
  playoffsTeams: number; // Number of teams in playoffs
  // International cups
  internationalCups: InternationalCup[];
  // Promotion/Relegation playoff
  promotionPlayoffEnabled: boolean;
  promotionPlayoffSpots: number; // Number of positions that play promotion/relegation playoff
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  level: TeamLevel;
}

export interface TeamStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Match {
  id: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
  firstRoll?: {
    home: number;
    away: number;
  };
  secondRoll?: {
    home: number;
    away: number;
  };
}

export interface DiceRoll {
  value: number;
  goals: number;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  firstRoll: { home: number; away: number };
  secondRoll?: { home: number; away: number };
  requiredSecondRoll: boolean;
}

// Penalty shootout
export interface PenaltyResult {
  team1Penalties: number;
  team2Penalties: number;
  rounds: { team1: number; team2: number }[]; // Each round of penalties
}

// Playoff types
export type PlayoffRound = "quarterfinals" | "semifinals" | "final";

export interface PlayoffMatch {
  id: string;
  round: PlayoffRound;
  matchNumber: number; // Position within round (1, 2, 3, 4 for quarterfinals)
  leg: 1 | 2; // First leg or second leg
  team1Id: string | null;
  team2Id: string | null;
  team1Goals: number | null;
  team2Goals: number | null;
  played: boolean;
  isNeutralVenue: boolean;
  firstRoll?: { home: number; away: number };
  secondRoll?: { home: number; away: number };
  penalties?: PenaltyResult; // For matches decided by penalties
}

export interface PlayoffSeries {
  id: string;
  round: PlayoffRound;
  matchNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number; // Original position in standings
  team2Seed: number;
  leg1Id: string | null;
  leg2Id: string | null; // null for single-leg format
  winnerId: string | null;
  team1Aggregate: number;
  team2Aggregate: number;
}
