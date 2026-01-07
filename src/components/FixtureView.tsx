import { useState } from "react";
import { Match, Team } from "@/types/game";
import { MatchCard } from "./MatchCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, FastForward, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface FixtureViewProps {
  matches: Match[];
  totalMatchdays: number;
  getMatchesByMatchday: (matchday: number) => Match[];
  getTeamById: (id: string) => Team | undefined;
  onPlayMatch: (matchId: string) => void;
  onSimulateMatchdays?: (numMatchdays: number) => number;
}

export const FixtureView = ({ 
  matches, 
  totalMatchdays, 
  getMatchesByMatchday,
  getTeamById,
  onPlayMatch,
  onSimulateMatchdays,
}: FixtureViewProps) => {
  const [currentMatchday, setCurrentMatchday] = useState(1);
  
  const matchdayMatches = getMatchesByMatchday(currentMatchday);
  const playedInMatchday = matchdayMatches.filter(m => m.played).length;
  const totalInMatchday = matchdayMatches.length;
  
  const isFirstHalf = currentMatchday <= totalMatchdays / 2;

  // Calculate remaining matchdays
  const unplayedMatches = matches.filter(m => !m.played);
  const remainingMatchdays = unplayedMatches.length > 0 
    ? new Set(unplayedMatches.map(m => m.matchday)).size 
    : 0;

  const handleSimulate = (num: number) => {
    if (onSimulateMatchdays) {
      const simulated = onSimulateMatchdays(num);
      toast({
        title: "Simulación completada",
        description: `Se simularon ${simulated} partidos.`,
      });
    }
  };

  return (
    <div className="bg-card rounded-xl border shadow-card overflow-hidden">
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Fixture
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80">
              {isFirstHalf ? "Primera Rueda" : "Segunda Rueda"}
            </span>
            {onSimulateMatchdays && remainingMatchdays > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="gap-1 h-7 text-xs"
                  >
                    <FastForward className="w-3 h-3" />
                    Simular
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSimulate(1)}>
                    <Play className="w-4 h-4 mr-2" />
                    Simular 1 fecha
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSimulate(5)}>
                    <FastForward className="w-4 h-4 mr-2" />
                    Simular 5 fechas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSimulate(10)}>
                    <FastForward className="w-4 h-4 mr-2" />
                    Simular 10 fechas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleSimulate(remainingMatchdays)}
                    className="text-primary font-medium"
                  >
                    <FastForward className="w-4 h-4 mr-2" />
                    Simular TODO ({remainingMatchdays} fechas)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
      
      {/* Matchday Navigation */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMatchday(prev => Math.max(1, prev - 1))}
            disabled={currentMatchday === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-2">
            {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map(day => {
              const dayMatches = getMatchesByMatchday(day);
              const allPlayed = dayMatches.every(m => m.played);
              const somePlayed = dayMatches.some(m => m.played);
              
              return (
                <button
                  key={day}
                  onClick={() => setCurrentMatchday(day)}
                  className={cn(
                    "w-8 h-8 rounded-full text-sm font-medium transition-all flex-shrink-0",
                    currentMatchday === day 
                      ? "bg-primary text-primary-foreground" 
                      : allPlayed
                      ? "bg-primary/20 text-primary"
                      : somePlayed
                      ? "bg-gold/30 text-gold-dark"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMatchday(prev => Math.min(totalMatchdays, prev + 1))}
            disabled={currentMatchday === totalMatchdays}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-center mt-2">
          <span className="font-display text-xl">Fecha {currentMatchday}</span>
          <span className="text-sm text-muted-foreground ml-2">
            ({playedInMatchday}/{totalInMatchday} jugados)
          </span>
        </div>
      </div>
      
      {/* Matches List */}
      <div className="p-4 space-y-3">
        {matchdayMatches.map(match => (
          <MatchCard 
            key={match.id} 
            match={match}
            getTeamById={getTeamById}
            onPlay={onPlayMatch}
            compact
          />
        ))}
      </div>
    </div>
  );
};
