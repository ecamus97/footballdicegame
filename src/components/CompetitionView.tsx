import { useState } from "react";
import { CompetitionState, CompetitionConfig, getGroupLetter, KnockoutRound, KnockoutMatch, KnockoutSeries } from "@/types/competition";
import { Team } from "@/types/game";
import { VisualDraw } from "./VisualDraw";
import { GroupStageView } from "./GroupStageView";
import { KnockoutBracketView } from "./KnockoutBracketView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shuffle, 
  Users, 
  Trophy, 
  Crown,
  Settings,
  RotateCcw,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CompetitionViewProps {
  competitionState: CompetitionState;
  getTeamById: (id: string | null) => Team | undefined;
  onDrawStep: () => { type: string; teamId?: string; groupId?: string } | null;
  onCompleteDraw: () => void;
  onPlayGroupMatch: (matchId: string, groupId: string) => void;
  onSimulateGroupMatchday: (matchday: number) => void;
  isGroupStageComplete: boolean;
  onAdvanceToKnockout: () => void;
  onPlayKnockoutMatch?: (matchId: string, seriesId: string) => void;
  onGoToPhase?: (phase: "groups" | "knockout") => void;
  onReset: () => void;
}

const roundNames: Record<KnockoutRound, string> = {
  preliminary_1: "Ronda Previa 1",
  preliminary_2: "Ronda Previa 2",
  preliminary_3: "Ronda Previa 3",
  round_of_64: "Treintaidosavos",
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos de Final",
  quarterfinals: "Cuartos de Final",
  semifinals: "Semifinales",
  final: "Final",
};

export const CompetitionView = ({
  competitionState,
  getTeamById,
  onDrawStep,
  onCompleteDraw,
  onPlayGroupMatch,
  onSimulateGroupMatchday,
  isGroupStageComplete,
  onAdvanceToKnockout,
  onPlayKnockoutMatch,
  onGoToPhase,
  onReset,
}: CompetitionViewProps) => {
  const { config, phase, drawState, groups, knockoutMatches, knockoutSeries, viewingPhase } = competitionState;

  // Determine what phase to view
  const displayPhase = viewingPhase || phase;

  // Get phase info
  const getPhaseInfo = () => {
    switch (phase) {
      case "setup":
        return { label: "Configuración", icon: Settings, color: "text-muted-foreground" };
      case "draw":
        return { label: "Sorteo", icon: Shuffle, color: "text-blue-500" };
      case "qualifying":
        return { label: "Fase Previa", icon: Trophy, color: "text-orange-500" };
      case "groups":
        return { label: "Fase de Grupos", icon: Users, color: "text-green-500" };
      case "knockout":
        return { label: "Eliminatorias", icon: Crown, color: "text-purple-500" };
      case "complete":
        return { label: "Finalizado", icon: Trophy, color: "text-yellow-500" };
    }
  };

  const phaseInfo = getPhaseInfo();
  const PhaseIcon = phaseInfo.icon;

  // Calculate progress
  const getProgress = () => {
    if ((displayPhase === "groups" || phase === "groups") && groups) {
      const totalMatches = groups.reduce((acc, g) => acc + g.matches.length, 0);
      const playedMatches = groups.reduce(
        (acc, g) => acc + g.matches.filter(m => m.played).length, 
        0
      );
      return { played: playedMatches, total: totalMatches, label: "Fase de Grupos" };
    }
    if ((displayPhase === "knockout" || phase === "knockout") && knockoutMatches) {
      const playedMatches = knockoutMatches.filter(m => m.played).length;
      return { played: playedMatches, total: knockoutMatches.length, label: "Eliminatorias" };
    }
    return null;
  };

  const progress = getProgress();

  // Get qualification spots
  const qualificationSpots = config.groupConfig?.qualificationRule === "first_only" 
    ? 1 
    : config.groupConfig?.qualificationRule === "first_second" 
      ? 2 
      : 2;

  // Check if can navigate between phases
  const canGoToGroups = (phase === "knockout" || phase === "complete") && groups && groups.length > 0;
  const canGoToKnockout = displayPhase === "groups" && phase !== "groups" && knockoutSeries && knockoutSeries.length > 0;

  return (
    <div className="space-y-6">
      {/* Competition Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <CardContent className="py-5 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                <Trophy className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">{config.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="gap-1.5 font-medium">
                    <PhaseIcon className={cn("w-3.5 h-3.5", phaseInfo.color)} />
                    {phaseInfo.label}
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {config.participatingTeamIds.length} equipos
                  </Badge>
                  {config.groupConfig && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {config.groupConfig.numGroups} grupos
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {progress && (
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{progress.label}</div>
                  <div className="text-2xl font-display font-bold text-primary">
                    {progress.played}<span className="text-muted-foreground text-lg">/{progress.total}</span>
                  </div>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReset}
                className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reiniciar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Navigation */}
      {(canGoToGroups || canGoToKnockout) && (
        <div className="flex gap-2 animate-fade-in">
          {canGoToGroups && displayPhase !== "groups" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onGoToPhase?.("groups")}
              className="gap-2 hover:bg-primary/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver Fase de Grupos
            </Button>
          )}
          {displayPhase === "groups" && (phase === "knockout" || phase === "complete") && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onGoToPhase?.("knockout")}
              className="gap-2 hover:bg-primary/5"
            >
              Ver Eliminatorias
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Advance to Knockout Button */}
      {phase === "groups" && isGroupStageComplete && config.knockoutConfig && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent shadow-md animate-scale-in">
          <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-purple-700">¡Fase de grupos completada!</h3>
                <p className="text-sm text-muted-foreground">
                  Los equipos clasificados están listos para las eliminatorias
                </p>
              </div>
            </div>
            <Button onClick={onAdvanceToKnockout} className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25">
              <ArrowRight className="w-4 h-4" />
              Avanzar a Eliminatorias
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase Content */}
      {phase === "draw" && drawState && (
        <VisualDraw
          drawState={drawState}
          getTeamById={getTeamById}
          onDrawStep={onDrawStep}
          onCompleteDraw={onCompleteDraw}
        />
      )}

      {displayPhase === "groups" && groups && (
        <GroupStageView
          groups={groups}
          getTeamById={getTeamById}
          onPlayMatch={onPlayGroupMatch}
          onSimulateMatchday={onSimulateGroupMatchday}
          qualificationSpots={qualificationSpots}
        />
      )}

      {(displayPhase === "knockout" || phase === "knockout") && knockoutSeries && knockoutMatches && displayPhase !== "groups" && (
        <KnockoutBracketView
          series={knockoutSeries}
          matches={knockoutMatches}
          getTeamById={getTeamById}
          config={config}
          onPlayMatch={onPlayKnockoutMatch}
          roundNames={roundNames}
        />
      )}

      {phase === "complete" && displayPhase !== "groups" && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-4 px-8 py-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 border border-yellow-500/30">
            <Trophy className="w-16 h-16 text-yellow-500" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Campeón</p>
              <p className="text-3xl font-display font-bold">
                {competitionState.championId 
                  ? getTeamById(competitionState.championId)?.name 
                  : "Por definir"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
