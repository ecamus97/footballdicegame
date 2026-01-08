import { useState } from "react";
import { Match, Team, PlayoffMatch, PlayoffRound, TournamentConfig, MatchResult } from "@/types/game";
import { MatchCard } from "./MatchCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, FastForward, Play, Crown, Swords } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface FixtureViewProps {
  matches: Match[];
  totalMatchdays: number;
  getMatchesByMatchday: (matchday: number) => Match[];
  getTeamById: (id: string | null) => Team | undefined;
  onPlayMatch: (matchId: string) => void;
  onSimulateMatchdays?: (numMatchdays: number) => number;
  // Playoff props
  regularSeasonComplete?: boolean;
  tournamentConfig?: TournamentConfig;
  playoffMatches?: PlayoffMatch[];
  getPlayoffRoundName?: (round: PlayoffRound, leg?: number) => string;
  onPlayPlayoffMatch?: (matchId: string) => void;
}

type ViewMode = "regular" | "playoffs";

export const FixtureView = ({ 
  matches, 
  totalMatchdays, 
  getMatchesByMatchday,
  getTeamById,
  onPlayMatch,
  onSimulateMatchdays,
  regularSeasonComplete = false,
  tournamentConfig,
  playoffMatches = [],
  getPlayoffRoundName,
  onPlayPlayoffMatch,
}: FixtureViewProps) => {
  const [currentMatchday, setCurrentMatchday] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("regular");
  const [selectedPlayoffRound, setSelectedPlayoffRound] = useState<PlayoffRound | null>(null);
  
  const matchdayMatches = getMatchesByMatchday(currentMatchday);
  const playedInMatchday = matchdayMatches.filter(m => m.played).length;
  const totalInMatchday = matchdayMatches.length;
  
  const isFirstHalf = currentMatchday <= totalMatchdays / 2;

  // Calculate remaining matchdays
  const unplayedMatches = matches.filter(m => !m.played);
  const remainingMatchdays = unplayedMatches.length > 0 
    ? new Set(unplayedMatches.map(m => m.matchday)).size 
    : 0;

  // Group playoff matches by round
  const playoffRounds: PlayoffRound[] = [];
  if (tournamentConfig?.playoffsTeams && tournamentConfig.playoffsTeams >= 8) playoffRounds.push("quarterfinals");
  if (tournamentConfig?.playoffsTeams && tournamentConfig.playoffsTeams >= 4) playoffRounds.push("semifinals");
  if (tournamentConfig?.playoffsEnabled) playoffRounds.push("final");

  const getMatchesByRound = (round: PlayoffRound) => {
    return playoffMatches.filter(m => m.round === round).sort((a, b) => {
      if (a.matchNumber !== b.matchNumber) return a.matchNumber - b.matchNumber;
      return a.leg - b.leg;
    });
  };

  // Auto-select first available round when switching to playoffs
  const showPlayoffs = regularSeasonComplete && tournamentConfig?.playoffsEnabled && playoffMatches.length > 0;
  
  if (showPlayoffs && !selectedPlayoffRound && playoffRounds.length > 0) {
    setSelectedPlayoffRound(playoffRounds[0]);
  }

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
            {showPlayoffs && (
              <div className="flex gap-1">
                <Button
                  variant={viewMode === "regular" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setViewMode("regular")}
                >
                  Regular
                </Button>
                <Button
                  variant={viewMode === "playoffs" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setViewMode("playoffs")}
                >
                  <Crown className="w-3 h-3" />
                  Playoffs
                </Button>
              </div>
            )}
            {viewMode === "regular" && (
              <span className="text-sm opacity-80">
                {isFirstHalf ? "Primera Rueda" : "Segunda Rueda"}
              </span>
            )}
            {viewMode === "regular" && onSimulateMatchdays && remainingMatchdays > 0 && (
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
      
      {viewMode === "regular" ? (
        <>
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
            {matchdayMatches.map(match => {
              // Check if this is a "bye" match (team vs null opponent)
              const team1 = getTeamById(match.homeTeamId);
              const team2 = getTeamById(match.awayTeamId);
              const isByeMatch = !team1 || !team2;
              
              if (isByeMatch) {
                const restingTeam = team1 || team2;
                return (
                  <div 
                    key={match.id}
                    className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{restingTeam?.name || "Equipo"}</span>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-sm font-medium">
                      LIBRE
                    </span>
                  </div>
                );
              }
              
              return (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  getTeamById={getTeamById}
                  onPlay={onPlayMatch}
                  compact
                />
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Playoff Rounds Navigation */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-center gap-2">
              {playoffRounds.map(round => {
                const roundMatches = getMatchesByRound(round);
                const allPlayed = roundMatches.every(m => m.played);
                const somePlayed = roundMatches.some(m => m.played);
                const hasTeams = roundMatches.some(m => m.team1Id && m.team2Id);
                
                return (
                  <button
                    key={round}
                    onClick={() => setSelectedPlayoffRound(round)}
                    disabled={!hasTeams}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedPlayoffRound === round 
                        ? "bg-purple-600 text-white" 
                        : allPlayed
                        ? "bg-purple-500/20 text-purple-600"
                        : somePlayed
                        ? "bg-gold/30 text-gold-dark"
                        : hasTeams
                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                        : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                    )}
                  >
                    {getPlayoffRoundName ? getPlayoffRoundName(round) : round}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Playoff Matches */}
          <div className="p-4 space-y-3">
            {selectedPlayoffRound && getMatchesByRound(selectedPlayoffRound).map(match => {
              const team1 = match.team1Id ? getTeamById(match.team1Id) : null;
              const team2 = match.team2Id ? getTeamById(match.team2Id) : null;
              const canPlay = !match.played && team1 && team2;
              
              return (
                <Card 
                  key={match.id} 
                  className={cn(
                    "p-4 transition-all",
                    match.played && "bg-muted/30",
                    canPlay && "hover:border-purple-500/50 cursor-pointer"
                  )}
                  onClick={() => canPlay && onPlayPlayoffMatch?.(match.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Swords className="w-3 h-3" />
                      {getPlayoffRoundName ? getPlayoffRoundName(match.round, match.leg) : match.round}
                      {match.isNeutralVenue && " (Neutral)"}
                    </span>
                    {match.played ? (
                      <span className="text-xs text-green-600 font-medium">Jugado</span>
                    ) : canPlay ? (
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        <Play className="w-3 h-3 mr-1" />
                        Jugar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Por definir</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-right">
                      <span className={cn(
                        "font-medium",
                        !team1 && "text-muted-foreground italic"
                      )}>
                        {team1?.name || "Por definir"}
                      </span>
                    </div>
                    <div className="px-4 text-center min-w-[80px]">
                      {match.played ? (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-lg">
                            {match.team1Goals} - {match.team2Goals}
                          </span>
                          {match.penalties && (
                            <span className="text-xs text-muted-foreground">
                              (Pen: {match.penalties.team1Penalties}-{match.penalties.team2Penalties})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">vs</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <span className={cn(
                        "font-medium",
                        !team2 && "text-muted-foreground italic"
                      )}>
                        {team2?.name || "Por definir"}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
