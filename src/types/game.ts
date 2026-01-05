export type TeamLevel = 1 | 2 | 3 | 4;

export type TournamentFormat = "single" | "double"; // ida o ida y vuelta

export interface TournamentConfig {
  name: string;
  format: TournamentFormat;
  participatingTeamIds: string[];
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
