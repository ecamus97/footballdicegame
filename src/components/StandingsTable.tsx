import { TeamStanding, Team, TournamentConfig } from "@/types/game";
import { getLevelColor } from "@/data/teams";
import { cn } from "@/lib/utils";
import { Trophy, Medal, TrendingDown, Star, Globe, ArrowUpDown } from "lucide-react";

interface StandingsTableProps {
  standings: TeamStanding[];
  getTeamById: (id: string) => Team | undefined;
  tournamentConfig: TournamentConfig;
}

export const StandingsTable = ({ standings, getTeamById, tournamentConfig }: StandingsTableProps) => {
  // Calculate zone boundaries
  const totalTeams = standings.length;
  
  // Playoffs zone
  const playoffsEnd = tournamentConfig.playoffsEnabled ? tournamentConfig.playoffsTeams : 0;
  
  // International cups zones - START FROM POSITION 1, NOT after playoffs!
  // Cups and playoffs can overlap (both apply to top positions)
  const cupZones: { name: string; start: number; end: number; color: string }[] = [];
  let currentCupPosition = 1; // Always start from position 1
  
  for (const cup of tournamentConfig.internationalCups) {
    if (cup.spots > 0) {
      cupZones.push({
        name: cup.name,
        start: currentCupPosition,
        end: currentCupPosition + cup.spots - 1,
        color: cup.color,
      });
      currentCupPosition += cup.spots;
    }
  }
  
  // Promotion/relegation playoff zone
  const promotionPlayoffStart = tournamentConfig.promotionPlayoffEnabled 
    ? totalTeams - tournamentConfig.relegationSpots - tournamentConfig.promotionPlayoffSpots + 1
    : 0;
  const promotionPlayoffEnd = tournamentConfig.promotionPlayoffEnabled
    ? totalTeams - tournamentConfig.relegationSpots
    : 0;
  
  // Relegation zone
  const relegationStart = totalTeams - tournamentConfig.relegationSpots + 1;

  // Check if position is in a cup zone
  const getCupForPosition = (position: number) => {
    for (const cup of cupZones) {
      if (position >= cup.start && position <= cup.end) {
        return cup;
      }
    }
    return null;
  };

  const getPositionStyle = (position: number) => {
    const isPlayoffs = tournamentConfig.playoffsEnabled && position <= playoffsEnd;
    const cup = getCupForPosition(position);
    const isPromotion = tournamentConfig.promotionPlayoffEnabled && 
                        position >= promotionPlayoffStart && 
                        position <= promotionPlayoffEnd;
    const isRelegation = tournamentConfig.relegationSpots > 0 && position >= relegationStart;

    // Priority: Champion > Relegation > Promotion > Cup+Playoffs combined > Playoffs only > Cup only
    if (position === 1) {
      // Champion - show both playoff (if enabled) and cup indicators
      if (isPlayoffs && cup) {
        return "bg-gradient-to-r from-gold/20 via-purple-500/10 to-green-500/10 border-l-4 border-l-gold";
      }
      return "bg-gold/10 border-l-4 border-l-gold";
    }
    
    if (isRelegation) {
      return "bg-destructive/10 border-l-4 border-l-destructive";
    }
    
    if (isPromotion) {
      return "bg-orange-500/10 border-l-4 border-l-orange-500";
    }
    
    // Both playoffs AND cup zone
    if (isPlayoffs && cup) {
      const cupBgColor = cup.color.split(" ")[0];
      return `bg-gradient-to-r from-purple-500/10 to-green-500/10 border-l-4 border-l-purple-500`;
    }
    
    // Only playoffs
    if (isPlayoffs) {
      return "bg-purple-500/10 border-l-4 border-l-purple-500";
    }
    
    // Only cup zone
    if (cup) {
      return `${cup.color} border-l-4`;
    }
    
    return "";
  };

  const getPositionIcon = (position: number) => {
    const isPlayoffs = tournamentConfig.playoffsEnabled && position <= playoffsEnd;
    const cup = getCupForPosition(position);
    
    if (position === 1) {
      return <Trophy className="w-4 h-4 text-gold" />;
    }
    if (position === 2) {
      return <Medal className="w-4 h-4 text-muted-foreground" />;
    }
    if (position === 3) {
      return <Medal className="w-4 h-4 text-amber-600" />;
    }
    
    // Show both icons if position qualifies for playoffs AND cup
    if (isPlayoffs && cup) {
      return (
        <div className="flex items-center gap-0.5">
          <Star className="w-3 h-3 text-purple-500" />
          <Globe className="w-3 h-3 text-green-500" />
        </div>
      );
    }
    
    if (isPlayoffs) {
      return <Star className="w-4 h-4 text-purple-500" />;
    }
    
    if (cup) {
      return <Globe className="w-4 h-4 text-green-500" />;
    }
    
    if (tournamentConfig.promotionPlayoffEnabled && 
        position >= promotionPlayoffStart && 
        position <= promotionPlayoffEnd) {
      return <ArrowUpDown className="w-4 h-4 text-orange-500" />;
    }
    if (tournamentConfig.relegationSpots > 0 && position >= relegationStart) {
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    }
    return null;
  };

  // Build legend items
  const legendItems: { label: string; color: string; icon: React.ReactNode }[] = [];
  
  if (tournamentConfig.playoffsEnabled) {
    legendItems.push({
      label: `Playoffs (${tournamentConfig.playoffsTeams})`,
      color: "bg-purple-500",
      icon: <Star className="w-3 h-3" />,
    });
  }
  
  for (const cup of tournamentConfig.internationalCups) {
    if (cup.spots > 0) {
      const bgColor = cup.color.split(" ")[0].replace("/20", "");
      legendItems.push({
        label: `${cup.name} (${cup.spots})`,
        color: bgColor,
        icon: <Globe className="w-3 h-3" />,
      });
    }
  }
  
  if (tournamentConfig.promotionPlayoffEnabled && tournamentConfig.promotionPlayoffSpots > 0) {
    legendItems.push({
      label: `Promoción (${tournamentConfig.promotionPlayoffSpots})`,
      color: "bg-orange-500",
      icon: <ArrowUpDown className="w-3 h-3" />,
    });
  }
  
  if (tournamentConfig.relegationSpots > 0) {
    legendItems.push({
      label: `Descenso (${tournamentConfig.relegationSpots})`,
      color: "bg-destructive",
      icon: <TrendingDown className="w-3 h-3" />,
    });
  }

  return (
    <div className="bg-card rounded-xl border shadow-card overflow-hidden">
      <div className="bg-primary text-primary-foreground p-4">
        <h2 className="font-display text-2xl tracking-wide flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Tabla de Posiciones
        </h2>
      </div>
      
      {/* Legend */}
      {legendItems.length > 0 && (
        <div className="px-4 py-2 bg-muted/30 border-b flex flex-wrap gap-3">
          {legendItems.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div className={cn("w-3 h-3 rounded-sm", item.color)} />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      
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
              const positionIcon = getPositionIcon(position);
              
              return (
                <tr 
                  key={standing.teamId}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/30",
                    getPositionStyle(position)
                  )}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {positionIcon}
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
