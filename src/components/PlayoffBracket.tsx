import { TeamStanding, Team, TournamentConfig, PlayoffFormat, Match } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayoffMatch {
  id: string;
  round: number; // 1 = final, 2 = semifinal, 3 = quarterfinal, etc.
  position: number; // position within round
  team1Id: string | null;
  team2Id: string | null;
  team1Score?: number;
  team2Score?: number;
  team1ScoreLeg2?: number; // For two-leg format
  team2ScoreLeg2?: number;
  winnerId?: string;
  played: boolean;
  isNeutralVenue: boolean; // For finals or single-leg format
}

interface PlayoffBracketProps {
  standings: TeamStanding[];
  tournamentConfig: TournamentConfig;
  getTeamById: (id: string) => Team | undefined;
  regularSeasonComplete: boolean;
  playoffMatches?: PlayoffMatch[];
}

export const PlayoffBracket = ({
  standings,
  tournamentConfig,
  getTeamById,
  regularSeasonComplete,
  playoffMatches = [],
}: PlayoffBracketProps) => {
  if (!tournamentConfig.playoffsEnabled || !regularSeasonComplete) {
    return null;
  }

  const playoffsTeams = tournamentConfig.playoffsTeams;
  const qualifiedTeams = standings.slice(0, playoffsTeams);
  
  // Calculate number of rounds based on teams
  const getRoundName = (round: number, totalRounds: number): string => {
    if (round === 1) return "Final";
    if (round === 2) return playoffsTeams >= 4 ? "Semifinales" : "Final";
    if (round === 3) return "Cuartos de Final";
    if (round === 4) return "Octavos de Final";
    return `Ronda ${round}`;
  };

  const getFormatDescription = (format: PlayoffFormat): string => {
    switch (format) {
      case "single":
        return "Todos los partidos a ida única, finales en cancha neutral";
      case "double":
        return "Ida y vuelta, final en cancha neutral";
      case "final_only":
        return "Ida y vuelta completo (incluyendo final)";
      default:
        return "";
    }
  };

  // Generate initial bracket matchups (higher seed vs lower seed)
  const generateBracket = () => {
    const rounds: { name: string; matches: { team1: Team | null; team2: Team | null; isNeutral: boolean }[] }[] = [];
    
    if (playoffsTeams === 2) {
      // Only final
      rounds.push({
        name: "Final",
        matches: [{
          team1: getTeamById(qualifiedTeams[0]?.teamId) || null,
          team2: getTeamById(qualifiedTeams[1]?.teamId) || null,
          isNeutral: tournamentConfig.playoffsFormat !== "final_only",
        }],
      });
    } else if (playoffsTeams === 4) {
      // Semifinals + Final
      rounds.push({
        name: "Semifinales",
        matches: [
          {
            team1: getTeamById(qualifiedTeams[0]?.teamId) || null, // 1st
            team2: getTeamById(qualifiedTeams[3]?.teamId) || null, // 4th
            isNeutral: tournamentConfig.playoffsFormat === "single",
          },
          {
            team1: getTeamById(qualifiedTeams[1]?.teamId) || null, // 2nd
            team2: getTeamById(qualifiedTeams[2]?.teamId) || null, // 3rd
            isNeutral: tournamentConfig.playoffsFormat === "single",
          },
        ],
      });
      rounds.push({
        name: "Final",
        matches: [{
          team1: null, // Winner SF1
          team2: null, // Winner SF2
          isNeutral: tournamentConfig.playoffsFormat !== "final_only",
        }],
      });
    } else if (playoffsTeams >= 8) {
      // Quarterfinals + Semifinals + Final
      rounds.push({
        name: "Cuartos de Final",
        matches: [
          {
            team1: getTeamById(qualifiedTeams[0]?.teamId) || null, // 1st vs 8th
            team2: getTeamById(qualifiedTeams[7]?.teamId) || null,
            isNeutral: tournamentConfig.playoffsFormat === "single",
          },
          {
            team1: getTeamById(qualifiedTeams[3]?.teamId) || null, // 4th vs 5th
            team2: getTeamById(qualifiedTeams[4]?.teamId) || null,
            isNeutral: tournamentConfig.playoffsFormat === "single",
          },
          {
            team1: getTeamById(qualifiedTeams[2]?.teamId) || null, // 3rd vs 6th
            team2: getTeamById(qualifiedTeams[5]?.teamId) || null,
            isNeutral: tournamentConfig.playoffsFormat === "single",
          },
          {
            team1: getTeamById(qualifiedTeams[1]?.teamId) || null, // 2nd vs 7th
            team2: getTeamById(qualifiedTeams[6]?.teamId) || null,
            isNeutral: tournamentConfig.playoffsFormat === "single",
          },
        ],
      });
      rounds.push({
        name: "Semifinales",
        matches: [
          { team1: null, team2: null, isNeutral: tournamentConfig.playoffsFormat === "single" },
          { team1: null, team2: null, isNeutral: tournamentConfig.playoffsFormat === "single" },
        ],
      });
      rounds.push({
        name: "Final",
        matches: [{
          team1: null,
          team2: null,
          isNeutral: tournamentConfig.playoffsFormat !== "final_only",
        }],
      });
    }
    
    return rounds;
  };

  const bracket = generateBracket();

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
                    "p-2 rounded-lg text-center border",
                    index === 0 && "bg-gold/10 border-gold/30",
                    index > 0 && "bg-purple-500/10 border-purple-500/30"
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

        {/* Bracket visualization */}
        <div className="space-y-6">
          {bracket.map((round, roundIndex) => (
            <div key={round.name}>
              <h4 className="text-sm font-semibold mb-3 text-center">
                {round.name}
                {round.matches[0]?.isNeutral && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Cancha Neutral)
                  </span>
                )}
              </h4>
              <div className={cn(
                "grid gap-3",
                round.matches.length === 1 && "max-w-xs mx-auto",
                round.matches.length === 2 && "grid-cols-2",
                round.matches.length === 4 && "grid-cols-2 lg:grid-cols-4"
              )}>
                {round.matches.map((match, matchIndex) => (
                  <div
                    key={matchIndex}
                    className={cn(
                      "border rounded-lg p-3 bg-muted/30",
                      round.name === "Final" && "border-gold/50 bg-gold/5"
                    )}
                  >
                    {/* Team 1 */}
                    <div className={cn(
                      "flex items-center justify-between p-2 rounded mb-2",
                      "bg-background border"
                    )}>
                      <span className="font-medium text-sm truncate">
                        {match.team1?.shortName || match.team1?.name || "Por definir"}
                      </span>
                      <span className="text-muted-foreground">-</span>
                    </div>
                    {/* VS */}
                    <div className="text-center text-xs text-muted-foreground py-1">vs</div>
                    {/* Team 2 */}
                    <div className={cn(
                      "flex items-center justify-between p-2 rounded",
                      "bg-background border"
                    )}>
                      <span className="font-medium text-sm truncate">
                        {match.team2?.shortName || match.team2?.name || "Por definir"}
                      </span>
                      <span className="text-muted-foreground">-</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Champion placeholder */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg">
            <Trophy className="w-5 h-5 text-gold" />
            <span className="font-display text-lg">Campeón: Por definir</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};