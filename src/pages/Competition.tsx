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
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Logo/Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 animate-pulse-subtle">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                Simulador de Torneos
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Crea y simula cualquier formato de competición con el sistema de dados. 
                Mundiales, Champions, Copas nacionales y más.
              </p>
            </div>

            {/* Main Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
            <Card className="group relative overflow-hidden border-0 bg-card/80 backdrop-blur shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
              <CardContent className="pt-8 pb-6 text-center space-y-4 relative">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Globe className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold">Fase de Grupos</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Grupos de 4 equipos con tablas de posiciones y clasificación automática.
                </p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 bg-card/80 backdrop-blur shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <CardContent className="pt-8 pb-6 text-center space-y-4 relative">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold">Sorteo Interactivo</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sorteo visual paso a paso con animaciones. Bombos configurables por nivel.
                </p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 bg-card/80 backdrop-blur shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
              <CardContent className="pt-8 pb-6 text-center space-y-4 relative">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold">Eliminatorias</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bracket automático con partidos de ida/vuelta o eliminación directa.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Background decoration */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        </div>
      </div>
    );
  }

  // Show competition view
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-lg font-bold">{competitionState.config.name}</span>
              <span className="hidden sm:inline text-sm text-muted-foreground ml-2">
                • {getPhaseLabel(competitionState.phase)}
              </span>
            </div>
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