import { Match, Team } from "@/types/game";
import { TeamBadge } from "./TeamBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dices, CheckCircle2 } from "lucide-react";

interface MatchCardProps {
  match: Match;
  getTeamById: (id: string) => Team | undefined;
  onPlay: (matchId: string) => void;
  compact?: boolean;
}

export const MatchCard = ({ match, getTeamById, onPlay, compact = false }: MatchCardProps) => {
  const homeTeam = getTeamById(match.homeTeamId)!;
  const awayTeam = getTeamById(match.awayTeamId)!;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border shadow-card transition-all hover:shadow-lg",
        match.played && "opacity-75",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Home Team */}
        <div className="flex-1 min-w-0">
          <TeamBadge 
            team={homeTeam} 
            showLevel={!compact} 
            size={compact ? "sm" : "md"}
            align="left"
          />
        </div>
        
        {/* Score / Status */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          {match.played ? (
            <div className="flex items-center gap-3">
              <span className={cn(
                "font-display text-3xl",
                match.homeGoals! > match.awayGoals! && "text-primary"
              )}>
                {match.homeGoals}
              </span>
              <span className="text-muted-foreground font-medium">-</span>
              <span className={cn(
                "font-display text-3xl",
                match.awayGoals! > match.homeGoals! && "text-primary"
              )}>
                {match.awayGoals}
              </span>
            </div>
          ) : (
            <Button
              onClick={() => onPlay(match.id)}
              size={compact ? "sm" : "default"}
              className="gap-2"
            >
              <Dices className="w-4 h-4" />
              {compact ? "Jugar" : "Jugar Partido"}
            </Button>
          )}
          
          {match.played && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3" />
              Finalizado
            </span>
          )}
        </div>
        
        {/* Away Team */}
        <div className="flex-1 min-w-0">
          <TeamBadge 
            team={awayTeam} 
            showLevel={!compact} 
            size={compact ? "sm" : "md"}
            align="right"
          />
        </div>
      </div>
    </div>
  );
};
