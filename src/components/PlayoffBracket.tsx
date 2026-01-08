import { TeamStanding, Team, TournamentConfig, PlayoffFormat, PlayoffMatch as PlayoffMatchType, PlayoffSeries } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayoffBracketProps {
  standings: TeamStanding[];
  tournamentConfig: TournamentConfig;
  getTeamById: (id: string) => Team | undefined;
  regularSeasonComplete: boolean;
  playoffMatches?: PlayoffMatchType[];
  playoffSeries?: PlayoffSeries[];
}

export const PlayoffBracket = ({
  standings,
  tournamentConfig,
  getTeamById,
  regularSeasonComplete,
  playoffMatches = [],
  playoffSeries = [],
}: PlayoffBracketProps) => {
  if (!tournamentConfig.playoffsEnabled || !regularSeasonComplete) {
    return null;
  }

  const playoffsTeams = tournamentConfig.playoffsTeams;
  const qualifiedTeams = standings.slice(0, playoffsTeams);
  
  const getFormatDescription = (format: PlayoffFormat): string => {
    switch (format) {
      case "single":
        return "Partidos a ida única en cancha neutral";
      case "double":
        return "Ida y vuelta, final en cancha neutral";
      case "final_only":
        return "Ida y vuelta completo (incluyendo final)";
      default:
        return "";
    }
  };

  // Get champion from final series
  const getFinalSeries = () => {
    return playoffSeries.find(s => s.round === "final");
  };

  const finalSeries = getFinalSeries();
  const champion = finalSeries?.winnerId ? getTeamById(finalSeries.winnerId) : null;

  // Get series by round
  const getSeriesByRound = (round: string) => {
    return playoffSeries.filter(s => s.round === round).sort((a, b) => a.matchNumber - b.matchNumber);
  };

  // Get matches for a series
  const getMatchesForSeries = (series: PlayoffSeries) => {
    const leg1 = playoffMatches.find(m => m.id === series.leg1Id);
    const leg2 = series.leg2Id ? playoffMatches.find(m => m.id === series.leg2Id) : null;
    return { leg1, leg2 };
  };

  // Build bracket structure
  const buildBracket = () => {
    const rounds: { name: string; round: string; series: PlayoffSeries[] }[] = [];
    
    if (playoffsTeams >= 8) {
      rounds.push({ name: "Cuartos", round: "quarterfinals", series: getSeriesByRound("quarterfinals") });
    }
    if (playoffsTeams >= 4) {
      rounds.push({ name: "Semifinales", round: "semifinals", series: getSeriesByRound("semifinals") });
    }
    rounds.push({ name: "Final", round: "final", series: getSeriesByRound("final") });
    
    return rounds;
  };

  const bracket = buildBracket();
  const isSingleLeg = tournamentConfig.playoffsFormat === "single";

  return (
    <Card className="bg-card border shadow-card overflow-hidden">
      <CardHeader className="bg-purple-600 text-white p-4">
        <CardTitle className="font-display text-2xl tracking-wide flex items-center gap-2">
          <Crown className="w-6 h-6" />
          Playoffs
        </CardTitle>
        <p className="text-sm text-purple-100 mt-1">
          {getFormatDescription(tournamentConfig.playoffsFormat)}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {/* Qualified teams */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-500" />
            Equipos Clasificados
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {qualifiedTeams.map((standing, index) => {
              const team = getTeamById(standing.teamId);
              return (
                <div
                  key={standing.teamId}
                  className={cn(
                    "p-2 rounded-lg text-center border transition-all",
                    champion?.id === standing.teamId && "ring-2 ring-gold bg-gold/20 border-gold",
                    index === 0 && champion?.id !== standing.teamId && "bg-gold/10 border-gold/30",
                    index > 0 && champion?.id !== standing.teamId && "bg-purple-500/10 border-purple-500/30"
                  )}
                >
                  <div className="text-xs text-muted-foreground">#{index + 1}</div>
                  <div className="font-medium text-sm truncate">{team?.shortName || team?.name}</div>
                  <div className="text-xs text-muted-foreground">{standing.points} pts</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bracket visualization - horizontal flow */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {bracket.map((round, roundIndex) => {
              const matchesInRound = round.series.length;
              const isLastRound = roundIndex === bracket.length - 1;
              
              return (
                <div key={round.round} className="flex flex-col">
                  <h4 className={cn(
                    "text-sm font-semibold mb-3 text-center px-4 py-2 rounded-lg",
                    isLastRound ? "bg-gold/20 text-gold-dark" : "bg-purple-500/10 text-purple-600"
                  )}>
                    {round.name}
                  </h4>
                  
                  <div className={cn(
                    "flex flex-col justify-around flex-1 gap-2",
                    matchesInRound === 1 && "justify-center"
                  )}>
                    {round.series.map((series, seriesIndex) => {
                      const team1 = series.team1Id ? getTeamById(series.team1Id) : null;
                      const team2 = series.team2Id ? getTeamById(series.team2Id) : null;
                      const { leg1, leg2 } = getMatchesForSeries(series);
                      const isComplete = series.winnerId !== null;
                      const winner = series.winnerId ? getTeamById(series.winnerId) : null;
                      
                      // Calculate display scores
                      let team1Display = "-";
                      let team2Display = "-";
                      let penaltiesDisplay = "";
                      
                      if (leg1?.played) {
                        if (isSingleLeg || !leg2) {
                          // Single leg format
                          team1Display = String(leg1.team1Goals ?? 0);
                          team2Display = String(leg1.team2Goals ?? 0);
                          if (leg1.penalties) {
                            penaltiesDisplay = `(${leg1.penalties.team1Penalties}-${leg1.penalties.team2Penalties} pen)`;
                          }
                        } else if (leg2?.played) {
                          // Two legs complete - show aggregate
                          // leg1: team1 = lower seed (home), team2 = higher seed (away)
                          // leg2: team1 = higher seed (home), team2 = lower seed (away)
                          // series: team1 = higher seed, team2 = lower seed
                          const team1Agg = (leg1.team2Goals || 0) + (leg2.team1Goals || 0); // Higher seed
                          const team2Agg = (leg1.team1Goals || 0) + (leg2.team2Goals || 0); // Lower seed
                          team1Display = String(team1Agg);
                          team2Display = String(team2Agg);
                          if (leg2.penalties) {
                            penaltiesDisplay = `(${leg2.penalties.team1Penalties}-${leg2.penalties.team2Penalties} pen)`;
                          }
                        } else {
                          // Only leg 1 played
                          // Show leg 1 result (lower seed goals - higher seed goals)
                          team1Display = String(leg1.team2Goals ?? 0);
                          team2Display = String(leg1.team1Goals ?? 0);
                        }
                      }
                      
                      return (
                        <div
                          key={series.id}
                          className={cn(
                            "border rounded-lg bg-card min-w-[200px]",
                            isComplete && "border-green-500/50",
                            isLastRound && isComplete && "border-gold ring-1 ring-gold/50"
                          )}
                        >
                          {/* Team 1 (higher seed) */}
                          <div className={cn(
                            "flex items-center justify-between p-2 border-b",
                            winner?.id === series.team1Id && "bg-green-500/10"
                          )}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {series.team1Seed > 0 && (
                                <span className="text-xs text-muted-foreground w-4">{series.team1Seed}</span>
                              )}
                              <span className={cn(
                                "font-medium text-sm truncate",
                                !team1 && "text-muted-foreground italic",
                                winner?.id === series.team1Id && "font-bold text-green-600"
                              )}>
                                {team1?.shortName || team1?.name || "TBD"}
                              </span>
                              {winner?.id === series.team1Id && (
                                <Trophy className="w-3 h-3 text-gold flex-shrink-0" />
                              )}
                            </div>
                            <span className={cn(
                              "font-bold text-sm w-6 text-right",
                              winner?.id === series.team1Id && "text-green-600"
                            )}>
                              {team1Display}
                            </span>
                          </div>
                          
                          {/* Team 2 (lower seed) */}
                          <div className={cn(
                            "flex items-center justify-between p-2",
                            winner?.id === series.team2Id && "bg-green-500/10"
                          )}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {series.team2Seed > 0 && (
                                <span className="text-xs text-muted-foreground w-4">{series.team2Seed}</span>
                              )}
                              <span className={cn(
                                "font-medium text-sm truncate",
                                !team2 && "text-muted-foreground italic",
                                winner?.id === series.team2Id && "font-bold text-green-600"
                              )}>
                                {team2?.shortName || team2?.name || "TBD"}
                              </span>
                              {winner?.id === series.team2Id && (
                                <Trophy className="w-3 h-3 text-gold flex-shrink-0" />
                              )}
                            </div>
                            <span className={cn(
                              "font-bold text-sm w-6 text-right",
                              winner?.id === series.team2Id && "text-green-600"
                            )}>
                              {team2Display}
                            </span>
                          </div>
                          
                          {/* Penalties indicator */}
                          {penaltiesDisplay && (
                            <div className="text-center text-xs text-muted-foreground py-1 border-t bg-muted/30">
                              {penaltiesDisplay}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Champion display */}
            <div className="flex flex-col justify-center">
              <div className={cn(
                "border-2 rounded-xl p-4 min-w-[180px] text-center transition-all",
                champion 
                  ? "border-gold bg-gradient-to-br from-gold/20 to-gold/5 animate-pulse-subtle" 
                  : "border-dashed border-muted-foreground/30"
              )}>
                <Trophy className={cn(
                  "w-8 h-8 mx-auto mb-2",
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
        </div>
      </CardContent>
    </Card>
  );
};