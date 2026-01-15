import { Group, GroupMatch, GroupStanding, getGroupLetter } from "@/types/competition";
import { Team } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Play, Calendar, Trophy, CheckCircle2 } from "lucide-react";

interface GroupStageViewProps {
  groups: Group[];
  getTeamById: (id: string | null) => Team | undefined;
  onPlayMatch: (matchId: string, groupId: string) => void;
  onSimulateMatchday: (matchday: number) => void;
  qualificationSpots: number;
}

export const GroupStageView = ({
  groups,
  getTeamById,
  onPlayMatch,
  onSimulateMatchday,
  qualificationSpots,
}: GroupStageViewProps) => {
  // Calculate total matchdays
  const maxMatchday = Math.max(
    ...groups.flatMap(g => g.matches.map(m => m.matchday)),
    0
  );

  // Get match result display
  const getMatchResult = (match: GroupMatch) => {
    if (!match.played) return null;
    return `${match.homeGoals} - ${match.awayGoals}`;
  };

  // Get position color for qualification
  const getPositionStyle = (position: number) => {
    if (position <= qualificationSpots) {
      return "bg-green-500/20 text-green-600 font-bold";
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header with Matchday Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          Fase de Grupos
        </h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxMatchday }, (_, i) => i + 1).map(day => {
            const allPlayed = groups.every(g => 
              g.matches.filter(m => m.matchday === day).every(m => m.played)
            );
            return (
              <Button
                key={day}
                variant={allPlayed ? "outline" : "default"}
                size="sm"
                onClick={() => onSimulateMatchday(day)}
                disabled={allPlayed}
                className={cn(
                  "gap-1.5 transition-all",
                  allPlayed && "opacity-70"
                )}
              >
                {allPlayed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                Fecha {day}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Groups Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 h-auto flex-wrap">
          <TabsTrigger value="all" className="font-medium">Todos</TabsTrigger>
          {groups.map((group, index) => (
            <TabsTrigger key={group.id} value={group.id} className="font-medium">
              Grupo {getGroupLetter(index)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Groups View */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group, groupIndex) => (
              <GroupCard
                key={group.id}
                group={group}
                groupIndex={groupIndex}
                getTeamById={getTeamById}
                onPlayMatch={onPlayMatch}
                qualificationSpots={qualificationSpots}
                getPositionStyle={getPositionStyle}
              />
            ))}
          </div>
        </TabsContent>

        {/* Individual Group Views */}
        {groups.map((group, groupIndex) => (
          <TabsContent key={group.id} value={group.id}>
            <GroupDetailView
              group={group}
              groupIndex={groupIndex}
              getTeamById={getTeamById}
              onPlayMatch={onPlayMatch}
              qualificationSpots={qualificationSpots}
              getPositionStyle={getPositionStyle}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Group Card Component
const GroupCard = ({
  group,
  groupIndex,
  getTeamById,
  onPlayMatch,
  qualificationSpots,
  getPositionStyle,
}: {
  group: Group;
  groupIndex: number;
  getTeamById: (id: string | null) => Team | undefined;
  onPlayMatch: (matchId: string, groupId: string) => void;
  qualificationSpots: number;
  getPositionStyle: (position: number) => string;
}) => {
  const completedMatches = group.matches.filter(m => m.played).length;
  const totalMatches = group.matches.length;
  const progress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  return (
    <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-display font-bold text-sm shadow-sm">
              {getGroupLetter(groupIndex)}
            </span>
            <span className="font-display text-lg">Grupo {getGroupLetter(groupIndex)}</span>
          </div>
          <Badge variant="secondary" className="font-medium">
            {completedMatches}/{totalMatches}
          </Badge>
        </CardTitle>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="text-center w-8">PJ</TableHead>
              <TableHead className="text-center w-8">DG</TableHead>
              <TableHead className="text-center w-12 font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.standings.map((standing) => {
              const team = getTeamById(standing.teamId);
              return (
                <TableRow 
                  key={standing.teamId}
                  className={cn(
                    "transition-colors",
                    getPositionStyle(standing.position)
                  )}
                >
                  <TableCell className="font-bold text-center">
                    {standing.position}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {team?.name || standing.teamId}
                  </TableCell>
                  <TableCell className="text-center">{standing.played}</TableCell>
                  <TableCell className="text-center">
                    {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                  </TableCell>
                  <TableCell className="text-center font-bold">{standing.points}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Group Detail View Component
const GroupDetailView = ({
  group,
  groupIndex,
  getTeamById,
  onPlayMatch,
  qualificationSpots,
  getPositionStyle,
}: {
  group: Group;
  groupIndex: number;
  getTeamById: (id: string | null) => Team | undefined;
  onPlayMatch: (matchId: string, groupId: string) => void;
  qualificationSpots: number;
  getPositionStyle: (position: number) => string;
}) => {
  // Group matches by matchday
  const matchesByMatchday = group.matches.reduce((acc, match) => {
    if (!acc[match.matchday]) acc[match.matchday] = [];
    acc[match.matchday].push(match);
    return acc;
  }, {} as Record<number, GroupMatch[]>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Standings Table */}
      <Card>
        <CardHeader className="py-3 px-4 bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tabla - Grupo {getGroupLetter(groupIndex)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8">#</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead className="text-center w-10">PJ</TableHead>
                <TableHead className="text-center w-10">G</TableHead>
                <TableHead className="text-center w-10">E</TableHead>
                <TableHead className="text-center w-10">P</TableHead>
                <TableHead className="text-center w-12">GF</TableHead>
                <TableHead className="text-center w-12">GC</TableHead>
                <TableHead className="text-center w-12">DG</TableHead>
                <TableHead className="text-center w-12 font-bold">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.standings.map((standing) => {
                const team = getTeamById(standing.teamId);
                return (
                  <TableRow 
                    key={standing.teamId}
                    className={cn(
                      "transition-colors",
                      getPositionStyle(standing.position)
                    )}
                  >
                    <TableCell className="font-bold text-center">
                      {standing.position}
                    </TableCell>
                    <TableCell className="font-medium">
                      {team?.name || standing.teamId}
                    </TableCell>
                    <TableCell className="text-center">{standing.played}</TableCell>
                    <TableCell className="text-center">{standing.won}</TableCell>
                    <TableCell className="text-center">{standing.drawn}</TableCell>
                    <TableCell className="text-center">{standing.lost}</TableCell>
                    <TableCell className="text-center">{standing.goalsFor}</TableCell>
                    <TableCell className="text-center">{standing.goalsAgainst}</TableCell>
                    <TableCell className="text-center">
                      {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                    </TableCell>
                    <TableCell className="text-center font-bold">{standing.points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Matches */}
      <Card>
        <CardHeader className="py-3 px-4 bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Partidos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4 space-y-4">
          {Object.entries(matchesByMatchday).map(([matchday, matches]) => (
            <div key={matchday} className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Fecha {matchday}
              </h4>
              {matches.map(match => {
                const homeTeam = getTeamById(match.homeTeamId);
                const awayTeam = getTeamById(match.awayTeamId);
                
                return (
                                  <div 
                                    key={match.id}
                                    className={cn(
                                      "flex items-center gap-2 py-2 px-3 rounded-lg",
                                      match.played ? "bg-muted/50" : "bg-muted/30 border border-dashed"
                                    )}
                                  >
                                    <span className="flex-1 text-right text-xs font-medium truncate">
                                      {homeTeam?.name}
                                    </span>
                                    
                                    {match.played ? (
                                      <span className="px-3 py-1 rounded bg-primary/10 font-bold text-sm min-w-[60px] text-center">
                                        {match.homeGoals} - {match.awayGoals}
                                      </span>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onPlayMatch(match.id, group.id)}
                                        className="gap-1 h-7"
                                      >
                                        <Play className="w-3 h-3" />
                                        Jugar
                                      </Button>
                    )}
                    
                                    <span className="flex-1 text-left text-xs font-medium truncate">
                                      {awayTeam?.name}
                                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
