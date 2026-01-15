import { useState, useEffect } from "react";
import { Team } from "@/types/game";
import { KnockoutMatch, KnockoutSeries, MatchFormat } from "@/types/competition";
import { Dice } from "./Dice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Dices, CheckCircle2, RefreshCw, Shield, Home, Plane, Flag, Trophy } from "lucide-react";

interface KnockoutMatchSimulatorProps {
  match: KnockoutMatch | null;
  series: KnockoutSeries | null;
  roundName: string;
  getTeamById: (id: string | null) => Team | undefined;
  onSimulate: (matchId: string) => KnockoutMatchResult | null;
  onConfirm: (matchId: string, result: KnockoutMatchResult) => void;
  onClose: () => void;
  matchFormat: MatchFormat;
  isSecondLeg?: boolean;
  leg1Result?: { team1Goals: number; team2Goals: number } | null;
}

export interface KnockoutMatchResult {
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
}

type SimulationPhase = "ready" | "first-roll" | "checking" | "second-roll" | "penalties" | "final";

export const KnockoutMatchSimulator = ({ 
  match, 
  series,
  roundName,
  getTeamById, 
  onSimulate, 
  onConfirm, 
  onClose,
  matchFormat,
  isSecondLeg = false,
  leg1Result,
}: KnockoutMatchSimulatorProps) => {
  const [phase, setPhase] = useState<SimulationPhase>("ready");
  const [result, setResult] = useState<KnockoutMatchResult | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (match) {
      setPhase("ready");
      setResult(null);
    }
  }, [match]);

  if (!match || !series) return null;

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);
  
  if (!team1 || !team2) return null;

  const isNeutral = match.isNeutralVenue;
  const levelDiff = Math.abs(team1.level - team2.level);
  const strongerTeam = team1.level < team2.level ? team1 : team2;
  const isStrongerTeam1 = team1.level < team2.level;

  // Calculate aggregate if second leg
  // In second leg: match.team1 = series.team2, match.team2 = series.team1
  // So we need to swap the aggregates for display
  let matchTeam1PreviousGoals = 0;
  let matchTeam2PreviousGoals = 0;
  if (isSecondLeg) {
    // match.team1 (home in vuelta) = series.team2, so show series.team2Aggregate
    // match.team2 (away in vuelta) = series.team1, so show series.team1Aggregate
    matchTeam1PreviousGoals = series.team2Aggregate || 0;
    matchTeam2PreviousGoals = series.team1Aggregate || 0;
  }

  const handleRoll = async () => {
    if (phase === "ready") {
      setRolling(true);
      setPhase("first-roll");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const simResult = onSimulate(match.id);
      if (simResult) {
        setResult(simResult);
        setRolling(false);
        
        if (simResult.requiredSecondRoll) {
          setPhase("checking");
        } else if (simResult.penalties) {
          setPhase("penalties");
        } else {
          setPhase("final");
        }
      }
    } else if (phase === "checking") {
      setRolling(true);
      setPhase("second-roll");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      setRolling(false);
      
      if (result?.penalties) {
        setPhase("penalties");
      } else {
        setPhase("final");
      }
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
      case "penalties":
        return "¡Definición por penales!";
      case "final":
        return "¡Partido finalizado!";
    }
  };

  const getLevelAdvantageInfo = () => {
    if (isNeutral) {
      if (levelDiff === 0) {
        return { text: "Cancha neutral - Mismo nivel", color: "text-muted-foreground" };
      } else {
        return { 
          text: `Cancha neutral - ${strongerTeam.name} tiene ventaja (${levelDiff} nivel${levelDiff > 1 ? 'es' : ''})`, 
          color: "text-amber-500" 
        };
      }
    }
    
    if (levelDiff === 0) {
      return { text: "Mismo nivel - Sin ventajas", color: "text-muted-foreground" };
    } else if (levelDiff === 1) {
      if (isStrongerTeam1) {
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
  const showSecondRoll = (phase === "second-roll" || phase === "penalties" || phase === "final") && result?.secondRoll;

  // Determine winner display
  const getWinnerDisplay = () => {
    if (!result?.winnerId) return null;
    const winner = getTeamById(result.winnerId);
    return winner?.name || "Por definir";
  };

  return (
    <Dialog open={!!match} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {roundName} {isSecondLeg ? "- Vuelta" : matchFormat !== "single" && matchFormat !== "neutral" ? "- Ida" : ""}
          </DialogTitle>
        </DialogHeader>

         <ScrollArea className="flex-1 min-h-0">
         <div className="space-y-6 pr-4 pb-6">
          {/* Teams Display */}
          <div className="flex items-center justify-between gap-4 p-4 bg-secondary/50 rounded-xl">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {isNeutral ? (
                  <Flag className="w-4 h-4 text-amber-500" />
                ) : (
                  <Home className="w-4 h-4 text-primary" />
                )}
                <Badge variant="outline" className={cn(
                  "text-xs",
                  team1.level === 1 && "bg-yellow-500/20 border-yellow-500",
                  team1.level === 2 && "bg-blue-500/20 border-blue-500",
                  team1.level === 3 && "bg-gray-500/20 border-gray-500",
                  team1.level === 4 && "bg-red-500/20 border-red-500",
                )}>
                  Nivel {team1.level}
                </Badge>
              </div>
              <p className="font-display text-xl font-bold">{team1.name}</p>
              <span className="text-xs text-muted-foreground">
                {isNeutral ? "Neutral" : "Local"}
              </span>
              {isSecondLeg && (
                <div className="text-sm text-muted-foreground mt-1">
                  Ida: {matchTeam1PreviousGoals}
                </div>
              )}
            </div>
            
            <div className="text-3xl font-display text-muted-foreground">VS</div>
            
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Plane className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline" className={cn(
                  "text-xs",
                  team2.level === 1 && "bg-yellow-500/20 border-yellow-500",
                  team2.level === 2 && "bg-blue-500/20 border-blue-500",
                  team2.level === 3 && "bg-gray-500/20 border-gray-500",
                  team2.level === 4 && "bg-red-500/20 border-red-500",
                )}>
                  Nivel {team2.level}
                </Badge>
              </div>
              <p className="font-display text-xl font-bold">{team2.name}</p>
              <span className="text-xs text-muted-foreground">Visita</span>
              {isSecondLeg && (
                <div className="text-sm text-muted-foreground mt-1">
                  Ida: {matchTeam2PreviousGoals}
                </div>
              )}
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
                    value={showFirstRoll ? result.firstRoll.team1 : null} 
                    rolling={rolling && phase === "first-roll"}
                    size="lg"
                    variant="home"
                  />
                  <span className="text-sm font-medium">{team1.name}</span>
                  {showFirstRoll && (
                    <span className="font-display text-2xl text-primary">
                      {result.firstRoll.team1 - 1} goles
                    </span>
                  )}
                </div>
                
                <div className="text-2xl text-muted-foreground">-</div>
                
                <div className="flex flex-col items-center gap-2">
                  <Dice 
                    value={showFirstRoll ? result.firstRoll.team2 : null} 
                    rolling={rolling && phase === "first-roll"}
                    size="lg"
                    variant="away"
                  />
                  <span className="text-sm font-medium">{team2.name}</span>
                  {showFirstRoll && (
                    <span className="font-display text-2xl text-primary">
                      {result.firstRoll.team2 - 1} goles
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
                      value={showSecondRoll ? result.secondRoll!.team1 : null} 
                      rolling={rolling && phase === "second-roll"}
                      size="lg"
                      variant="home"
                    />
                    <span className="text-sm font-medium">{team1.name}</span>
                    {showSecondRoll && (
                      <span className="font-display text-2xl text-gold-dark">
                        {result.secondRoll!.team1 - 1} goles
                      </span>
                    )}
                  </div>
                  
                  <div className="text-2xl text-muted-foreground">-</div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <Dice 
                      value={showSecondRoll ? result.secondRoll!.team2 : null} 
                      rolling={rolling && phase === "second-roll"}
                      size="lg"
                      variant="away"
                    />
                    <span className="text-sm font-medium">{team2.name}</span>
                    {showSecondRoll && (
                      <span className="font-display text-2xl text-gold-dark">
                        {result.secondRoll!.team2 - 1} goles
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Penalties Display */}
            {(phase === "penalties" || phase === "final") && result?.penalties && (
              <div className="p-6 bg-purple-500/10 rounded-xl border-2 border-purple-500/30 animate-slide-up">
                <div className="text-sm font-medium text-center mb-4 text-purple-600 flex items-center justify-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Tanda de Penales
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <span className="text-sm font-medium">{team1.name}</span>
                    <div className="font-display text-4xl text-purple-600">
                      {result.penalties.team1Penalties}
                    </div>
                  </div>
                  <div className="text-2xl text-muted-foreground">-</div>
                  <div className="text-center">
                    <span className="text-sm font-medium">{team2.name}</span>
                    <div className="font-display text-4xl text-purple-600">
                      {result.penalties.team2Penalties}
                    </div>
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
                <span className="font-display text-5xl">{result.team1Goals}</span>
                <span className="text-2xl opacity-50">-</span>
                <span className="font-display text-5xl">{result.team2Goals}</span>
              </div>
              {result.winnerId && (
                <div className="mt-2 text-sm opacity-80 flex items-center justify-center gap-2">
                  <Trophy className="w-4 h-4" />
                  ¡{getWinnerDisplay()} avanza!
                </div>
              )}
              {!result.winnerId && !isSecondLeg && matchFormat !== "single" && matchFormat !== "neutral" && (
                <div className="mt-2 text-sm opacity-80">
                  Serie continúa en la vuelta
                </div>
              )}
            </div>
          )}

           {/* Status Message */}
           <div className="text-center text-sm text-muted-foreground">
             {getPhaseMessage()}
           </div>
         </div>
         </ScrollArea>

         {/* Actions (fixed footer) */}
         <div className="flex justify-center gap-3 pt-4 border-t bg-background flex-shrink-0">
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
       </DialogContent>
     </Dialog>
   );
 };
