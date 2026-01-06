import { useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { Header } from "@/components/Header";
import { FixtureView } from "@/components/FixtureView";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchSimulator } from "@/components/MatchSimulator";
import { Match } from "@/types/game";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Trophy } from "lucide-react";

const Index = () => {
  const { 
    matches, 
    standings,
    teams,
    teamLevels,
    teamNames,
    tournamentConfig,
    getTeamById,
    simulateMatch, 
    confirmMatchResult, 
    getMatchesByMatchday,
    totalMatchdays,
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

  const handlePlayMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match && !match.played) {
      setSelectedMatch(match);
    }
  };

  const playedMatches = matches.filter(m => m.played).length;
  const totalMatches = matches.length;
  const progress = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0;
  const hasPlayedMatches = playedMatches > 0;

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
            <span className="text-muted-foreground">Progreso del Torneo</span>
            <span className="font-medium">{playedMatches} / {totalMatches} partidos</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 rounded-full"
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
            <TabsList className="w-full mb-4">
              <TabsTrigger value="fixture" className="flex-1 gap-2">
                <Calendar className="w-4 h-4" />
                Fixture
              </TabsTrigger>
              <TabsTrigger value="standings" className="flex-1 gap-2">
                <Trophy className="w-4 h-4" />
                Tabla
              </TabsTrigger>
            </TabsList>
            <TabsContent value="fixture">
              <FixtureView
                matches={matches}
                totalMatchdays={totalMatchdays}
                getMatchesByMatchday={getMatchesByMatchday}
                getTeamById={getTeamById}
                onPlayMatch={handlePlayMatch}
              />
            </TabsContent>
            <TabsContent value="standings">
              <StandingsTable standings={standings} getTeamById={getTeamById} tournamentConfig={tournamentConfig} />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Desktop Grid */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6">
          <FixtureView
            matches={matches}
            totalMatchdays={totalMatchdays}
            getMatchesByMatchday={getMatchesByMatchday}
            getTeamById={getTeamById}
            onPlayMatch={handlePlayMatch}
          />
          <StandingsTable standings={standings} getTeamById={getTeamById} tournamentConfig={tournamentConfig} />
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
      
      {/* Pitch Pattern Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] pitch-pattern -z-10" />
    </div>
  );
};

export default Index;