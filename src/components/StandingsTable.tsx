import { TeamStanding, Team } from "@/types/game";
import { getLevelColor } from "@/data/teams";
import { cn } from "@/lib/utils";
import { Trophy, Medal, TrendingDown } from "lucide-react";

interface StandingsTableProps {
  standings: TeamStanding[];
  getTeamById: (id: string) => Team | undefined;
}

export const StandingsTable = ({ standings, getTeamById }: StandingsTableProps) => {
  return (
    <div className="bg-card rounded-xl border shadow-card overflow-hidden">
      <div className="bg-primary text-primary-foreground p-4">
        <h2 className="font-display text-2xl tracking-wide flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Tabla de Posiciones
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">#</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Equipo</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">PJ</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">G</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">E</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">P</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">GF</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">GC</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">DG</th>
              <th className="text-center p-3 text-xs font-semibold text-muted-foreground">PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => {
              const team = getTeamById(standing.teamId)!;
              const position = index + 1;
              
              return (
                <tr 
                  key={standing.teamId}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/30",
                    position === 1 && "bg-gold/10",
                    position <= 3 && "border-l-4 border-l-primary",
                    position > standings.length - 3 && "border-l-4 border-l-destructive"
                  )}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {position === 1 && <Trophy className="w-4 h-4 text-gold" />}
                      {position === 2 && <Medal className="w-4 h-4 text-muted-foreground" />}
                      {position === 3 && <Medal className="w-4 h-4 text-amber-600" />}
                      {position > standings.length - 3 && <TrendingDown className="w-4 h-4 text-destructive" />}
                      <span className={cn(
                        "font-semibold text-sm",
                        position <= 3 && "text-primary"
                      )}>
                        {position}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{team.name}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        getLevelColor(team.level)
                      )}>
                        {team.level}
                      </span>
                    </div>
                  </td>
                  <td className="text-center p-3 text-sm">{standing.played}</td>
                  <td className="text-center p-3 text-sm text-primary font-medium">{standing.won}</td>
                  <td className="text-center p-3 text-sm text-muted-foreground">{standing.drawn}</td>
                  <td className="text-center p-3 text-sm text-destructive">{standing.lost}</td>
                  <td className="text-center p-3 text-sm">{standing.goalsFor}</td>
                  <td className="text-center p-3 text-sm">{standing.goalsAgainst}</td>
                  <td className="text-center p-3 text-sm font-medium">
                    <span className={cn(
                      standing.goalDifference > 0 && "text-primary",
                      standing.goalDifference < 0 && "text-destructive"
                    )}>
                      {standing.goalDifference > 0 ? "+" : ""}{standing.goalDifference}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span className="font-display text-xl">{standing.points}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
