import { useState, useEffect } from "react";
import { Match, MatchResult, Team } from "@/types/game";
import { Dice } from "./Dice";
import { TeamBadge } from "./TeamBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Dices, CheckCircle2, RefreshCw } from "lucide-react";

interface MatchSimulatorProps {
  match: Match | null;
  getTeamById: (id: string | null) => Team | undefined;
  onSimulate: (matchId: string) => MatchResult | null;
  onConfirm: (matchId: string, result: MatchResult) => void;
  onClose: () => void;
}

type SimulationPhase = "ready" | "first-roll" | "checking" | "second-roll" | "final";

export const MatchSimulator = ({ match, getTeamById, onSimulate, onConfirm, onClose }: MatchSimulatorProps) => {
  const [phase, setPhase] = useState<SimulationPhase>("ready");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (match) {
      setPhase("ready");
      setResult(null);
    }
  }, [match]);

  if (!match) return null;

  const homeTeam = getTeamById(match.homeTeamId)!;
  const awayTeam = getTeamById(match.awayTeamId)!;
  const levelDiff = Math.abs(homeTeam.level - awayTeam.level);

  const handleRoll = async () => {
    if (phase === "ready") {
      setRolling(true);
      setPhase("first-roll");

      // Simulate rolling animation
      await new Promise((resolve) => setTimeout(resolve, 800));

      const simResult = onSimulate(match.id);
      if (simResult) {
        setResult(simResult);
        setRolling(false);

        if (simResult.requiredSecondRoll) {
          setPhase("checking");
        } else {
          setPhase("final");
        }
      }
    } else if (phase === "checking") {
      setRolling(true);
      setPhase("second-roll");

      await new Promise((resolve) => setTimeout(resolve, 800));
      setRolling(false);
      setPhase("final");
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
        return result?.requiredSecondRoll ? "¡El equipo fuerte no ganó! Segundo lanzamiento disponible" : "Evaluando resultado...";
      case "second-roll":
        return "Segundo lanzamiento...";
      case "final":
        return "¡Partido finalizado!";
    }
  };

  const showFirstRoll = phase !== "ready" && result;
  const showSecondRoll = (phase === "second-roll" || phase === "final") && result?.secondRoll;

  return (
    <Dialog open={!!match} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">Fecha {match.matchday}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 pb-4">
            {/* Teams Display */}
            <div className="flex items-center justify-between gap-8 p-4 bg-secondary/50 rounded-xl">
              <div className="flex-1">
                <TeamBadge team={homeTeam} size="lg" align="left" />
                <span className="text-xs text-muted-foreground mt-1 block">Local</span>
              </div>
              <div className="text-3xl font-display text-muted-foreground">VS</div>
              <div className="flex-1">
                <TeamBadge team={awayTeam} size="lg" align="right" />
                <span className="text-xs text-muted-foreground mt-1 block text-right">Visita</span>
              </div>
            </div>

            {/* Level Info */}
            <div className="text-center text-sm text-muted-foreground">
              {levelDiff === 0 ? (
                <span>Mismo nivel - Sin ventajas</span>
              ) : levelDiff === 1 ? (
                <span>
                  1 nivel de diferencia - {homeTeam.level < awayTeam.level ? "Local tiene ventaja si no gana" : "Sin ventaja para el visitante fuerte"}
                </span>
              ) : (
                <span>
                  {levelDiff}+ niveles de diferencia - {homeTeam.level < awayTeam.level ? homeTeam.name : awayTeam.name} tiene ventaja
                </span>
              )}
            </div>

            {/* Dice Area */}
            <div className="space-y-4">
              {/* First Roll */}
              <div
                className={cn(
                  "p-6 bg-pitch/10 rounded-xl border-2 border-dashed transition-all",
                  showFirstRoll ? "border-primary/30" : "border-border",
                )}
              >
                <div className="text-sm font-medium text-center mb-4 text-muted-foreground">Primer Lanzamiento</div>
                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <Dice
                      value={showFirstRoll ? result.firstRoll.home : null}
                      rolling={rolling && phase === "first-roll"}
                      size="lg"
                      variant="home"
                    />
                    <span className="text-sm font-medium">{homeTeam.shortName}</span>
                    {showFirstRoll && (
                      <span className="font-display text-2xl text-primary">{result.firstRoll.home - 1} goles</span>
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
                    <span className="text-sm font-medium">{awayTeam.shortName}</span>
                    {showFirstRoll && (
                      <span className="font-display text-2xl text-primary">{result.firstRoll.away - 1} goles</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Second Roll (conditional) */}
              {(phase === "checking" || showSecondRoll) && (
                <div
                  className={cn(
                    "p-6 bg-gold/10 rounded-xl border-2 border-dashed transition-all animate-slide-up",
                    showSecondRoll ? "border-gold/50" : "border-gold/30",
                  )}
                >
                  <div className="text-sm font-medium text-center mb-4 text-gold-dark flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Segundo Lanzamiento (Ventaja)
                  </div>
                  <div className="flex items-center justify-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Dice
                        value={showSecondRoll ? result.secondRoll!.home : null}
                        rolling={rolling && phase === "second-roll"}
                        size="lg"
                        variant="home"
                      />
                      <span className="text-sm font-medium">{homeTeam.shortName}</span>
                      {showSecondRoll && (
                        <span className="font-display text-2xl text-gold-dark">{result.secondRoll!.home - 1} goles</span>
                      )}
                    </div>

                    <div className="text-2xl text-muted-foreground">-</div>

                    <div className="flex flex-col items-center gap-2">
                      <Dice
                        value={showSecondRoll ? result.secondRoll!.away : null}
                        rolling={rolling && phase === "second-roll"}
                        size="lg"
                        variant="away"
                      />
                      <span className="text-sm font-medium">{awayTeam.shortName}</span>
                      {showSecondRoll && (
                        <span className="font-display text-2xl text-gold-dark">{result.secondRoll!.away - 1} goles</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Final Score */}
            {phase === "final" && result && (
              <div className="p-6 bg-primary text-primary-foreground rounded-xl text-center animate-slide-up">
                <div className="text-sm font-medium mb-2 opacity-80">Resultado Final</div>
                <div className="flex items-center justify-center gap-4">
                  <span className="font-display text-5xl">{result.homeGoals}</span>
                  <span className="text-2xl opacity-50">-</span>
                  <span className="font-display text-5xl">{result.awayGoals}</span>
                </div>
                <div className="mt-2 text-sm opacity-80">
                  {result.homeGoals > result.awayGoals
                    ? `¡Victoria de ${homeTeam.name}!`
                    : result.awayGoals > result.homeGoals
                      ? `¡Victoria de ${awayTeam.name}!`
                      : "¡Empate!"}
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className="text-center text-sm text-muted-foreground">{getPhaseMessage()}</div>

            {/* Actions */}
            <div className="flex justify-center gap-3">
              {phase === "ready" && (
                <Button onClick={handleRoll} size="lg" className="gap-2 pulse-gold">
                  <Dices className="w-5 h-5" />
                  Lanzar Dados
                </Button>
              )}

              {phase === "checking" && (
                <Button
                  onClick={handleRoll}
                  size="lg"
                  variant="outline"
                  className="gap-2 border-gold text-gold-dark hover:bg-gold/10"
                >
                  <RefreshCw className="w-5 h-5" />
                  Segundo Lanzamiento
                </Button>
              )}

              {phase === "final" && (
                <Button onClick={handleConfirm} size="lg" className="gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Resultado
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
