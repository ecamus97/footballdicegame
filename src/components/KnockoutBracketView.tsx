import { KnockoutSeries, KnockoutMatch, KnockoutRound, CompetitionConfig } from "@/types/competition";
import { Team } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crown, Play, Trophy } from "lucide-react";

interface KnockoutBracketViewProps {
  series: KnockoutSeries[];
  matches: KnockoutMatch[];
  getTeamById: (id: string | null) => Team | undefined;
  config: CompetitionConfig;
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

export const KnockoutBracketView = ({
  series,
  matches,
  getTeamById,
  config,
}: KnockoutBracketViewProps) => {
  // Get unique rounds
  const rounds = [...new Set(series.map(s => s.round))];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Crown className="w-6 h-6 text-purple-500" />
        <h2 className="text-2xl font-display font-bold">Fase de Eliminatorias</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rounds.map(round => {
          const roundSeries = series.filter(s => s.round === round);
          
          return (
            <Card key={round} className="border-purple-500/20">
              <CardHeader className="py-3 px-4 bg-purple-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                  {round === "final" && <Trophy className="w-4 h-4 text-yellow-500" />}
                  {roundNames[round]}
                  <Badge variant="outline" className="ml-auto">
                    {roundSeries.length} llaves
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3 px-4 space-y-3">
                {roundSeries.map(s => {
                  const team1 = getTeamById(s.team1Id);
                  const team2 = getTeamById(s.team2Id);
                  const winner = getTeamById(s.winnerId);
                  
                  return (
                    <div 
                      key={s.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        s.winnerId ? "bg-muted/50" : "bg-muted/20 border-dashed"
                      )}
                    >
                      <div className="space-y-2">
                        <div className={cn(
                          "flex items-center justify-between py-1 px-2 rounded",
                          s.winnerId === s.team1Id && "bg-green-500/20"
                        )}>
                          <span className="text-sm font-medium truncate">
                            {team1?.name || "Por definir"}
                          </span>
                          {s.winnerId && (
                            <span className="text-sm font-bold">{s.team1Aggregate}</span>
                          )}
                        </div>
                        <div className={cn(
                          "flex items-center justify-between py-1 px-2 rounded",
                          s.winnerId === s.team2Id && "bg-green-500/20"
                        )}>
                          <span className="text-sm font-medium truncate">
                            {team2?.name || "Por definir"}
                          </span>
                          {s.winnerId && (
                            <span className="text-sm font-bold">{s.team2Aggregate}</span>
                          )}
                        </div>
                      </div>
                      {!s.winnerId && team1 && team2 && !s.isBye && (
                        <Button size="sm" variant="outline" className="w-full mt-2 gap-1">
                          <Play className="w-3 h-3" />
                          Jugar
                        </Button>
                      )}
                      {s.isBye && (
                        <div className="text-xs text-center text-muted-foreground mt-2">
                          Pasa directo
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
