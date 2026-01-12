import { KnockoutSeries, KnockoutMatch, KnockoutRound, CompetitionConfig } from "@/types/competition";
import { Team } from "@/types/game";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Crown, Play, Trophy } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Crown className="w-6 h-6 text-purple-500" />
        <h2 className="text-2xl font-display font-bold">Fase de Eliminatorias</h2>
      </div>

      {/* Horizontal Bracket */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 min-w-max pb-4">
          {rounds.map((round, roundIndex) => {
            const roundSeries = series.filter(s => s.round === round);
            const isLastRound = roundIndex === rounds.length - 1;
            
            return (
              <div key={round} className="flex flex-col min-w-[260px]">
                <h4 className={cn(
                  "text-sm font-semibold mb-3 text-center px-4 py-2 rounded-lg",
                  isLastRound ? "bg-gold/20 text-gold-dark" : "bg-purple-500/10 text-purple-600"
                )}>
                  {roundNames[round]}
                  <Badge variant="outline" className="ml-2">
                    {roundSeries.length}
                  </Badge>
                </h4>
                
                <div className={cn(
                  "flex flex-col justify-around flex-1 gap-3",
                  roundSeries.length === 1 && "justify-center"
                )}>
                  {roundSeries.map((s) => {
                    const team1 = getTeamById(s.team1Id);
                    const team2 = getTeamById(s.team2Id);
                    const nextMatch = getNextPlayableMatch(s);
                    const displayInfo = getSeriesDisplayInfo(s);
                    
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "border rounded-lg bg-card",
                          s.winnerId && "border-green-500/50",
                          isLastRound && s.winnerId && "border-gold ring-1 ring-gold/50"
                        )}
                      >
                        {/* Team 1 */}
                        <div className={cn(
                          "flex items-center justify-between p-2 border-b",
                          s.winnerId === s.team1Id && "bg-green-500/10"
                        )}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {s.team1Seed > 0 && (
                              <span className="text-xs text-muted-foreground w-4">{s.team1Seed}</span>
                            )}
                            <span className={cn(
                              "font-medium text-sm truncate",
                              !team1 && "text-muted-foreground italic",
                              s.winnerId === s.team1Id && "font-bold text-green-600"
                            )}>
                              {team1?.name || "Por definir"}
                            </span>
                            {s.winnerId === s.team1Id && (
                              <Trophy className="w-3 h-3 text-gold flex-shrink-0" />
                            )}
                          </div>
                          <span className={cn(
                            "font-bold text-sm w-8 text-right",
                            s.winnerId === s.team1Id && "text-green-600"
                          )}>
                            {s.winnerId ? s.team1Aggregate : "-"}
                          </span>
                        </div>
                        
                        {/* Team 2 */}
                        <div className={cn(
                          "flex items-center justify-between p-2",
                          s.winnerId === s.team2Id && "bg-green-500/10"
                        )}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {s.team2Seed > 0 && (
                              <span className="text-xs text-muted-foreground w-4">{s.team2Seed}</span>
                            )}
                            <span className={cn(
                              "font-medium text-sm truncate",
                              !team2 && "text-muted-foreground italic",
                              s.winnerId === s.team2Id && "font-bold text-green-600"
                            )}>
                              {team2?.name || "Por definir"}
                            </span>
                            {s.winnerId === s.team2Id && (
                              <Trophy className="w-3 h-3 text-gold flex-shrink-0" />
                            )}
                          </div>
                          <span className={cn(
                            "font-bold text-sm w-8 text-right",
                            s.winnerId === s.team2Id && "text-green-600"
                          )}>
                            {s.winnerId ? s.team2Aggregate : "-"}
                          </span>
                        </div>

                        {/* Match details / Play button */}
                        {s.isBye ? (
                          <div className="text-xs text-center text-muted-foreground py-2 border-t bg-muted/30">
                            Pasa directo
                          </div>
                        ) : nextMatch && onPlayMatch ? (
                          <div className="border-t">
                            {/* Show previous leg result if exists */}
                            {displayInfo.status === "waiting_leg2" && displayInfo.leg1Text && (
                              <div className="text-xs text-center text-muted-foreground py-1 bg-muted/20 border-b">
                                Ida: {displayInfo.leg1Text}
                              </div>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full rounded-t-none gap-1"
                              onClick={() => onPlayMatch(nextMatch.id, s.id)}
                            >
                              <Play className="w-3 h-3" />
                              {s.leg2Id && nextMatch.id === s.leg2Id ? "Vuelta" : s.leg2Id ? "Ida" : "Jugar"}
                            </Button>
                          </div>
                        ) : displayInfo.status === "complete" || displayInfo.status === "waiting_leg2" ? (
                          <div className="text-xs text-center text-muted-foreground py-2 border-t bg-muted/30 space-y-0.5">
                            {displayInfo.leg1Text && (
                              <div>Ida: {displayInfo.leg1Text}</div>
                            )}
                            {displayInfo.leg2Text && (
                              <div>Vuelta: {displayInfo.leg2Text}</div>
                            )}
                            {displayInfo.penaltiesText && (
                              <div className="text-purple-600 font-medium">{displayInfo.penaltiesText}</div>
                            )}
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
          <div className="flex flex-col justify-center min-w-[180px]">
            <div className={cn(
              "border-2 rounded-xl p-4 text-center transition-all",
              champion 
                ? "border-gold bg-gradient-to-br from-gold/20 to-gold/5" 
                : "border-dashed border-muted-foreground/30"
            )}>
              <Trophy className={cn(
                "w-10 h-10 mx-auto mb-2",
                champion ? "text-gold" : "text-muted-foreground/50"
              )} />
              <div className="text-xs text-muted-foreground mb-1">CAMPEÓN</div>
              <div className={cn(
                "font-display text-lg",
                champion ? "text-gold-dark font-bold" : "text-muted-foreground italic"
              )}>
                {champion?.name || "Por definir"}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};