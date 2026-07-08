import { useState, useEffect } from "react";
import { 
  CompetitionType, 
  CompetitionConfig, 
  MatchFormat,
  QualificationRule,
  DrawMethod,
  DrawPot,
  getCompetitionTypeName,
  getMatchFormatName,
  getQualificationRuleName,
  isValidGroupsTeamCount,
  isValidKnockoutTeamCount,
  calculateByes,
} from "@/types/competition";
import { Team } from "@/types/game";
import { getLevelColor } from "@/data/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch as SwitchComponent } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  Layers, 
  Target, 
  Shuffle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Sparkles,
  Crown,
  Swords,
  GitBranch,
  Medal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface CompetitionConfigDialogProps {
  onCreateCompetition: (config: CompetitionConfig) => void;
  teamLevels: Record<string, 1 | 2 | 3 | 4>;
}

// Custom team structure for editable teams
interface CustomTeam {
  id: string;
  name: string;
  shortName: string;
  level: 1 | 2 | 3 | 4;
}

// Competition type info for cards
const competitionTypeInfo: Record<CompetitionType, { icon: React.ReactNode; description: string; color: string }> = {
  league: { 
    icon: <Medal className="w-5 h-5" />, 
    description: "Todos contra todos, acumulando puntos", 
    color: "from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:border-blue-500/60" 
  },
  league_playoffs: { 
    icon: <GitBranch className="w-5 h-5" />, 
    description: "Liga regular + playoffs finales", 
    color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/60" 
  },
  knockout: { 
    icon: <Swords className="w-5 h-5" />, 
    description: "Eliminación directa desde el inicio", 
    color: "from-red-500/20 to-red-500/5 border-red-500/30 hover:border-red-500/60" 
  },
  groups_knockout: { 
    icon: <Crown className="w-5 h-5" />, 
    description: "Fase de grupos + eliminatorias", 
    color: "from-purple-500/20 to-purple-500/5 border-purple-500/30 hover:border-purple-500/60" 
  },
  qualifying_groups_knockout: { 
    icon: <Sparkles className="w-5 h-5" />, 
    description: "Clasificatoria + grupos + eliminatorias", 
    color: "from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:border-amber-500/60" 
  },
};

export const CompetitionConfigDialog = ({
  onCreateCompetition,
  teamLevels,
}: CompetitionConfigDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("type");
  
  // Basic config
  const [name, setName] = useState("Copa Internacional 2026");
  const [competitionType, setCompetitionType] = useState<CompetitionType>("groups_knockout");
  
  // Custom teams
  const [teamCount, setTeamCount] = useState(16);
  const [customTeams, setCustomTeams] = useState<CustomTeam[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  
  // Group config
  const [groupMatchFormat, setGroupMatchFormat] = useState<MatchFormat>("double");
  const [qualificationRule, setQualificationRule] = useState<QualificationRule>("first_second");
  const [bestThirdsCount, setBestThirdsCount] = useState(4);
  
  // Knockout config
  const [knockoutMatchFormat, setKnockoutMatchFormat] = useState<MatchFormat>("double");
  const [finalFormat, setFinalFormat] = useState<MatchFormat>("neutral");
  const [seedByPosition, setSeedByPosition] = useState(true);
  
  // Qualifying config
  const [qualifyingRounds, setQualifyingRounds] = useState(1);
  const [qualifyingTeams, setQualifyingTeams] = useState(8);
  const [qualifyingFormat, setQualifyingFormat] = useState<MatchFormat>("double");
  const [directToGroups, setDirectToGroups] = useState(24);
  
  // Draw config
  const [drawMethod, setDrawMethod] = useState<DrawMethod>("visual");
  const [pots, setPots] = useState<DrawPot[]>([
    { id: "pot-1", name: "Bombo 1", teamIds: [] },
    { id: "pot-2", name: "Bombo 2", teamIds: [] },
    { id: "pot-3", name: "Bombo 3", teamIds: [] },
    { id: "pot-4", name: "Bombo 4", teamIds: [] },
  ]);
  
  // Initialize custom teams when team count changes
  useEffect(() => {
    const newTeams: CustomTeam[] = [];
    for (let i = 1; i <= teamCount; i++) {
      const existingTeam = customTeams.find(t => t.id === `team-${i}`);
      if (existingTeam) {
        newTeams.push(existingTeam);
      } else {
        newTeams.push({
          id: `team-${i}`,
          name: `Equipo ${i}`,
          shortName: `E${i}`,
          level: 3,
        });
      }
    }
    setCustomTeams(newTeams);
    
    // Clear pots when team count changes
    setPots([
      { id: "pot-1", name: "Bombo 1", teamIds: [] },
      { id: "pot-2", name: "Bombo 2", teamIds: [] },
      { id: "pot-3", name: "Bombo 3", teamIds: [] },
      { id: "pot-4", name: "Bombo 4", teamIds: [] },
    ]);
  }, [teamCount]);
  
  // Derived calculations
  const numTeams = customTeams.length;
  const numGroups = Math.floor(numTeams / 4);
  const teamsPerPot = numGroups;

  const needsGroups = competitionType === "groups_knockout" || competitionType === "qualifying_groups_knockout";
  const needsKnockout = competitionType !== "league";
  const needsQualifying = competitionType === "qualifying_groups_knockout";

  // Keep "mejores terceros" from exceeding the number of groups available
  useEffect(() => {
    if (bestThirdsCount > numGroups) {
      const validOptions = [4, 6, 8].filter(n => n <= numGroups);
      setBestThirdsCount(validOptions[validOptions.length - 1] || 0);
    }
  }, [numGroups, bestThirdsCount]);

  // Validation
  const isValidTeamCount = (): { valid: boolean; message: string } => {
    if (numTeams < 4) {
      return { valid: false, message: "Se requieren al menos 4 equipos" };
    }
    
    if (needsGroups && !isValidGroupsTeamCount(numTeams)) {
      return { valid: false, message: "Para grupos, el número de equipos debe ser múltiplo de 4" };
    }
    
    if (competitionType === "knockout" && !isValidKnockoutTeamCount(numTeams)) {
      return { valid: false, message: "Para eliminatoria, el número debe ser par" };
    }
    
    return { valid: true, message: `${numTeams} equipos válidos` };
  };
  
  // Validate that all pots have equal number of teams
  const isValidPotDistribution = (): { valid: boolean; message: string } => {
    if (!needsGroups) return { valid: true, message: "" };
    
    const teamsInPots = pots.reduce((sum, pot) => sum + pot.teamIds.length, 0);
    const selectedTeamIds = customTeams.map(t => t.id);
    const unassignedTeams = selectedTeamIds.filter(id => !pots.some(pot => pot.teamIds.includes(id))).length;
    
    if (unassignedTeams > 0) {
      return { valid: false, message: `${unassignedTeams} equipos sin asignar a bombos` };
    }
    
    const potSizes = pots.map(p => p.teamIds.length).filter(s => s > 0);
    if (potSizes.length === 0) {
      return { valid: false, message: "Debes asignar equipos a los bombos" };
    }
    
    const allSameSize = potSizes.every(size => size === potSizes[0]);
    if (!allSameSize) {
      return { valid: false, message: "Todos los bombos deben tener la misma cantidad de equipos" };
    }
    
    if (potSizes[0] !== numGroups) {
      return { valid: false, message: `Cada bombo debe tener ${numGroups} equipos (uno por grupo)` };
    }
    
    return { valid: true, message: `${teamsInPots} equipos distribuidos correctamente` };
  };
  
  const validation = isValidTeamCount();
  const potValidation = isValidPotDistribution();
  const byesNeeded = competitionType === "knockout" ? calculateByes(numTeams) : 0;
  
  // Auto-assign teams to pots based on level (balanced)
  const autoAssignPots = () => {
    if (numGroups === 0) {
      toast({ title: "Error", description: "Primero configura la cantidad de equipos", variant: "destructive" });
      return;
    }
    
    // Sort teams by level (1 = strongest, 4 = weakest)
    const sortedTeams = [...customTeams].sort((a, b) => a.level - b.level);
    
    const newPots: DrawPot[] = [
      { id: "pot-1", name: "Bombo 1", teamIds: [] },
      { id: "pot-2", name: "Bombo 2", teamIds: [] },
      { id: "pot-3", name: "Bombo 3", teamIds: [] },
      { id: "pot-4", name: "Bombo 4", teamIds: [] },
    ];
    
    // Distribute teams evenly across pots (teamsPerPot in each)
    sortedTeams.forEach((team, index) => {
      const potIndex = Math.floor(index / teamsPerPot);
      if (potIndex < 4) {
        newPots[potIndex].teamIds.push(team.id);
      }
    });
    
    setPots(newPots);
    toast({ title: "Bombos asignados", description: `Equipos distribuidos: ${teamsPerPot} por bombo` });
  };
  
  // Update team name
  const updateTeamName = (teamId: string, newName: string) => {
    setCustomTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, name: newName, shortName: newName.slice(0, 3).toUpperCase() }
        : team
    ));
  };
  
  // Update team level
  const updateTeamLevel = (teamId: string, newLevel: 1 | 2 | 3 | 4) => {
    setCustomTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, level: newLevel }
        : team
    ));
  };

  // Step indicator
  const tabs = [
    { id: "type", label: "Tipo", icon: Trophy },
    { id: "teams", label: "Equipos", icon: Users },
    { id: "phases", label: "Fases", icon: Layers },
    { id: "pots", label: "Bombos", icon: Shuffle, disabled: !needsGroups },
    { id: "summary", label: "Resumen", icon: Target },
  ];

  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
  
  // Handle create
  const handleCreate = () => {
    if (!validation.valid) {
      toast({ title: "Error", description: validation.message, variant: "destructive" });
      return;
    }
    
    if (needsGroups && !potValidation.valid) {
      toast({ title: "Error en Bombos", description: potValidation.message, variant: "destructive" });
      return;
    }
    
    const config: CompetitionConfig = {
      id: `comp-${Date.now()}`,
      name,
      type: competitionType,
      participatingTeamIds: customTeams.map(t => t.id),
      drawMethod,
      pots: needsGroups ? pots : undefined,
      relegationSpots: 0,
      internationalCups: [],
      promotionPlayoffEnabled: false,
      promotionPlayoffSpots: 0,
      // Pass custom teams data for use in competition
      customTeams: customTeams,
    };
    
    if (needsGroups) {
      config.groupConfig = {
        numGroups,
        teamsPerGroup: 4,
        matchFormat: groupMatchFormat,
        qualificationRule,
        bestThirdsCount: qualificationRule === "first_second_best_thirds" ? bestThirdsCount : undefined,
      };
    }
    
    if (needsKnockout) {
      config.knockoutConfig = {
        totalTeams: needsGroups ? numGroups * 2 : numTeams,
        matchFormat: knockoutMatchFormat,
        finalFormat,
        seedByPosition,
      };
    }
    
    if (needsQualifying) {
      config.qualifyingConfig = {
        rounds: qualifyingRounds,
        teamsEntering: qualifyingTeams,
        matchFormat: qualifyingFormat,
        directToGroups,
      };
    }
    
    onCreateCompetition(config);
    setOpen(false);
    toast({ title: "Competencia creada", description: `${name} configurada exitosamente` });
  };

  const getLevelBadgeColor = (level: 1 | 2 | 3 | 4) => {
    switch (level) {
      case 1: return "bg-gradient-to-r from-yellow-400/30 to-yellow-500/20 border-yellow-500/50 text-yellow-700";
      case 2: return "bg-gradient-to-r from-blue-400/30 to-blue-500/20 border-blue-500/50 text-blue-700";
      case 3: return "bg-gradient-to-r from-gray-400/30 to-gray-500/20 border-gray-500/50 text-gray-700";
      case 4: return "bg-gradient-to-r from-red-400/30 to-red-500/20 border-red-500/50 text-red-700";
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
          <Trophy className="w-4 h-4" />
          Nueva Competencia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              Configurar Nueva Competencia
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Configura el formato, equipos y reglas de tu competencia paso a paso.
            </DialogDescription>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isCompleted = index < currentTabIndex;
              const isDisabled = tab.disabled;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300",
                    isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                    isCompleted && !isActive && "bg-primary/15 text-primary",
                    !isActive && !isCompleted && !isDisabled && "bg-muted/50 text-muted-foreground hover:bg-muted",
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {/* Type Tab */}
            <TabsContent value="type" className="m-0">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Nombre de la Competencia</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Copa del Mundo 2026"
                    className="text-lg font-medium h-12"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Tipo de Competencia</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Object.keys(competitionTypeInfo) as CompetitionType[]).map(type => {
                      const info = competitionTypeInfo[type];
                      const isSelected = competitionType === type;
                      
                      return (
                        <button
                          key={type}
                          onClick={() => setCompetitionType(type)}
                          className={cn(
                            "relative p-4 rounded-2xl border-2 text-left transition-all duration-300 group",
                            "bg-gradient-to-br",
                            info.color,
                            isSelected && "ring-2 ring-primary ring-offset-2 border-primary"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-background/80"
                            )}>
                              {info.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm">{getCompetitionTypeName(type)}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {info.description}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Teams Tab */}
            <TabsContent value="teams" className="m-0">
              <div className="space-y-4">
                {/* Team count selector */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label className="text-sm font-semibold">Cantidad de equipos</Label>
                    <Select
                      value={String(teamCount)}
                      onValueChange={(v) => setTeamCount(parseInt(v))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64].map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {n} equipos {needsGroups && n % 4 === 0 ? `(${n/4} grupos)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                    validation.valid 
                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30" 
                      : "bg-destructive/10 text-destructive border border-destructive/30"
                  )}>
                    {validation.valid ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{validation.message}</span>
                  </div>
                </div>
                
                {needsGroups && numTeams > 0 && (
                  <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        <strong>{numGroups}</strong> grupos de <strong>4</strong> equipos cada uno
                      </span>
                    </div>
                  </div>
                )}
                
                {competitionType === "knockout" && byesNeeded > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-700">
                    <strong>{byesNeeded}</strong> equipos pasarán directamente a la siguiente ronda (byes)
                  </div>
                )}
                
                {/* Teams list */}
                <div className="border-2 rounded-2xl overflow-hidden bg-card">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <Label className="text-sm font-semibold">Configurar equipos</Label>
                    <span className="text-xs text-muted-foreground">Clic en nombre para editar</span>
                  </div>
                  <div className="max-h-[45vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
                      {customTeams.map((team, index) => (
                        <div
                          key={team.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                            "bg-gradient-to-r from-background to-muted/30",
                            "hover:border-primary/30 hover:shadow-sm"
                          )}
                        >
                          <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          
                          {editingTeamId === team.id ? (
                            <Input
                              autoFocus
                              value={team.name}
                              onChange={(e) => updateTeamName(team.id, e.target.value)}
                              onBlur={() => setEditingTeamId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingTeamId(null);
                              }}
                              className="flex-1 h-8"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingTeamId(team.id)}
                              className="flex-1 text-left text-sm font-medium hover:text-primary flex items-center gap-1.5 group"
                            >
                              <span className="truncate">{team.name}</span>
                              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </button>
                          )}
                          
                          <Select
                            value={String(team.level)}
                            onValueChange={(v) => updateTeamLevel(team.id, parseInt(v) as 1 | 2 | 3 | 4)}
                          >
                            <SelectTrigger className={cn(
                              "w-24 h-8 text-xs font-medium border-2",
                              getLevelBadgeColor(team.level)
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">⭐ N1 Élite</SelectItem>
                              <SelectItem value="2">🔵 N2 Fuerte</SelectItem>
                              <SelectItem value="3">⚪ N3 Medio</SelectItem>
                              <SelectItem value="4">🔴 N4 Débil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <div className="h-4" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Phases Tab */}
            <TabsContent value="phases" className="m-0">
              <div className="space-y-6">
                {/* Qualifying Config */}
                {needsQualifying && (
                  <div className="space-y-4 p-5 bg-gradient-to-br from-amber-500/15 to-amber-500/5 rounded-2xl border-2 border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                      </div>
                      <Label className="text-base font-bold">Fase Previa (Clasificatoria)</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Rondas previas</Label>
                        <Select
                          value={String(qualifyingRounds)}
                          onValueChange={(v) => setQualifyingRounds(parseInt(v))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} ronda{n > 1 ? 's' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Equipos en fase previa</Label>
                        <Select
                          value={String(qualifyingTeams)}
                          onValueChange={(v) => setQualifyingTeams(parseInt(v))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[4, 8, 12, 16, 24, 32].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} equipos</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Formato partidos</Label>
                        <Select
                          value={qualifyingFormat}
                          onValueChange={(v) => setQualifyingFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["single", "double"] as MatchFormat[]).map(f => (
                              <SelectItem key={f} value={f}>{getMatchFormatName(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Directo a grupos</Label>
                        <Select
                          value={String(directToGroups)}
                          onValueChange={(v) => setDirectToGroups(parseInt(v))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[16, 24, 28, 32].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} equipos</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Groups Config */}
                {needsGroups && (
                  <div className="space-y-4 p-5 bg-gradient-to-br from-blue-500/15 to-blue-500/5 rounded-2xl border-2 border-blue-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-blue-600" />
                      </div>
                      <Label className="text-base font-bold">Fase de Grupos</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Formato partidos</Label>
                        <Select
                          value={groupMatchFormat}
                          onValueChange={(v) => setGroupMatchFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["single", "double"] as MatchFormat[]).map(f => (
                              <SelectItem key={f} value={f}>{getMatchFormatName(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Clasificación</Label>
                        <Select
                          value={qualificationRule}
                          onValueChange={(v) => setQualificationRule(v as QualificationRule)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["first_only", "first_second", "first_second_best_thirds"] as QualificationRule[]).map(r => (
                              <SelectItem key={r} value={r}>{getQualificationRuleName(r)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {qualificationRule === "first_second_best_thirds" && (
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs font-medium text-muted-foreground">Mejores terceros que clasifican</Label>
                          <Select
                            value={String(bestThirdsCount)}
                            onValueChange={(v) => setBestThirdsCount(parseInt(v))}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[4, 6, 8].filter(n => n <= numGroups).map(n => (
                                <SelectItem key={n} value={String(n)}>{n} mejores terceros</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Knockout Config */}
                {needsKnockout && (
                  <div className="space-y-4 p-5 bg-gradient-to-br from-purple-500/15 to-purple-500/5 rounded-2xl border-2 border-purple-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Swords className="w-4 h-4 text-purple-600" />
                      </div>
                      <Label className="text-base font-bold">Eliminatorias</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Formato partidos</Label>
                        <Select
                          value={knockoutMatchFormat}
                          onValueChange={(v) => setKnockoutMatchFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["single", "double", "neutral"] as MatchFormat[]).map(f => (
                              <SelectItem key={f} value={f}>{getMatchFormatName(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Formato final</Label>
                        <Select
                          value={finalFormat}
                          onValueChange={(v) => setFinalFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["single", "double", "neutral"] as MatchFormat[]).map(f => (
                              <SelectItem key={f} value={f}>{getMatchFormatName(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl">
                      <div>
                        <Label className="text-sm font-medium">Cruces por posición</Label>
                        <p className="text-xs text-muted-foreground">1° vs último de grupo opuesto</p>
                      </div>
                      <SwitchComponent
                        checked={seedByPosition}
                        onCheckedChange={setSeedByPosition}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Pots Tab */}
            <TabsContent value="pots" className="m-0">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shuffle className="w-4 h-4 text-primary" />
                    </div>
                    <Label className="text-base font-bold">Configuración de Bombos</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={autoAssignPots} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Auto-asignar por nivel
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={drawMethod === "automatic" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDrawMethod("automatic")}
                    className="flex-1"
                  >
                    Sorteo Automático
                  </Button>
                  <Button
                    variant={drawMethod === "visual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDrawMethod("visual")}
                    className="flex-1"
                  >
                    Sorteo Visual
                  </Button>
                </div>
                
                {/* Pot Validation Message */}
                <div className={cn(
                  "p-3 rounded-xl flex items-center gap-2 text-sm font-medium",
                  potValidation.valid 
                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30"
                    : "bg-destructive/10 text-destructive border border-destructive/30"
                )}>
                  {potValidation.valid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{potValidation.message || `Cada bombo debe tener ${numGroups} equipos`}</span>
                </div>
                
                {/* Pots and unassigned teams in scrollable container */}
                <div className="border-2 rounded-2xl overflow-hidden bg-card">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <div className="space-y-4 p-4">
                      {/* Pots */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {pots.map((pot, potIndex) => {
                          const expectedCount = numGroups;
                          const isCorrectCount = pot.teamIds.length === expectedCount;
                          const potColors = [
                            "from-yellow-500/20 to-yellow-500/5 border-yellow-500/40",
                            "from-blue-500/20 to-blue-500/5 border-blue-500/40",
                            "from-gray-500/20 to-gray-500/5 border-gray-500/40",
                            "from-red-500/20 to-red-500/5 border-red-500/40",
                          ];
                          
                          return (
                            <div key={pot.id} className={cn(
                              "p-4 rounded-xl space-y-3 border-2 bg-gradient-to-br",
                              isCorrectCount ? potColors[potIndex] : "border-amber-500 bg-amber-500/10"
                            )}>
                              <div className="flex items-center justify-between">
                                <Label className="font-bold">{pot.name}</Label>
                                <Badge variant={isCorrectCount ? "secondary" : "destructive"} className="font-mono">
                                  {pot.teamIds.length}/{expectedCount}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                                {pot.teamIds.length === 0 ? (
                                  <span className="text-xs text-muted-foreground italic">Sin equipos</span>
                                ) : (
                                  pot.teamIds.map(teamId => {
                                    const team = customTeams.find(t => t.id === teamId);
                                    return (
                                      <Badge 
                                        key={teamId} 
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-destructive/20 text-xs group transition-colors"
                                        onClick={() => {
                                          setPots(prev => prev.map((p, i) => 
                                            i === potIndex 
                                              ? { ...p, teamIds: p.teamIds.filter(id => id !== teamId) }
                                              : p
                                          ));
                                        }}
                                      >
                                        {team?.name || teamId}
                                        <Trash2 className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100" />
                                      </Badge>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Unassigned teams */}
                      <div className="p-4 border-2 border-dashed rounded-xl space-y-3">
                        <Label className="text-sm font-bold">Equipos sin asignar</Label>
                        <div className="flex flex-wrap gap-2">
                          {customTeams
                            .filter(team => !pots.some(pot => pot.teamIds.includes(team.id)))
                            .map(team => (
                              <Select
                                key={team.id}
                                onValueChange={(potId) => {
                                  setPots(prev => prev.map(pot => 
                                    pot.id === potId 
                                      ? { ...pot, teamIds: [...pot.teamIds, team.id] }
                                      : pot
                                  ));
                                }}
                              >
                                <SelectTrigger className="w-auto h-8 text-xs max-w-[160px] bg-background">
                                  <span className="truncate">{team.name}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {pots.map(pot => (
                                    <SelectItem key={pot.id} value={pot.id}>
                                      {pot.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ))}
                          {customTeams.filter(team => !pots.some(pot => pot.teamIds.includes(team.id))).length === 0 && (
                            <div className="flex items-center gap-2 text-sm text-emerald-600">
                              <CheckCircle2 className="w-4 h-4" />
                              Todos los equipos están asignados
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="m-0">
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border-2 border-primary/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                      <Trophy className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl">{name}</h3>
                      <p className="text-sm text-muted-foreground">{getCompetitionTypeName(competitionType)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-background/50 rounded-xl">
                      <div className="text-xs text-muted-foreground">Equipos</div>
                      <div className="font-display text-xl">{numTeams}</div>
                    </div>
                    {needsGroups && (
                      <div className="p-3 bg-background/50 rounded-xl">
                        <div className="text-xs text-muted-foreground">Grupos</div>
                        <div className="font-display text-xl">{numGroups}</div>
                      </div>
                    )}
                    {needsGroups && (
                      <div className="p-3 bg-background/50 rounded-xl">
                        <div className="text-xs text-muted-foreground">Clasifican</div>
                        <div className="text-sm font-medium">{getQualificationRuleName(qualificationRule)}</div>
                      </div>
                    )}
                    <div className="p-3 bg-background/50 rounded-xl">
                      <div className="text-xs text-muted-foreground">Eliminatorias</div>
                      <div className="text-sm font-medium">{getMatchFormatName(knockoutMatchFormat)}</div>
                    </div>
                    <div className="p-3 bg-background/50 rounded-xl">
                      <div className="text-xs text-muted-foreground">Final</div>
                      <div className="text-sm font-medium">{getMatchFormatName(finalFormat)}</div>
                    </div>
                    <div className="p-3 bg-background/50 rounded-xl">
                      <div className="text-xs text-muted-foreground">Sorteo</div>
                      <div className="text-sm font-medium">{drawMethod === "visual" ? "Visual" : "Automático"}</div>
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "p-4 rounded-xl flex items-center gap-3",
                  validation.valid && potValidation.valid
                    ? "bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-700"
                    : "bg-destructive/10 border-2 border-destructive/30 text-destructive"
                )}>
                  {validation.valid && potValidation.valid ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {!validation.valid ? "Error en configuración" : !potValidation.valid ? "Error en bombos" : "¡Todo listo!"}
                    </div>
                    <div className="text-sm opacity-80">
                      {!validation.valid ? validation.message : !potValidation.valid ? potValidation.message : "La configuración está completa y lista para crear"}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter className="flex-shrink-0 gap-2 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!validation.valid || (needsGroups && !potValidation.valid)}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
          >
            <Trophy className="w-4 h-4" />
            Crear Competencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
