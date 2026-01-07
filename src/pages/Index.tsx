import { useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { Header } from "@/components/Header";
import { FixtureView } from "@/components/FixtureView";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchSimulator } from "@/components/MatchSimulator";
import { PlayoffMatchSimulator } from "@/components/PlayoffMatchSimulator";
import { PlayoffBracket } from "@/components/PlayoffBracket";
import { Match, PlayoffMatch } from "@/types/game";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Trophy, Crown } from "lucide-react";

const Index = () => {
  const { 
    matches, 
    standings,
    teams,
    teamLevels,
    teamNames,
    tournamentConfig,
    playoffMatches,
    playoffSeries,
    getTeamById,
    simulateMatch, 
    confirmMatchResult,
    simulateMatchdays,
    getMatchesByMatchday,
    totalMatchdays,
    regularSeasonComplete,
    getPlayoffRoundName,
    confirmPlayoffMatchResult,
    getSeriesForMatch,
    getLeg1Match,
    resetTournament,
    updateTournamentConfig,
    applyConfigChanges,
    updateTeamLevel,
    resetTeamLevels,
    updateTeamName,
    resetTeamNames,
    saveGame,
    loadGame,
    deleteSavedGame,
    hasSavedGame,
    getSavedGameInfo,
  } = useGameState();
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedPlayoffMatch, setSelectedPlayoffMatch] = useState<PlayoffMatch | null>(null);

  const handlePlayMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match && !match.played) {
      setSelectedMatch(match);
    }
  };

  const handlePlayPlayoffMatch = (matchId: string) => {
    const match = playoffMatches.find(m => m.id === matchId);
    if (match && !match.played && match.team1Id && match.team2Id) {
      setSelectedPlayoffMatch(match);
    }
  };

  const playedMatches = matches.filter(m => m.played).length;
  const totalMatches = matches.length;
  const progress = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0;
  const hasPlayedMatches = playedMatches > 0;
  const showPlayoffs = tournamentConfig.playoffsEnabled && regularSeasonComplete;
  const isSingleLeg = tournamentConfig.playoffsFormat === "single";

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onReset={resetTournament}
        teams={teams}
        teamLevels={teamLevels}
        teamNames={teamNames}
        tournamentConfig={tournamentConfig}
        onUpdateConfig={updateTournamentConfig}
        onUpdateLevel={updateTeamLevel}
        onResetLevels={resetTeamLevels}
        onUpdateName={updateTeamName}
        onResetNames={resetTeamNames}
        onApplyChanges={applyConfigChanges}
        hasPlayedMatches={hasPlayedMatches}
        onSave={saveGame}
        onLoad={loadGame}
        onDeleteSave={deleteSavedGame}
        hasSavedGame={hasSavedGame}
        getSavedGameInfo={getSavedGameInfo}
      />
      
      {/* Progress Bar */}
      <div className="bg-muted border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {regularSeasonComplete ? "¡Temporada Regular Completada!" : "Progreso del Torneo"}
            </span>
            <span className="font-medium">{playedMatches} / {totalMatches} partidos</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${regularSeasonComplete ? 'bg-gold' : 'bg-primary'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Mobile Tabs */}
        <div className="lg:hidden">
          <Tabs defaultValue="fixture" className="w-full">
            <TabsList className={`w-full mb-4 ${showPlayoffs ? 'grid-cols-3' : ''}`}>
              <TabsTrigger value="fixture" className="flex-1 gap-2">
                <Calendar className="w-4 h-4" />
                Fixture
              </TabsTrigger>
              <TabsTrigger value="standings" className="flex-1 gap-2">
                <Trophy className="w-4 h-4" />
                Tabla
              </TabsTrigger>
              {showPlayoffs && (
                <TabsTrigger value="playoffs" className="flex-1 gap-2">
                  <Crown className="w-4 h-4" />
                  Playoffs
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="fixture">
              <FixtureView
                matches={matches}
                totalMatchdays={totalMatchdays}
                getMatchesByMatchday={getMatchesByMatchday}
                getTeamById={getTeamById}
                onPlayMatch={handlePlayMatch}
                onSimulateMatchdays={simulateMatchdays}
                regularSeasonComplete={regularSeasonComplete}
                tournamentConfig={tournamentConfig}
                playoffMatches={playoffMatches}
                getPlayoffRoundName={getPlayoffRoundName}
                onPlayPlayoffMatch={handlePlayPlayoffMatch}
              />
            </TabsContent>
            <TabsContent value="standings">
              <StandingsTable standings={standings} getTeamById={getTeamById} tournamentConfig={tournamentConfig} />
            </TabsContent>
            {showPlayoffs && (
              <TabsContent value="playoffs">
                <PlayoffBracket
                  standings={standings}
                  tournamentConfig={tournamentConfig}
                  getTeamById={getTeamById}
                  regularSeasonComplete={regularSeasonComplete}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
        
        {/* Desktop Grid */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FixtureView
              matches={matches}
              totalMatchdays={totalMatchdays}
              getMatchesByMatchday={getMatchesByMatchday}
              getTeamById={getTeamById}
              onPlayMatch={handlePlayMatch}
              onSimulateMatchdays={simulateMatchdays}
              regularSeasonComplete={regularSeasonComplete}
              tournamentConfig={tournamentConfig}
              playoffMatches={playoffMatches}
              getPlayoffRoundName={getPlayoffRoundName}
              onPlayPlayoffMatch={handlePlayPlayoffMatch}
            />
          </div>
          <div className="space-y-6">
            <StandingsTable standings={standings} getTeamById={getTeamById} tournamentConfig={tournamentConfig} />
            {showPlayoffs && (
              <PlayoffBracket
                standings={standings}
                tournamentConfig={tournamentConfig}
                getTeamById={getTeamById}
                regularSeasonComplete={regularSeasonComplete}
              />
            )}
          </div>
        </div>
      </main>
      
      {/* Match Simulator Modal */}
      <MatchSimulator
        match={selectedMatch}
        getTeamById={getTeamById}
        onSimulate={simulateMatch}
        onConfirm={confirmMatchResult}
        onClose={() => setSelectedMatch(null)}
      />
      
      {/* Playoff Match Simulator Modal */}
      <PlayoffMatchSimulator
        match={selectedPlayoffMatch}
        series={selectedPlayoffMatch ? getSeriesForMatch(selectedPlayoffMatch.id) : null}
        leg1Match={selectedPlayoffMatch ? getLeg1Match(selectedPlayoffMatch.id) : null}
        getTeamById={getTeamById}
        getPlayoffRoundName={getPlayoffRoundName}
        isSingleLeg={isSingleLeg}
        onConfirm={confirmPlayoffMatchResult}
        onClose={() => setSelectedPlayoffMatch(null)}
      />
      
      {/* Pitch Pattern Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] pitch-pattern -z-10" />
    </div>
  );
};

export default Index;