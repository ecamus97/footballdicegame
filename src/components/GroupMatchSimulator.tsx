import { useState, useEffect } from "react";
import { Team } from "@/types/game";
import { GroupMatch } from "@/types/competition";
import { Dice } from "./Dice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Dices, CheckCircle2, RefreshCw, Shield, Home, Plane } from "lucide-react";

interface GroupMatchSimulatorProps {
  match: GroupMatch | null;
  groupName: string;
  getTeamById: (id: string | null) => Team | undefined;
  onSimulate: (matchId: string) => GroupMatchResult | null;
  onConfirm: (matchId: string, result: GroupMatchResult) => void;
  onClose: () => void;
}

export interface GroupMatchResult {
  homeGoals: number;
  awayGoals: number;
  firstRoll: { home: number; away: number };
  secondRoll?: { home: number; away: number };
  requiredSecondRoll: boolean;
}

type SimulationPhase = "ready" | "first-roll" | "checking" | "second-roll" | "final";

export const GroupMatchSimulator = ({ 
  match, 
  groupName,
  getTeamById, 
  onSimulate, 
  onConfirm, 
  onClose 
}: GroupMatchSimulatorProps) => {
  const [phase, setPhase] = useState<SimulationPhase>("ready");
  const [result, setResult] = useState<GroupMatchResult | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (match) {
      setPhase("ready");
      setResult(null);
    }
  }, [match]);

  if (!match) return null;

  const homeTeam = getTeamById(match.homeTeamId);
  const awayTeam = getTeamById(match.awayTeamId);
  
  if (!homeTeam || !awayTeam) return null;

  const levelDiff = Math.abs(homeTeam.level - awayTeam.level);
  const strongerTeam = homeTeam.level < awayTeam.level ? homeTeam : awayTeam;
  const isStrongerHome = homeTeam.level < awayTeam.level;

  const handleRoll = async () => {
    if (phase === "ready") {
      setRolling(true);
      setPhase("first-roll");
      
      // Simulate rolling animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
      
      await new Promise(resolve => setTimeout(resolve, 800));
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
        return result?.requiredSecondRoll 
          ? `¡${strongerTeam.name} no ganó! Segundo lanzamiento disponible`
          : "Evaluando resultado...";
      case "second-roll":
        return "Segundo lanzamiento...";
      case "final":
        return "¡Partido finalizado!";
    }
  };

  const getLevelAdvantageInfo = () => {
    if (levelDiff === 0) {
      return { text: "Mismo nivel - Sin ventajas", color: "text-muted-foreground" };
    } else if (levelDiff === 1) {
      if (isStrongerHome) {
        return { 
          text: `${strongerTeam.name} (Local) tiene ventaja si no gana`, 
          color: "text-amber-500" 
        };
      } else {
        return { 
          text: `Sin ventaja (Visitante más fuerte pero diferencia es solo 1 nivel)`, 
          color: "text-muted-foreground" 
        };
      }
    } else {
      return { 
        text: `${strongerTeam.name} tiene ventaja (${levelDiff} niveles de diferencia)`, 
        color: "text-green-500" 
      };
    }
  };

  const advantageInfo = getLevelAdvantageInfo();
  const showFirstRoll = phase !== "ready" && result;
  const showSecondRoll = (phase === "second-roll" || phase === "final") && result?.secondRoll;

  return (
    <Dialog open={!!match} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {groupName} - Fecha {match.matchday}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {/* Teams Display */}
          <div className="flex items-center justify-between gap-4 p-4 bg-secondary/50 rounded-xl">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Home className="w-4 h-4 text-primary" />
                <Badge variant="outline" className={cn(
                  "text-xs",
                  homeTeam.level === 1 && "bg-yellow-500/20 border-yellow-500",
                  homeTeam.level === 2 && "bg-blue-500/20 border-blue-500",
                  homeTeam.level === 3 && "bg-gray-500/20 border-gray-500",
                  homeTeam.level === 4 && "bg-red-500/20 border-red-500",
                )}>
                  Nivel {homeTeam.level}
                </Badge>
              </div>
              <p className="font-display text-xl font-bold">{homeTeam.name}</p>
              <span className="text-xs text-muted-foreground">Local</span>
            </div>
            
            <div className="text-3xl font-display text-muted-foreground">VS</div>
            
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Plane className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline" className={cn(
                  "text-xs",
                  awayTeam.level === 1 && "bg-yellow-500/20 border-yellow-500",
                  awayTeam.level === 2 && "bg-blue-500/20 border-blue-500",
                  awayTeam.level === 3 && "bg-gray-500/20 border-gray-500",
                  awayTeam.level === 4 && "bg-red-500/20 border-red-500",
                )}>
                  Nivel {awayTeam.level}
                </Badge>
              </div>
              <p className="font-display text-xl font-bold">{awayTeam.name}</p>
              <span className="text-xs text-muted-foreground">Visita</span>
            </div>
          </div>

          {/* Level Info */}
          <div className={cn("text-center text-sm", advantageInfo.color)}>
            {advantageInfo.text}
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
                  <span className="text-sm font-medium">{homeTeam.name}</span>
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
                  <span className="text-sm font-medium">{awayTeam.name}</span>
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
                  Segundo Lanzamiento (Ventaja de {strongerTeam.name})
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <Dice 
                      value={showSecondRoll ? result.secondRoll!.home : null} 
                      rolling={rolling && phase === "second-roll"}
                      size="lg"
                      variant="home"
                    />
                    <span className="text-sm font-medium">{homeTeam.name}</span>
                    {showSecondRoll && (
                      <span className="font-display text-2xl text-gold-dark">
                        {result.secondRoll!.home - 1} goles
                      </span>
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
                    <span className="text-sm font-medium">{awayTeam.name}</span>
                    {showSecondRoll && (
                      <span className="font-display text-2xl text-gold-dark">
                        {result.secondRoll!.away - 1} goles
                      </span>
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
          <div className="text-center text-sm text-muted-foreground">
            {getPhaseMessage()}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            {phase === "ready" && (
              <Button onClick={handleRoll} size="lg" className="gap-2 pulse-gold">
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
