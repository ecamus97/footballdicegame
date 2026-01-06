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
