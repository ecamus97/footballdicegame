import { useState, useEffect, useCallback } from "react";
import { DrawState, DrawPot, Group, getGroupLetter } from "@/types/competition";
import { Team } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Shuffle, 
  Play, 
  FastForward, 
  CheckCircle2, 
  CircleDot,
  Sparkles 
} from "lucide-react";

interface VisualDrawProps {
  drawState: DrawState;
  getTeamById: (id: string | null) => Team | undefined;
  onDrawStep: () => { type: string; teamId?: string; groupId?: string } | null;
  onCompleteDraw: () => void;
}

interface DrawnBall {
  teamId: string;
  groupId: string;
  potId: string;
  isAnimating: boolean;
}

export const VisualDraw = ({
  drawState,
  getTeamById,
  onDrawStep,
  onCompleteDraw,
}: VisualDrawProps) => {
  const [drawnBalls, setDrawnBalls] = useState<DrawnBall[]>([]);
  const [currentBall, setCurrentBall] = useState<{ teamId: string; potId: string } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [showSparkle, setShowSparkle] = useState<string | null>(null);

  // Get teams in current pot
  const currentPot = drawState.pots[drawState.currentPotIndex];
  const teamsInCurrentPot = currentPot?.teamIds.filter(
    id => !drawnBalls.some(b => b.teamId === id) && 
          !drawState.drawnTeams.some(dt => dt.teamId === id)
  ) || [];

  // Execute single draw step with animation
  const executeDrawWithAnimation = useCallback(async () => {
    if (isAnimating || drawState.isComplete) return;
    
    setIsAnimating(true);

    // Find a team to draw
    const remainingTeam = drawState.remainingTeams[0];
    if (!remainingTeam) {
      setIsAnimating(false);
      return;
    }

    // Show ball being picked
    setCurrentBall({ teamId: remainingTeam.teamId, potId: remainingTeam.potId });
    
    // Wait for pick animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Execute the actual draw
    const result = onDrawStep();
    
    if (result && result.type === "assign_group" && result.teamId && result.groupId) {
      // Add to drawn balls with animation
      setDrawnBalls(prev => [...prev, {
        teamId: result.teamId!,
        groupId: result.groupId!,
        potId: remainingTeam.potId,
        isAnimating: true,
      }]);
      
      // Show sparkle effect
      setShowSparkle(result.groupId);
      setTimeout(() => setShowSparkle(null), 600);
      
      // Clear current ball after assign
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentBall(null);
      
      // Mark animation complete
      setDrawnBalls(prev => prev.map(b => 
        b.teamId === result.teamId ? { ...b, isAnimating: false } : b
      ));
    } else if (result?.type === "complete") {
      setCurrentBall(null);
    }
    
    setIsAnimating(false);
  }, [isAnimating, drawState, onDrawStep]);

  // Auto mode effect
  useEffect(() => {
    if (autoMode && !isAnimating && !drawState.isComplete) {
      const timer = setTimeout(() => {
        executeDrawWithAnimation();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoMode, isAnimating, drawState.isComplete, executeDrawWithAnimation]);

  // Complete draw when done
  useEffect(() => {
    if (drawState.isComplete && drawnBalls.length > 0) {
      setTimeout(() => {
        onCompleteDraw();
      }, 1500);
    }
  }, [drawState.isComplete, drawnBalls.length, onCompleteDraw]);

  // Draw all at once
  const drawAll = () => {
    setAutoMode(true);
  };

  // Get team color by pot
  const getPotColor = (potId: string): string => {
    const colors: Record<string, string> = {
      "pot-1": "bg-amber-500",
      "pot-2": "bg-blue-500",
      "pot-3": "bg-green-500",
      "pot-4": "bg-purple-500",
    };
    return colors[potId] || "bg-muted";
  };

  const getPotBorderColor = (potId: string): string => {
    const colors: Record<string, string> = {
      "pot-1": "border-amber-500",
      "pot-2": "border-blue-500",
      "pot-3": "border-green-500",
      "pot-4": "border-purple-500",
    };
    return colors[potId] || "border-muted";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shuffle className="w-6 h-6" />
            Sorteo de Grupos
          </h2>
          <p className="text-muted-foreground">
            {drawState.isComplete 
              ? "¡Sorteo completado!" 
              : `Extrayendo del ${currentPot?.name || "Bombo"}`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={executeDrawWithAnimation}
            disabled={isAnimating || drawState.isComplete || autoMode}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Extraer
          </Button>
          <Button
            variant="outline"
            onClick={drawAll}
            disabled={isAnimating || drawState.isComplete || autoMode}
            className="gap-2"
          >
            <FastForward className="w-4 h-4" />
            Sortear Todo
          </Button>
        </div>
      </div>

      {/* Pots Section */}
      <div className="grid grid-cols-4 gap-3">
        {drawState.pots.map((pot, potIndex) => {
          const remainingInPot = pot.teamIds.filter(
            id => !drawnBalls.some(b => b.teamId === id) &&
                  !drawState.drawnTeams.some(dt => dt.teamId === id)
          );
          const isCurrentPot = potIndex === drawState.currentPotIndex;
          
          return (
            <Card 
              key={pot.id}
              className={cn(
                "transition-all duration-300",
                isCurrentPot && !drawState.isComplete && "ring-2 ring-primary shadow-lg",
                remainingInPot.length === 0 && "opacity-50"
              )}
            >
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className={cn(
                    "w-3 h-3 rounded-full mr-2",
                    getPotColor(pot.id)
                  )} />
                  {pot.name}
                  <Badge variant="outline" className="ml-auto">
                    {remainingInPot.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <div className="space-y-1">
                  {pot.teamIds.map(teamId => {
                    const team = getTeamById(teamId);
                    const isDrawn = drawnBalls.some(b => b.teamId === teamId) ||
                                    drawState.drawnTeams.some(dt => dt.teamId === teamId);
                    const isCurrent = currentBall?.teamId === teamId;
                    
                    return (
                      <div
                        key={teamId}
                        className={cn(
                          "flex items-center gap-2 py-1.5 px-2 rounded text-sm transition-all",
                          isDrawn && "opacity-30 line-through",
                          isCurrent && "bg-primary text-primary-foreground animate-pulse scale-105"
                        )}
                      >
                        <span 
                          className={cn(
                            "w-2 h-2 rounded-full",
                            getPotColor(pot.id)
                          )} 
                        />
                        <span className="truncate">{team?.shortName || team?.name || teamId}</span>
                        {isDrawn && <CheckCircle2 className="w-3 h-3 ml-auto text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Ball Animation */}
      {currentBall && (
        <div className="flex justify-center py-4">
          <div className={cn(
            "relative px-6 py-4 rounded-2xl border-4 shadow-2xl animate-bounce",
            getPotBorderColor(currentBall.potId),
            "bg-gradient-to-br from-background to-muted"
          )}>
            <div className="absolute -top-2 -right-2">
              <CircleDot className={cn(
                "w-6 h-6",
                currentBall.potId === "pot-1" && "text-amber-500",
                currentBall.potId === "pot-2" && "text-blue-500",
                currentBall.potId === "pot-3" && "text-green-500",
                currentBall.potId === "pot-4" && "text-purple-500",
              )} />
            </div>
            <span className="text-lg font-bold">
              {getTeamById(currentBall.teamId)?.name || currentBall.teamId}
            </span>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {drawState.groups?.map((group, groupIndex) => {
          const groupTeams = group.teamIds.length > 0 
            ? group.teamIds 
            : drawnBalls.filter(b => b.groupId === group.id).map(b => b.teamId);
          const hasSparkle = showSparkle === group.id;
          
          return (
            <Card 
              key={group.id}
              className={cn(
                "transition-all duration-300",
                hasSparkle && "ring-2 ring-yellow-400 shadow-xl"
              )}
            >
              <CardHeader className="py-2 px-3 bg-muted/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {getGroupLetter(groupIndex)}
                  </span>
                  Grupo {getGroupLetter(groupIndex)}
                  {hasSparkle && <Sparkles className="w-4 h-4 text-yellow-500 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3 px-3 min-h-[140px]">
                <div className="space-y-2">
                  {[0, 1, 2, 3].map(slot => {
                    const teamId = groupTeams[slot];
                    const team = teamId ? getTeamById(teamId) : null;
                    const drawnBall = drawnBalls.find(b => b.teamId === teamId);
                    
                    return (
                      <div 
                        key={slot}
                        className={cn(
                          "flex items-center gap-2 py-2 px-2 rounded-lg transition-all duration-500",
                          team 
                            ? "bg-muted" 
                            : "bg-muted/30 border border-dashed border-muted-foreground/20",
                          drawnBall?.isAnimating && "animate-fade-in scale-105 bg-primary/10"
                        )}
                      >
                        {team ? (
                          <>
                            <span 
                              className={cn(
                                "w-3 h-3 rounded-full flex-shrink-0",
                                drawnBall ? getPotColor(drawnBall.potId) : "bg-muted-foreground"
                              )} 
                            />
                            <span className="text-sm font-medium truncate">
                              {team.shortName || team.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Esperando...
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {drawState.isComplete && (
        <div className="text-center py-6 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div className="text-left">
              <p className="font-bold text-lg">¡Sorteo Completado!</p>
              <p className="text-sm text-muted-foreground">
                Preparando fase de grupos...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
