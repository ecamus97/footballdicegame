import { useState, useEffect } from "react";
import { PlayoffMatch, MatchResult, Team, PlayoffRound, PenaltyResult, PlayoffSeries } from "@/types/game";
import { Dice } from "./Dice";
import { TeamBadge } from "./TeamBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { rollDie, dieToGoals, needsSecondRoll, pickBetterRollForStrongerTeam } from "@/lib/diceMatch";
import { Dices, CheckCircle2, RefreshCw, Target, Crown } from "lucide-react";

interface PlayoffMatchResult extends MatchResult {
  needsPenalties: boolean;
  penalties?: PenaltyResult;
  winnerId?: string;
}

interface PlayoffMatchSimulatorProps {
  match: PlayoffMatch | null;
  series: PlayoffSeries | null;
  leg1Match: PlayoffMatch | null; // For second leg, we need first leg info
  getTeamById: (id: string | null) => Team | undefined;
  getPlayoffRoundName: (round: PlayoffRound, leg?: number) => string;
  isSingleLeg: boolean;
  onConfirm: (matchId: string, result: PlayoffMatchResult) => void;
  onClose: () => void;
}

type SimulationPhase = "ready" | "first-roll" | "checking" | "second-roll" | "match-result" | "penalties" | "penalty-roll" | "final";

export const PlayoffMatchSimulator = ({ 
  match, 
  series,
  leg1Match,
  getTeamById, 
  getPlayoffRoundName,
  isSingleLeg,
  onConfirm, 
  onClose 
}: PlayoffMatchSimulatorProps) => {
  const [phase, setPhase] = useState<SimulationPhase>("ready");
  const [result, setResult] = useState<PlayoffMatchResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [penaltyRounds, setPenaltyRounds] = useState<{ team1: number; team2: number }[]>([]);
  const [currentPenaltyRoll, setCurrentPenaltyRoll] = useState<{ team1: number | null; team2: number | null }>({ team1: null, team2: null });

  useEffect(() => {
    if (match) {
      setPhase("ready");
      setResult(null);
      setPenaltyRounds([]);
      setCurrentPenaltyRoll({ team1: null, team2: null });
    }
  }, [match]);

  if (!match || !match.team1Id || !match.team2Id) return null;

  const team1 = getTeamById(match.team1Id)!;
  const team2 = getTeamById(match.team2Id)!;
  const levelDiff = match.isNeutralVenue ? 0 : Math.abs(team1.level - team2.level);
  // Actual level difference regardless of venue (used for display + second-roll rules)
  const actualLevelDiff = Math.abs(team1.level - team2.level);

  // Check if this is a single match series (no return leg)
  const isOnlyLeg = isSingleLeg || (series && !series.leg2Id);
  const isSecondLeg = match.leg === 2;

  // Get leg 1 goals - these are stored as team1Goals/team2Goals of leg1Match
  // In leg 1: team1 of match = lower seed, team2 of match = higher seed
  // In leg 2: team1 of match = higher seed, team2 of match = lower seed
  // The series tracks team1 = higher seed, team2 = lower seed
  const leg1Team1Goals = leg1Match?.team1Goals ?? 0; // Lower seed's home goals
  const leg1Team2Goals = leg1Match?.team2Goals ?? 0; // Higher seed's away goals

  const checkNeedsPenalties = (team1Goals: number, team2Goals: number): boolean => {
    // Single leg or final with no return leg: tie goes to penalties
    if (isOnlyLeg) {
      return team1Goals === team2Goals;
    } else if (isSecondLeg && series) {
      // Second leg: check aggregate
      // In leg 2: team1 = series.team1Id (higher seed), team2 = series.team2Id (lower seed)
      // Leg 1 had: team1 = lower seed (home), team2 = higher seed (away)
      // So series.team1 aggregate = leg1Team2Goals (away in leg1) + team1Goals (home in leg2)
      // And series.team2 aggregate = leg1Team1Goals (home in leg1) + team2Goals (away in leg2)
      const seriesTeam1Aggregate = leg1Team2Goals + team1Goals;
      const seriesTeam2Aggregate = leg1Team1Goals + team2Goals;
      
      return seriesTeam1Aggregate === seriesTeam2Aggregate;
    }
    return false;
  };

  const handleRoll = async () => {
    if (phase === "ready") {
      setRolling(true);
      setPhase("first-roll");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const firstTeam1Roll = rollDie();
      const firstTeam2Roll = rollDie();
      const firstTeam1Goals = dieToGoals(firstTeam1Roll);
      const firstTeam2Goals = dieToGoals(firstTeam2Roll);
      
      const requiresSecond = needsSecondRoll({
        team1Level: team1.level,
        team2Level: team2.level,
        team1Goals: firstTeam1Goals,
        team2Goals: firstTeam2Goals,
        isNeutral: match.isNeutralVenue,
      });
      
      const newResult: PlayoffMatchResult = {
        homeGoals: firstTeam1Goals,
        awayGoals: firstTeam2Goals,
        firstRoll: { home: firstTeam1Roll, away: firstTeam2Roll },
        requiredSecondRoll: requiresSecond,
        needsPenalties: false,
      };
      
      setResult(newResult);
      setRolling(false);
      
      if (requiresSecond) {
        setPhase("checking");
      } else {
        // Check if penalties needed
        if (checkNeedsPenalties(firstTeam1Goals, firstTeam2Goals)) {
          newResult.needsPenalties = true;
          setResult(newResult);
          setPhase("match-result");
        } else {
          setPhase("final");
        }
      }
    } else if (phase === "checking") {
      setRolling(true);
      setPhase("second-roll");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const secondTeam1Roll = rollDie();
      const secondTeam2Roll = rollDie();
      const secondTeam1Goals = dieToGoals(secondTeam1Roll);
      const secondTeam2Goals = dieToGoals(secondTeam2Roll);

      // Keep whichever roll is best for the stronger team (win > draw > loss),
      // not simply the second roll
      const best = pickBetterRollForStrongerTeam(
        team1.level,
        team2.level,
        { team1Goals: result!.homeGoals, team2Goals: result!.awayGoals },
        { team1Goals: secondTeam1Goals, team2Goals: secondTeam2Goals }
      );
      const finalTeam1Goals = best.team1Goals;
      const finalTeam2Goals = best.team2Goals;

      const newResult: PlayoffMatchResult = {
        ...result!,
        homeGoals: finalTeam1Goals,
        awayGoals: finalTeam2Goals,
        secondRoll: { home: secondTeam1Roll, away: secondTeam2Roll },
        needsPenalties: checkNeedsPenalties(finalTeam1Goals, finalTeam2Goals),
      };
      
      setResult(newResult);
      setRolling(false);
      
      if (newResult.needsPenalties) {
        setPhase("match-result");
      } else {
        setPhase("final");
      }
    }
  };

  const handleStartPenalties = () => {
    setPhase("penalties");
  };

  const handlePenaltyRoll = async () => {
    setRolling(true);
    setPhase("penalty-roll");
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const team1Die = rollDie();
    const team2Die = rollDie();
    // Apply same logic as matches: die - 1 = converted penalties
    const team1Pen = dieToGoals(team1Die);
    const team2Pen = dieToGoals(team2Die);
    
    setCurrentPenaltyRoll({ team1: team1Die, team2: team2Die });
    setRolling(false);
    
    // Check if there's a winner (compare converted penalties, not dice)
    if (team1Pen !== team2Pen) {
      const newRounds = [...penaltyRounds, { team1: team1Die, team2: team2Die }];
      setPenaltyRounds(newRounds);
      
      // Calculate total converted penalties
      const team1Total = newRounds.reduce((sum, r) => sum + dieToGoals(r.team1), 0);
      const team2Total = newRounds.reduce((sum, r) => sum + dieToGoals(r.team2), 0);
      
      const winnerId = team1Pen > team2Pen ? match.team1Id : match.team2Id;
      
      setResult(prev => ({
        ...prev!,
        penalties: {
          team1Penalties: team1Total,
          team2Penalties: team2Total,
          rounds: newRounds,
        },
        winnerId: winnerId!,
      }));
      
      setPhase("final");
    } else {
      // Tie - need another round
      setPenaltyRounds(prev => [...prev, { team1: team1Die, team2: team2Die }]);
      setPhase("penalties");
    }
  };

  const handleConfirm = () => {
    if (result) {
      onConfirm(match.id, result);
      onClose();
    }
  };

  const getPhaseMessage = () => {
    switch (phase) {
      case "ready":
        return "Presiona para lanzar los dados";
      case "first-roll":
        return "Lanzando dados...";
      case "checking":
        return result?.requiredSecondRoll 
          ? "¡El equipo fuerte no ganó! Segundo lanzamiento disponible"
          : "Evaluando resultado...";
      case "second-roll":
        return "Segundo lanzamiento...";
      case "match-result":
        return "¡Empate! Se van a penales";
      case "penalties":
        return penaltyRounds.length > 0 
          ? `¡Empate en penales! Ronda ${penaltyRounds.length + 1}`
          : "Tanda de penales - Lanza los dados";
      case "penalty-roll":
        return "Lanzando penales...";
      case "final":
        return "¡Partido finalizado!";
    }
  };

  const showFirstRoll = phase !== "ready" && result;
  const showSecondRoll = (phase === "second-roll" || ["match-result", "penalties", "penalty-roll", "final"].includes(phase)) && result?.secondRoll;
  const showPenalties = ["penalties", "penalty-roll", "final"].includes(phase) && (penaltyRounds.length > 0 || currentPenaltyRoll.team1 !== null);

  // Calculate aggregate display for second leg
  // Shows aggregate from perspective of current match teams (team1 vs team2)
  const getAggregateDisplay = () => {
    if (!isSecondLeg || !result || !series || !leg1Match) return null;
    
    // In this match (leg 2): match.team1Id = higher seed (home), match.team2Id = lower seed (away)
    // In leg 1: leg1Match.team1Id = lower seed (home), leg1Match.team2Id = higher seed (away)
    // So for current match perspective:
    // - Current team1 (higher seed) scored: leg1Match.team2Goals (away in leg1) + result.homeGoals (home in leg2)
    // - Current team2 (lower seed) scored: leg1Match.team1Goals (home in leg1) + result.awayGoals (away in leg2)
    const currentTeam1Agg = (leg1Match.team2Goals || 0) + result.homeGoals;
    const currentTeam2Agg = (leg1Match.team1Goals || 0) + result.awayGoals;
    
    return { team1: currentTeam1Agg, team2: currentTeam2Agg };
  };

  const aggregate = getAggregateDisplay();

  return (
    <Dialog open={!!match} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Crown className="w-6 h-6 text-purple-500" />
            {getPlayoffRoundName(match.round, match.leg)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Teams Display */}
          <div className="flex items-center justify-between gap-8 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <div className="flex-1">
              <TeamBadge team={team1} size="lg" align="left" />
              <span className="text-xs text-muted-foreground mt-1 block">
                {match.isNeutralVenue ? "Neutral" : "Local"}
              </span>
            </div>
            <div className="text-3xl font-display text-muted-foreground">VS</div>
            <div className="flex-1">
              <TeamBadge team={team2} size="lg" align="right" />
              <span className="text-xs text-muted-foreground mt-1 block text-right">
                {match.isNeutralVenue ? "Neutral" : "Visita"}
              </span>
            </div>
          </div>

          {/* First Leg Info (for second leg) */}
          {isSecondLeg && leg1Match && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                Resultado Ida: <span className="font-bold">{leg1Match.team1Goals} - {leg1Match.team2Goals}</span>
              </span>
            </div>
          )}

          {/* Level Info */}
          <div className="text-center text-sm text-muted-foreground">
            {actualLevelDiff === 0 ? (
              <span>Mismo nivel - Sin ventajas {match.isNeutralVenue && "🏟️"}</span>
            ) : match.isNeutralVenue ? (
              <span>
                🏟️ Cancha Neutral - {team1.level < team2.level ? team1.name : team2.name} tiene ventaja por nivel
              </span>
            ) : actualLevelDiff === 1 ? (
              <span>
                1 nivel de diferencia - {team1.level < team2.level 
                  ? "Local tiene ventaja si no gana" 
                  : "Sin ventaja para el visitante fuerte"}
              </span>
            ) : (
              <span>
                {actualLevelDiff}+ niveles de diferencia - {team1.level < team2.level ? team1.name : team2.name} tiene ventaja
              </span>
            )}
          </div>

          {/* Dice Area */}
          <div className="space-y-4">
            {/* First Roll */}
            <div className={cn(
              "p-6 bg-pitch/10 rounded-xl border-2 border-dashed transition-all",
              showFirstRoll ? "border-primary/30" : "border-border"
            )}>
              <div className="text-sm font-medium text-center mb-4 text-muted-foreground">
                Primer Lanzamiento
              </div>
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Dice 
                    value={showFirstRoll ? result.firstRoll.home : null} 
                    rolling={rolling && phase === "first-roll"}
                    size="lg"
                    variant="home"
                  />
                  <span className="text-sm font-medium">{team1.shortName}</span>
                  {showFirstRoll && (
                    <span className="font-display text-2xl text-primary">
                      {result.firstRoll.home - 1} goles
                    </span>
                  )}
                </div>
                
                <div className="text-2xl text-muted-foreground">-</div>
                
                <div className="flex flex-col items-center gap-2">
                  <Dice 
                    value={showFirstRoll ? result.firstRoll.away : null} 
                    rolling={rolling && phase === "first-roll"}
                    size="lg"
                    variant="away"
                  />
                  <span className="text-sm font-medium">{team2.shortName}</span>
                  {showFirstRoll && (
                    <span className="font-display text-2xl text-primary">
                      {result.firstRoll.away - 1} goles
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Second Roll (conditional) */}
            {(phase === "checking" || showSecondRoll) && (
              <div className={cn(
                "p-6 bg-gold/10 rounded-xl border-2 border-dashed transition-all animate-slide-up",
                showSecondRoll ? "border-gold/50" : "border-gold/30"
              )}>
                <div className="text-sm font-medium text-center mb-4 text-gold-dark flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Segundo Lanzamiento (Ventaja)
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <Dice 
                      value={showSecondRoll ? result!.secondRoll!.home : null} 
                      rolling={rolling && phase === "second-roll"}
                      size="lg"
                      variant="home"
                    />
                    <span className="text-sm font-medium">{team1.shortName}</span>
                    {showSecondRoll && (
                      <span className="font-display text-2xl text-gold-dark">
                        {result!.secondRoll!.home - 1} goles
                      </span>
                    )}
                  </div>
                  
                  <div className="text-2xl text-muted-foreground">-</div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <Dice 
                      value={showSecondRoll ? result!.secondRoll!.away : null} 
                      rolling={rolling && phase === "second-roll"}
                      size="lg"
                      variant="away"
                    />
                    <span className="text-sm font-medium">{team2.shortName}</span>
                    {showSecondRoll && (
                      <span className="font-display text-2xl text-gold-dark">
                        {result!.secondRoll!.away - 1} goles
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Penalties Section */}
            {showPenalties && (
              <div className={cn(
                "p-6 bg-red-500/10 rounded-xl border-2 border-red-500/30 transition-all animate-slide-up"
              )}>
                <div className="text-sm font-medium text-center mb-4 text-red-600 flex items-center justify-center gap-2">
                  <Target className="w-4 h-4" />
                  Tanda de Penales
                </div>
                
                {/* Previous penalty rounds */}
                {penaltyRounds.map((round, idx) => {
                  const t1Conv = dieToGoals(round.team1);
                  const t2Conv = dieToGoals(round.team2);
                  return (
                    <div key={idx} className="flex items-center justify-center gap-8 mb-2 p-2 bg-background/50 rounded">
                      <span className="text-sm text-muted-foreground">Ronda {idx + 1}:</span>
                      <span className={cn("font-bold", t1Conv > t2Conv && "text-green-600")}>
                        {team1.shortName}: {t1Conv} (dado: {round.team1})
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className={cn("font-bold", t2Conv > t1Conv && "text-green-600")}>
                        {team2.shortName}: {t2Conv} (dado: {round.team2})
                      </span>
                    </div>
                  );
                })}
                
                {/* Current penalty roll */}
                {(phase === "penalties" || phase === "penalty-roll") && (
                  <div className="flex items-center justify-center gap-8 mt-4">
                    <div className="flex flex-col items-center gap-2">
                      <Dice 
                        value={currentPenaltyRoll.team1} 
                        rolling={rolling && phase === "penalty-roll"}
                        size="lg"
                        variant="home"
                      />
                      <span className="text-sm font-medium">{team1.shortName}</span>
                    </div>
                    
                    <div className="text-2xl text-muted-foreground">-</div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <Dice 
                        value={currentPenaltyRoll.team2} 
                        rolling={rolling && phase === "penalty-roll"}
                        size="lg"
                        variant="away"
                      />
                      <span className="text-sm font-medium">{team2.shortName}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Match Result (before penalties or final) */}
          {(phase === "match-result" || phase === "final") && result && (
            <div className={cn(
              "p-6 rounded-xl text-center animate-slide-up",
              phase === "final" ? "bg-purple-600 text-white" : "bg-secondary"
            )}>
              <div className="text-sm font-medium mb-2 opacity-80">
                {phase === "final" ? "Resultado Final" : "Resultado del Partido"}
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="font-display text-5xl">{result.homeGoals}</span>
                <span className="text-2xl opacity-50">-</span>
                <span className="font-display text-5xl">{result.awayGoals}</span>
              </div>
              
              {/* Aggregate for second leg */}
              {isSecondLeg && aggregate && (
                <div className="mt-2 text-sm opacity-80">
                  Global: {aggregate.team1} - {aggregate.team2}
                </div>
              )}
              
              {/* Penalties result */}
              {result.penalties && (
                <div className="mt-2 text-sm">
                  Penales: {result.penalties.team1Penalties} - {result.penalties.team2Penalties}
                </div>
              )}
              
              {phase === "final" && (
                <div className="mt-2 text-sm opacity-80">
                  {result.winnerId 
                    ? `¡${getTeamById(result.winnerId)?.name} avanza!`
                    : result.homeGoals > result.awayGoals 
                    ? `¡${team1.name} avanza!`
                    : result.awayGoals > result.homeGoals
                    ? `¡${team2.name} avanza!`
                    : "Empate"}
                </div>
              )}
            </div>
          )}

          {/* Status Message */}
          <div className="text-center text-sm text-muted-foreground">
            {getPhaseMessage()}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            {phase === "ready" && (
              <Button onClick={handleRoll} size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Dices className="w-5 h-5" />
                Lanzar Dados
              </Button>
            )}
            
            {phase === "checking" && (
              <Button onClick={handleRoll} size="lg" variant="outline" className="gap-2 border-gold text-gold-dark hover:bg-gold/10">
                <RefreshCw className="w-5 h-5" />
                Segundo Lanzamiento
              </Button>
            )}
            
            {phase === "match-result" && result?.needsPenalties && (
              <Button onClick={handleStartPenalties} size="lg" className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <Target className="w-5 h-5" />
                Ir a Penales
              </Button>
            )}
            
            {phase === "penalties" && (
              <Button onClick={handlePenaltyRoll} size="lg" className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <Dices className="w-5 h-5" />
                Lanzar Penales
              </Button>
            )}
            
            {phase === "final" && (
              <Button onClick={handleConfirm} size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700">
                <CheckCircle2 className="w-5 h-5" />
                Confirmar Resultado
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
