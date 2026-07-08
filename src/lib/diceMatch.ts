// Shared dice-simulation rules used by every match type (league, group stage,
// knockout, playoffs). Keeping this logic in one place means a rule change or
// bug fix (like "keep the best of two rolls for the favorite") only needs to
// happen once instead of being copy-pasted across several files.
//
// Convention: "team1" is always the team that would be considered "home" for
// this specific match/leg (in neutral-venue matches there is no home side, so
// this only matters for the 1-level-difference rule below).

export const rollDie = (): number => Math.floor(Math.random() * 6) + 1;

export const dieToGoals = (die: number): number => die - 1;

export interface NeedsSecondRollParams {
  team1Level: number;
  team2Level: number;
  team1Goals: number;
  team2Goals: number;
  /** Neutral venue: no home advantage, but level advantage still applies. */
  isNeutral?: boolean;
  /**
   * Whether a draw counts as "the stronger team failed to win" (and therefore
   * grants a second roll). True everywhere except one legacy Liga playoff
   * rule (neutral-venue finals), which only grants a second roll on an
   * outright loss, not a draw. Defaults to true.
   */
  drawCountsAsNotWinning?: boolean;
}

/**
 * Determines whether the stronger team (by level) gets a second dice roll
 * because they didn't win the first one. Rules:
 * - Same level: never.
 * - Neutral venue: the stronger team gets a second chance any time they
 *   didn't win (subject to drawCountsAsNotWinning).
 * - 1 level of difference: only if the stronger team is team1 (home) and
 *   didn't win.
 * - 2+ levels of difference: the stronger team always gets a second chance
 *   if they didn't win, regardless of venue.
 */
export const needsSecondRoll = ({
  team1Level,
  team2Level,
  team1Goals,
  team2Goals,
  isNeutral = false,
  drawCountsAsNotWinning = true,
}: NeedsSecondRollParams): boolean => {
  const levelDiff = Math.abs(team1Level - team2Level);
  if (levelDiff === 0) return false;

  const strongerIsTeam1 = team1Level < team2Level;
  const strongerGoals = strongerIsTeam1 ? team1Goals : team2Goals;
  const otherGoals = strongerIsTeam1 ? team2Goals : team1Goals;
  const strongerWon = strongerGoals > otherGoals;
  const isDraw = strongerGoals === otherGoals;

  const strongerFailedToWin = drawCountsAsNotWinning ? !strongerWon : !strongerWon && !isDraw;

  if (isNeutral) {
    return strongerFailedToWin;
  }

  if (levelDiff === 1) {
    if (!strongerIsTeam1) return false;
    return strongerFailedToWin;
  }

  return strongerFailedToWin;
};

export interface RollGoals {
  team1Goals: number;
  team2Goals: number;
}

/**
 * Given the two rolls of a match that required a second roll, returns
 * whichever is best for the stronger team (win > draw > loss) instead of
 * always taking the second roll.
 */
export const pickBetterRollForStrongerTeam = (
  team1Level: number,
  team2Level: number,
  roll1: RollGoals,
  roll2: RollGoals
): RollGoals => {
  const strongerIsTeam1 = team1Level < team2Level;
  const diff1 = strongerIsTeam1 ? roll1.team1Goals - roll1.team2Goals : roll1.team2Goals - roll1.team1Goals;
  const diff2 = strongerIsTeam1 ? roll2.team1Goals - roll2.team2Goals : roll2.team2Goals - roll2.team1Goals;
  return diff2 > diff1 ? roll2 : roll1;
};
