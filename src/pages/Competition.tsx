import { useState } from "react";
import { useCompetitionState } from "@/hooks/useCompetitionState";
import { CompetitionConfigDialog } from "@/components/CompetitionConfigDialog";
import { CompetitionView } from "@/components/CompetitionView";
import { CompetitionConfig } from "@/types/competition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, 
  Globe, 
  Users, 
  Crown,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

const Competition = () => {
  const {
    competitionState,
    getTeamById,
    initializeCompetition,
    executeDrawStep,
    completeDraw,
    simulateGroupMatch,
    confirmGroupMatchResult,
    simulateGroupMatchday,
    resetCompetition,
    teamLevels,
  } = useCompetitionState();

  const handleCreateCompetition = (config: CompetitionConfig) => {
    initializeCompetition(config);
  };

  const handlePlayGroupMatch = (matchId: string, groupId: string) => {
    const result = simulateGroupMatch(matchId);
    if (result) {
      confirmGroupMatchResult(matchId, result);
    }
  };

  // Show landing if no competition
  if (!competitionState) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Trophy className="w-5 h-5" />
              <span className="text-sm">← Volver a Liga</span>
            </Link>
          </div>
        </header>

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

            <CompetitionConfigDialog 
              onCreateCompetition={handleCreateCompetition}
              teamLevels={teamLevels}
            />
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
                { name: "Copa Nacional", emoji: "🏅" },
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
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Trophy className="w-5 h-5" />
            <span className="text-sm">← Volver a Liga</span>
          </Link>
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
          onReset={resetCompetition}
        />
      </main>

      {/* Pitch Pattern Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] pitch-pattern -z-10" />
    </div>
  );
};

export default Competition;
