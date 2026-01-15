import { KnockoutSeries, KnockoutMatch, KnockoutRound, CompetitionConfig } from "@/types/competition";
import { Team } from "@/types/game";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Crown, Play, Trophy, Swords, ChevronRight, Zap } from "lucide-react";

interface KnockoutBracketViewProps {
  series: KnockoutSeries[];
  matches: KnockoutMatch[];
  getTeamById: (id: string | null) => Team | undefined;
  config: CompetitionConfig;
  onPlayMatch?: (matchId: string, seriesId: string) => void;
  roundNames: Record<KnockoutRound, string>;
}

export const KnockoutBracketView = ({
  series,
  matches,
  getTeamById,
  config,
  onPlayMatch,
  roundNames,
}: KnockoutBracketViewProps) => {
  // Get unique rounds in order
  const roundOrder: KnockoutRound[] = [
    "preliminary_1", "preliminary_2", "preliminary_3",
    "round_of_64", "round_of_32", "round_of_16",
    "quarterfinals", "semifinals", "final"
  ];
  const rounds = roundOrder.filter(r => series.some(s => s.round === r));

  // Get champion
  const finalSeries = series.find(s => s.round === "final");
  const champion = finalSeries?.winnerId ? getTeamById(finalSeries.winnerId) : null;

  // Get next playable match for a series
  const getNextPlayableMatch = (s: KnockoutSeries): KnockoutMatch | null => {
    if (s.winnerId || s.isBye) return null;
    if (!s.team1Id || !s.team2Id) return null;
    
    const leg1 = matches.find(m => m.id === s.leg1Id);
    if (leg1 && !leg1.played) return leg1;
    
    if (s.leg2Id) {
      const leg2 = matches.find(m => m.id === s.leg2Id);
      if (leg2 && !leg2.played) return leg2;
    }
    
    return null;
  };

  // Get match display info for each series showing all results
  const getSeriesDisplayInfo = (s: KnockoutSeries) => {
    const leg1 = matches.find(m => m.id === s.leg1Id);
    const leg2 = s.leg2Id ? matches.find(m => m.id === s.leg2Id) : null;
    const isTwoLegs = !!s.leg2Id;
    
    if (s.isBye) {
      return { 
        status: "bye" as const, 
        leg1Text: null, 
        leg2Text: null, 
        aggregateText: null,
        penaltiesText: null,
      };
    }
    
    if (!leg1?.played) {
      return { 
        status: "pending" as const, 
        leg1Text: null, 
        leg2Text: null, 
        aggregateText: null,
        penaltiesText: null,
      };
    }
    
    // Get leg1 result - team1Id in leg1 is home
    const leg1Team1Name = getTeamById(leg1.team1Id)?.name || "?";
    const leg1Team2Name = getTeamById(leg1.team2Id)?.name || "?";
    const leg1Text = `${leg1.team1Goals}-${leg1.team2Goals}`;
    
    if (isTwoLegs && !leg2?.played) {
      return { 
        status: "waiting_leg2" as const, 
        leg1Text,
        leg1Home: leg1Team1Name,
        leg1Away: leg1Team2Name,
        leg2Text: null, 
        aggregateText: null,
        penaltiesText: null,
      };
    }
    
    // Both legs played or single leg
    if (isTwoLegs && leg2?.played) {
      const leg2Team1Name = getTeamById(leg2.team1Id)?.name || "?";
      const leg2Text = `${leg2.team1Goals}-${leg2.team2Goals}`;
      
      // Check for penalties in leg2
      let penaltiesText = null;
      if (leg2.penalties) {
        penaltiesText = `(${leg2.penalties.team1Penalties}-${leg2.penalties.team2Penalties} pen.)`;
      }
      
      return {
        status: "complete" as const,
        leg1Text,
        leg1Home: leg1Team1Name,
        leg1Away: leg1Team2Name,
        leg2Text,
        leg2Home: leg2Team1Name,
        leg2Away: getTeamById(leg2.team2Id)?.name || "?",
        aggregateText: `${s.team1Aggregate}-${s.team2Aggregate}`,
        penaltiesText,
      };
    }
    
    // Single leg completed
    let penaltiesText = null;
    if (leg1.penalties) {
      penaltiesText = `(${leg1.penalties.team1Penalties}-${leg1.penalties.team2Penalties} pen.)`;
    }
    
    return {
      status: "complete" as const,
      leg1Text,
      leg1Home: leg1Team1Name,
      leg1Away: leg1Team2Name,
      leg2Text: null,
      aggregateText: null,
      penaltiesText,
    };
  };

  const getRoundColor = (round: KnockoutRound, isLast: boolean) => {
    if (isLast) return "from-gold/40 via-gold/20 to-gold/10 border-gold/40 text-gold-dark";
    switch (round) {
      case "final": return "from-gold/40 via-gold/20 to-gold/10 border-gold/40 text-gold-dark";
      case "semifinals": return "from-purple-500/20 via-purple-500/10 to-purple-500/5 border-purple-500/30 text-purple-700";
      case "quarterfinals": return "from-blue-500/20 via-blue-500/10 to-blue-500/5 border-blue-500/30 text-blue-700";
      default: return "from-primary/15 via-primary/10 to-primary/5 border-primary/20 text-primary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 flex items-center justify-center shadow-xl shadow-purple-500/30">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
            <Zap className="w-3 h-3 text-gold-dark" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Fase de Eliminatorias</h2>
          <p className="text-sm text-muted-foreground">
            {series.length} llaves · {rounds.length} rondas
          </p>
        </div>
      </div>

      {/* Horizontal Bracket */}
      <ScrollArea className="w-full">
        <div className="flex gap-6 min-w-max pb-4">
          {rounds.map((round, roundIndex) => {
            const roundSeries = series.filter(s => s.round === round);
            const isLastRound = roundIndex === rounds.length - 1;
            const roundColor = getRoundColor(round, isLastRound);
            
            return (
              <div key={round} className="flex flex-col min-w-[300px]">
                {/* Round Header */}
                <div className={cn(
                  "relative mb-4 px-4 py-3 rounded-2xl border bg-gradient-to-r",
                  roundColor
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4" />
                      <span className="font-display text-lg font-bold tracking-wide">
                        {roundNames[round]}
                      </span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "font-mono text-xs",
                        isLastRound && "bg-gold/30 text-gold-dark border-gold/50"
                      )}
                    >
                      {roundSeries.length}
                    </Badge>
                  </div>
                </div>
                
                {/* Series Cards */}
                <div className={cn(
                  "flex flex-col justify-around flex-1 gap-4",
                  roundSeries.length === 1 && "justify-center"
                )}>
                  {roundSeries.map((s, seriesIndex) => {
                    const team1 = getTeamById(s.team1Id);
                    const team2 = getTeamById(s.team2Id);
                    const nextMatch = getNextPlayableMatch(s);
                    const displayInfo = getSeriesDisplayInfo(s);
                    const isReady = !!nextMatch;
                    
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "relative group rounded-2xl overflow-hidden transition-all duration-300",
                          "bg-card border-2 shadow-sm",
                          s.winnerId && "border-emerald-400/60 shadow-emerald-500/10",
                          isLastRound && s.winnerId && "border-gold shadow-lg shadow-gold/20 ring-2 ring-gold/20",
                          isReady && !s.winnerId && "border-primary/40 hover:border-primary hover:shadow-md cursor-pointer",
                          !isReady && !s.winnerId && "border-border/80"
                        )}
                      >
                        {/* Match number indicator */}
                        <div className="absolute -left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-primary/60 to-primary/20" />
                        
                        {/* Team 1 Row */}
                        <div className={cn(
                          "flex items-center gap-3 px-4 py-3 border-b border-border/50 transition-colors",
                          s.winnerId === s.team1Id && "bg-gradient-to-r from-emerald-500/15 to-transparent"
                        )}>
                          {/* Seed */}
                          {s.team1Seed > 0 && (
                            <span className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold",
                              s.winnerId === s.team1Id 
                                ? "bg-emerald-500/20 text-emerald-700" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {s.team1Seed}
                            </span>
                          )}
                          
                          {/* Team Name */}
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "font-medium text-sm truncate block",
                              !team1 && "text-muted-foreground italic",
                              s.winnerId === s.team1Id && "font-bold text-emerald-700"
                            )}>
                              {team1?.name || "Por definir"}
                            </span>
                          </div>
                          
                          {/* Winner Icon */}
                          {s.winnerId === s.team1Id && (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4 text-gold" />
                            </div>
                          )}
                          
                          {/* Score */}
                          <div className={cn(
                            "w-10 h-8 rounded-lg flex items-center justify-center font-display text-xl font-bold",
                            s.winnerId === s.team1Id 
                              ? "bg-emerald-500/20 text-emerald-700" 
                              : s.winnerId 
                                ? "bg-muted/50 text-muted-foreground"
                                : "bg-muted/30 text-foreground/70"
                          )}>
                            {s.winnerId ? s.team1Aggregate : "-"}
                          </div>
                        </div>
                        
                        {/* Team 2 Row */}
                        <div className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors",
                          s.winnerId === s.team2Id && "bg-gradient-to-r from-emerald-500/15 to-transparent"
                        )}>
                          {/* Seed */}
                          {s.team2Seed > 0 && (
                            <span className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold",
                              s.winnerId === s.team2Id 
                                ? "bg-emerald-500/20 text-emerald-700" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {s.team2Seed}
                            </span>
                          )}
                          
                          {/* Team Name */}
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "font-medium text-sm truncate block",
                              !team2 && "text-muted-foreground italic",
                              s.winnerId === s.team2Id && "font-bold text-emerald-700"
                            )}>
                              {team2?.name || "Por definir"}
                            </span>
                          </div>
                          
                          {/* Winner Icon */}
                          {s.winnerId === s.team2Id && (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4 text-gold" />
                            </div>
                          )}
                          
                          {/* Score */}
                          <div className={cn(
                            "w-10 h-8 rounded-lg flex items-center justify-center font-display text-xl font-bold",
                            s.winnerId === s.team2Id 
                              ? "bg-emerald-500/20 text-emerald-700" 
                              : s.winnerId 
                                ? "bg-muted/50 text-muted-foreground"
                                : "bg-muted/30 text-foreground/70"
                          )}>
                            {s.winnerId ? s.team2Aggregate : "-"}
                          </div>
                        </div>

                        {/* Footer: Match info or Play button */}
                        {s.isBye ? (
                          <div className="px-4 py-2 bg-muted/30 border-t border-border/50">
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
                              <ChevronRight className="w-3 h-3" />
                              Pasa directo
                            </div>
                          </div>
                        ) : nextMatch && onPlayMatch ? (
                          <div className="border-t border-border/50">
                            {/* Show previous leg result if exists */}
                            {displayInfo.status === "waiting_leg2" && displayInfo.leg1Text && (
                              <div className="px-4 py-1.5 bg-muted/20 border-b border-border/30">
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium">Ida:</span>
                                  <span className="font-mono font-bold">{displayInfo.leg1Text}</span>
                                </div>
                              </div>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className={cn(
                                "w-full rounded-none gap-2 h-10 font-semibold",
                                "bg-gradient-to-r from-primary/5 to-primary/10",
                                "hover:from-primary/10 hover:to-primary/20 hover:text-primary",
                                "group-hover:from-primary/15 group-hover:to-primary/25"
                              )}
                              onClick={() => onPlayMatch(nextMatch.id, s.id)}
                            >
                              <Play className="w-4 h-4 fill-current" />
                              {s.leg2Id && nextMatch.id === s.leg2Id ? "Jugar Vuelta" : s.leg2Id ? "Jugar Ida" : "Jugar Partido"}
                            </Button>
                          </div>
                        ) : displayInfo.status === "complete" || displayInfo.status === "waiting_leg2" ? (
                          <div className="px-4 py-2 bg-muted/20 border-t border-border/50">
                            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
                              {displayInfo.leg1Text && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Ida:</span>
                                  <span className="font-mono font-bold">{displayInfo.leg1Text}</span>
                                </div>
                              )}
                              {displayInfo.leg2Text && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Vuelta:</span>
                                  <span className="font-mono font-bold">{displayInfo.leg2Text}</span>
                                </div>
                              )}
                              {displayInfo.penaltiesText && (
                                <span className="text-purple-600 font-bold">{displayInfo.penaltiesText}</span>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {/* Champion Display */}
          <div className="flex flex-col justify-center min-w-[220px]">
            <div className={cn(
              "relative rounded-3xl p-8 text-center transition-all duration-500 overflow-hidden",
              champion 
                ? "bg-gradient-to-br from-gold/30 via-gold/20 to-amber-500/10 border-2 border-gold shadow-2xl shadow-gold/25" 
                : "bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-dashed border-muted-foreground/30"
            )}>
              {/* Decorative elements for champion */}
              {champion && (
                <>
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.3),transparent_50%)]" />
                  <div className="absolute -top-10 -left-10 w-20 h-20 bg-gold/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-amber-500/20 rounded-full blur-2xl" />
                </>
              )}
              
              <div className="relative">
                <div className={cn(
                  "w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all",
                  champion 
                    ? "bg-gradient-to-br from-gold via-amber-400 to-gold shadow-lg shadow-gold/40" 
                    : "bg-muted"
                )}>
                  <Trophy className={cn(
                    "w-10 h-10 transition-all",
                    champion ? "text-gold-dark" : "text-muted-foreground/40"
                  )} />
                </div>
                
                <div className={cn(
                  "text-xs uppercase tracking-widest font-semibold mb-2",
                  champion ? "text-gold-dark" : "text-muted-foreground"
                )}>
                  Campeón
                </div>
                
                <div className={cn(
                  "font-display text-2xl leading-tight",
                  champion ? "text-gold-dark font-bold" : "text-muted-foreground italic"
                )}>
                  {champion?.name || "Por definir"}
                </div>
                
                {champion && (
                  <div className="mt-4 flex justify-center">
                    <Badge className="bg-gold/20 text-gold-dark border-gold/40 px-3 py-1">
                      🏆 ¡Campeón!
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
