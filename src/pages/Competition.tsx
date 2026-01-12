import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompetitionState } from "@/hooks/useCompetitionState";
import { CompetitionConfigDialog } from "@/components/CompetitionConfigDialog";
import { CompetitionView } from "@/components/CompetitionView";
import { CompetitionSaveLoad } from "@/components/CompetitionSaveLoad";
import { GroupMatchSimulator, GroupMatchResult } from "@/components/GroupMatchSimulator";
import { KnockoutMatchSimulator, KnockoutMatchResult } from "@/components/KnockoutMatchSimulator";
import { CompetitionConfig, GroupMatch, KnockoutMatch, KnockoutSeries, getGroupLetter, getKnockoutRoundName } from "@/types/competition";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, 
  Globe, 
  Users, 
  Crown,
  Sparkles
} from "lucide-react";

const Competition = () => {
  const navigate = useNavigate();
  
  const {
    competitionState,
    getTeamById,
    initializeCompetition,
    executeDrawStep,
    completeDraw,
    simulateGroupMatch,
    confirmGroupMatchResult,
    simulateGroupMatchday,
    isGroupStageComplete,
    advanceToKnockout,
    simulateKnockoutMatch,
    confirmKnockoutMatchResult,
    goToPhase,
    saveCompetition,
    loadCompetition,
    resetCompetition,
    teamLevels,
    setCustomTeamsData,
  } = useCompetitionState();

  // Group Match simulator state
  const [selectedMatch, setSelectedMatch] = useState<GroupMatch | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");

  // Knockout Match simulator state
  const [selectedKnockoutMatch, setSelectedKnockoutMatch] = useState<KnockoutMatch | null>(null);
  const [selectedKnockoutSeries, setSelectedKnockoutSeries] = useState<KnockoutSeries | null>(null);

  const handleCreateCompetition = (config: CompetitionConfig) => {
    // Redirect to liga page if league or league_playoffs type
    if (config.type === "league" || config.type === "league_playoffs") {
      navigate("/liga");
      return;
    }
    
    // Set custom teams data before initializing
    if (config.customTeams) {
      setCustomTeamsData(config.customTeams);
    }
    initializeCompetition(config);
  };

  const handlePlayGroupMatch = (matchId: string, groupId: string) => {
    if (!competitionState?.groups) return;
    
    const group = competitionState.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const match = group.matches.find(m => m.id === matchId);
    if (!match) return;
    
    const groupIndex = competitionState.groups.findIndex(g => g.id === groupId);
    
    setSelectedMatch(match);
    setSelectedGroupId(groupId);
    setSelectedGroupName(`Grupo ${getGroupLetter(groupIndex)}`);
  };

  const handleSimulateMatch = (matchId: string): GroupMatchResult | null => {
    return simulateGroupMatch(matchId);
  };

  const handleConfirmMatch = (matchId: string, result: GroupMatchResult) => {
    confirmGroupMatchResult(matchId, result);
    setSelectedMatch(null);
    setSelectedGroupId("");
  };

  const handleCloseSimulator = () => {
    setSelectedMatch(null);
    setSelectedGroupId("");
  };

  // Knockout match handlers
  const handlePlayKnockoutMatch = (matchId: string, seriesId: string) => {
    if (!competitionState?.knockoutMatches || !competitionState?.knockoutSeries) return;
    
    const match = competitionState.knockoutMatches.find(m => m.id === matchId);
    const series = competitionState.knockoutSeries.find(s => s.id === seriesId);
    
    if (match && series) {
      setSelectedKnockoutMatch(match);
      setSelectedKnockoutSeries(series);
    }
  };

  const handleSimulateKnockoutMatch = (matchId: string): KnockoutMatchResult | null => {
    return simulateKnockoutMatch(matchId);
  };

  const handleConfirmKnockoutMatch = (matchId: string, result: KnockoutMatchResult) => {
    confirmKnockoutMatchResult(matchId, result);
    setSelectedKnockoutMatch(null);
    setSelectedKnockoutSeries(null);
  };

  const handleCloseKnockoutSimulator = () => {
    setSelectedKnockoutMatch(null);
    setSelectedKnockoutSeries(null);
  };

  // Determine match format and leg info for knockout
  const getKnockoutMatchFormat = () => {
    if (!competitionState?.config.knockoutConfig) return "single";
    const format = selectedKnockoutMatch?.round === "final" 
      ? competitionState.config.knockoutConfig.finalFormat 
      : competitionState.config.knockoutConfig.matchFormat;
    return format;
  };

  const isSecondLeg = selectedKnockoutMatch?.leg === 2;
  const leg1Result = isSecondLeg && selectedKnockoutSeries
    ? {
        team1Goals: selectedKnockoutSeries.team2Aggregate || 0,
        team2Goals: selectedKnockoutSeries.team1Aggregate || 0,
      }
    : null;

  // Get current phase name
  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      setup: "Configuración",
      draw: "Sorteo",
      qualifying: "Fase Previa",
      groups: "Fase de Grupos",
      knockout: "Eliminatorias",
      complete: "Finalizado",
    };
    return labels[phase] || phase;
  };

  // Show landing if no competition
  if (!competitionState) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Motor Universal de Competiciones
            </div>
            
            <h1 className="text-5xl font-display font-bold tracking-tight">
              Crea Tu Torneo
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Configura cualquier formato: Mundiales, Champions, Copas, Ligas con Playoffs, y más.
            </p>

            <div className="flex items-center justify-center gap-3">
              <CompetitionConfigDialog 
                onCreateCompetition={handleCreateCompetition}
                teamLevels={teamLevels}
              />
              
              <CompetitionSaveLoad
                currentName=""
                currentPhase=""
                type="competition"
                onSave={(name) => saveCompetition(name)}
                onLoad={(data) => loadCompetition(data)}
              />
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            <Card className="group hover:shadow-lg transition-all border-2 hover:border-primary/30">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-semibold">Fase de Grupos</h3>
                <p className="text-sm text-muted-foreground">
                  Grupos de 4 equipos con tablas independientes y clasificación automática.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all border-2 hover:border-primary/30">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="font-semibold">Sorteo Visual</h3>
                <p className="text-sm text-muted-foreground">
                  Sorteo paso a paso con animaciones. Configura bombos según nivel.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all border-2 hover:border-primary/30">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Crown className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold">Eliminatorias</h3>
                <p className="text-sm text-muted-foreground">
                  Bracket automático con byes, ida/vuelta o partido único.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Formats */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="text-center text-lg font-semibold mb-6 text-muted-foreground">
              Formatos Populares
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { name: "Copa del Mundo", emoji: "🌍" },
                { name: "Champions League", emoji: "⭐" },
                { name: "Copa Libertadores", emoji: "🏆" },
                { name: "Liga", emoji: "🏟️" },
                { name: "Eliminatoria Directa", emoji: "⚔️" },
              ].map(format => (
                <div
                  key={format.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-sm"
                >
                  <span>{format.emoji}</span>
                  <span>{format.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show competition view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-semibold">{competitionState.config.name}</span>
          </div>
          
          <CompetitionSaveLoad
            currentName={competitionState.config.name}
            currentPhase={getPhaseLabel(competitionState.phase)}
            type="competition"
            onSave={(name) => saveCompetition(name)}
            onLoad={(data) => loadCompetition(data)}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <CompetitionView
          competitionState={competitionState}
          getTeamById={getTeamById}
          onDrawStep={executeDrawStep}
          onCompleteDraw={completeDraw}
          onPlayGroupMatch={handlePlayGroupMatch}
          onSimulateGroupMatchday={simulateGroupMatchday}
          isGroupStageComplete={isGroupStageComplete}
          onAdvanceToKnockout={advanceToKnockout}
          onPlayKnockoutMatch={handlePlayKnockoutMatch}
          onGoToPhase={goToPhase}
          onReset={resetCompetition}
        />
      </main>

      {/* Group Match Simulator Dialog */}
      <GroupMatchSimulator
        match={selectedMatch}
        groupName={selectedGroupName}
        getTeamById={getTeamById}
        onSimulate={handleSimulateMatch}
        onConfirm={handleConfirmMatch}
        onClose={handleCloseSimulator}
      />

      {/* Knockout Match Simulator Dialog */}
      <KnockoutMatchSimulator
        match={selectedKnockoutMatch}
        series={selectedKnockoutSeries}
        roundName={selectedKnockoutMatch ? getKnockoutRoundName(selectedKnockoutMatch.round) : ""}
        getTeamById={getTeamById}
        onSimulate={handleSimulateKnockoutMatch}
        onConfirm={handleConfirmKnockoutMatch}
        onClose={handleCloseKnockoutSimulator}
        matchFormat={getKnockoutMatchFormat()}
        isSecondLeg={isSecondLeg}
        leg1Result={leg1Result}
      />

      {/* Pitch Pattern Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] pitch-pattern -z-10" />
    </div>
  );
};

export default Competition;