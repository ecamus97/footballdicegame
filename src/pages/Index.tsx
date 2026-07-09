import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useGameState, ExternalLigaInit } from "@/hooks/useGameState";
import { Header } from "@/components/Header";
import { FixtureView } from "@/components/FixtureView";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchSimulator } from "@/components/MatchSimulator";
import { PlayoffMatchSimulator } from "@/components/PlayoffMatchSimulator";
import { PlayoffBracket } from "@/components/PlayoffBracket";
import { Match, PlayoffMatch } from "@/types/game";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Trophy, Crown, BarChart3 } from "lucide-react";

const Index = () => {
  const location = useLocation();
  // When arriving from the universal competition config dialog ("/" ->
  // CompetitionConfigDialog -> navigate("/liga", { state })), this carries
  // the full league configuration so the game starts from it directly
  // instead of the hardcoded default championship or a stale autosave.
  const externalInit = (location.state as ExternalLigaInit | undefined)?.tournamentConfig
    ? (location.state as ExternalLigaInit)
    : undefined;

  const {
    matches,
    standings,
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
    saveGame,
    loadGame,
  } = useGameState(externalInit);
  
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
  const showPlayoffs = tournamentConfig.playoffsEnabled && regularSeasonComplete;
  const isSingleLeg = tournamentConfig.playoffsFormat === "single";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header
        onReset={resetTournament}
        tournamentConfig={tournamentConfig}
        onSave={saveGame}
        onLoad={loadGame}
        playedMatches={playedMatches}
        totalMatches={totalMatches}
      />

      {/* Enhanced Progress Bar */}
      <div className="bg-card/50 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-3">
              {regularSeasonComplete ? (
                <div className="flex items-center gap-2 text-gold font-medium">
                  <Trophy className="w-4 h-4" />
                  <span>¡Temporada Regular Completada!</span>
                </div>
              ) : (
                <span className="text-muted-foreground font-medium">Progreso del Torneo</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{playedMatches}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold">{totalMatches}</span>
              <span className="text-xs text-muted-foreground">partidos</span>
            </div>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-700 ease-out rounded-full ${
                regularSeasonComplete 
                  ? 'bg-gradient-to-r from-gold to-gold/80' 
                  : 'bg-gradient-to-r from-primary to-primary/80'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
            <span>0%</span>
            <span className="font-medium text-primary">{progress}%</span>
            <span>100%</span>
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
                  playoffMatches={playoffMatches}
                  playoffSeries={playoffSeries}
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
                playoffMatches={playoffMatches}
                playoffSeries={playoffSeries}
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
