import { useState } from "react";
import { Match } from "@/types/game";
import { MatchCard } from "./MatchCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface FixtureViewProps {
  matches: Match[];
  totalMatchdays: number;
  getMatchesByMatchday: (matchday: number) => Match[];
  onPlayMatch: (matchId: string) => void;
}

export const FixtureView = ({ 
  matches, 
  totalMatchdays, 
  getMatchesByMatchday,
  onPlayMatch 
}: FixtureViewProps) => {
  const [currentMatchday, setCurrentMatchday] = useState(1);
  
  const matchdayMatches = getMatchesByMatchday(currentMatchday);
  const playedInMatchday = matchdayMatches.filter(m => m.played).length;
  const totalInMatchday = matchdayMatches.length;
  
  const isFirstHalf = currentMatchday <= totalMatchdays / 2;

  return (
    <div className="bg-card rounded-xl border shadow-card overflow-hidden">
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Fixture
          </h2>
          <span className="text-sm opacity-80">
            {isFirstHalf ? "Primera Rueda" : "Segunda Rueda"}
          </span>
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
            onPlay={onPlayMatch}
            compact
          />
        ))}
      </div>
    </div>
  );
};
