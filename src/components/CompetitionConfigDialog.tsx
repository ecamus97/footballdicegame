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
  isPowerOf2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
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

export const CompetitionConfigDialog = ({
  onCreateCompetition,
  teamLevels,
}: CompetitionConfigDialogProps) => {
  const [open, setOpen] = useState(false);
  
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
    // First teamsPerPot teams go to pot 1, next to pot 2, etc.
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
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Trophy className="w-4 h-4" />
          Nueva Competencia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Configurar Nueva Competencia
          </DialogTitle>
          <DialogDescription>
            Configura el formato, equipos y reglas de tu competencia.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="type" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="type" className="gap-1">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Tipo</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Equipos</span>
            </TabsTrigger>
            <TabsTrigger value="phases" className="gap-1">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Fases</span>
            </TabsTrigger>
            <TabsTrigger value="pots" className="gap-1" disabled={!needsGroups}>
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Bombos</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-4 overflow-hidden">
            {/* Type Tab */}
            <TabsContent value="type" className="m-0 h-full overflow-y-auto pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la Competencia</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Copa del Mundo 2026"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Tipo de Competencia</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["league", "league_playoffs", "knockout", "groups_knockout", "qualifying_groups_knockout"] as CompetitionType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setCompetitionType(type)}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all",
                          competitionType === type 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="font-medium">{getCompetitionTypeName(type)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {type === "league" && "Todos contra todos"}
                          {type === "league_playoffs" && "Liga + eliminatorias finales"}
                          {type === "knockout" && "Eliminación directa desde el inicio"}
                          {type === "groups_knockout" && "Fase de grupos + eliminatorias"}
                          {type === "qualifying_groups_knockout" && "Clasificatoria + grupos + eliminatorias"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Teams Tab */}
            <TabsContent value="teams" className="m-0 h-full overflow-hidden flex flex-col">
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Team count selector */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex-1 space-y-2">
                    <Label>Cantidad de equipos participantes</Label>
                    <Select
                      value={String(teamCount)}
                      onValueChange={(v) => setTeamCount(parseInt(v))}
                    >
                      <SelectTrigger>
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
                  <div className="flex items-center gap-2">
                    {validation.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className={cn(
                      "text-sm",
                      validation.valid ? "text-green-600" : "text-destructive"
                    )}>
                      {validation.message}
                    </span>
                  </div>
                </div>
                
                {needsGroups && numTeams > 0 && (
                  <div className="p-3 bg-muted rounded-lg text-sm flex-shrink-0">
                    <strong>{numGroups}</strong> grupos de <strong>4</strong> equipos
                  </div>
                )}
                
                {competitionType === "knockout" && byesNeeded > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 flex-shrink-0">
                    <strong>{byesNeeded}</strong> equipos pasarán directamente a la siguiente ronda (byes)
                  </div>
                )}
                
                {/* Import from Excel */}
                <div className="flex-shrink-0">
                  <Label className="text-sm mb-2 block">Importar desde Excel</Label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const text = await file.text();
                        const lines = text.split('\n').filter(l => l.trim());
                        const newTeams = [...customTeams];
                        
                        lines.forEach((line, index) => {
                          if (index >= teamCount) return;
                          const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/"/g, ''));
                          const name = parts[0];
                          const levelStr = parts[1];
                          
                          if (name && newTeams[index]) {
                            newTeams[index] = {
                              ...newTeams[index],
                              name: name,
                              shortName: name.slice(0, 3).toUpperCase(),
                              level: levelStr ? (parseInt(levelStr) as 1 | 2 | 3 | 4) || newTeams[index].level : newTeams[index].level,
                            };
                          }
                        });
                        
                        setCustomTeams(newTeams);
                        toast({ title: "Equipos importados", description: `Se actualizaron ${Math.min(lines.length, teamCount)} equipos` });
                      } catch (error) {
                        toast({ title: "Error", description: "No se pudo leer el archivo", variant: "destructive" });
                      }
                      e.target.value = '';
                    }}
                    className="text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato CSV: Nombre,Nivel (1-4) - Una línea por equipo
                  </p>
                </div>
                
                {/* Teams list */}
                <div className="flex-1 min-h-0 border rounded-lg flex flex-col overflow-hidden">
                  <Label className="text-sm p-3 block border-b">Configurar equipos (clic en nombre para editar)</Label>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-4 pb-4">
                      {customTeams.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                        >
                          {editingTeamId === team.id ? (
                            <Input
                              autoFocus
                              value={team.name}
                              onChange={(e) => updateTeamName(team.id, e.target.value)}
                              onBlur={() => setEditingTeamId(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setEditingTeamId(null);
                              }}
                              className="flex-1 h-8"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingTeamId(team.id)}
                              className="flex-1 text-left text-sm font-medium hover:text-primary flex items-center gap-1"
                            >
                              {team.name}
                              <Edit2 className="w-3 h-3 opacity-50" />
                            </button>
                          )}
                          <Select
                            value={String(team.level)}
                            onValueChange={(v) => updateTeamLevel(team.id, parseInt(v) as 1 | 2 | 3 | 4)}
                          >
                            <SelectTrigger
                              className={cn("w-20 h-7 text-xs", getLevelColor(team.level))}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">N1 Élite</SelectItem>
                              <SelectItem value="2">N2 Fuerte</SelectItem>
                              <SelectItem value="3">N3 Medio</SelectItem>
                              <SelectItem value="4">N4 Débil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            
            {/* Phases Tab */}
            <TabsContent value="phases" className="m-0 h-full overflow-y-auto pr-4">
              <div className="space-y-6">
                {/* Qualifying Config */}
                {needsQualifying && (
                  <div className="space-y-3 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <Label className="text-base font-semibold">Fase Previa (Clasificatoria)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Rondas previas</Label>
                        <Select
                          value={String(qualifyingRounds)}
                          onValueChange={(v) => setQualifyingRounds(parseInt(v))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} ronda{n > 1 ? 's' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Equipos en fase previa</Label>
                        <Select
                          value={String(qualifyingTeams)}
                          onValueChange={(v) => setQualifyingTeams(parseInt(v))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[4, 8, 12, 16, 24, 32].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} equipos</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Formato partidos</Label>
                        <Select
                          value={qualifyingFormat}
                          onValueChange={(v) => setQualifyingFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["single", "double"] as MatchFormat[]).map(f => (
                              <SelectItem key={f} value={f}>{getMatchFormatName(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Directo a grupos</Label>
                        <Select
                          value={String(directToGroups)}
                          onValueChange={(v) => setDirectToGroups(parseInt(v))}
                        >
                          <SelectTrigger className="h-8">
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
                  <div className="space-y-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Label className="text-base font-semibold">Fase de Grupos</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Formato partidos</Label>
                        <Select
                          value={groupMatchFormat}
                          onValueChange={(v) => setGroupMatchFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["single", "double"] as MatchFormat[]).map(f => (
                              <SelectItem key={f} value={f}>{getMatchFormatName(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Clasificación</Label>
                        <Select
                          value={qualificationRule}
                          onValueChange={(v) => setQualificationRule(v as QualificationRule)}
                        >
                          <SelectTrigger className="h-8">
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
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs">Mejores terceros que clasifican</Label>
                          <Select
                            value={String(bestThirdsCount)}
                            onValueChange={(v) => setBestThirdsCount(parseInt(v))}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[4, 6, 8].map(n => (
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
                  <div className="space-y-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Label className="text-base font-semibold">Eliminatorias</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Formato partidos</Label>
                        <Select
                          value={knockoutMatchFormat}
                          onValueChange={(v) => setKnockoutMatchFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["single", "double", "neutral"] as MatchFormat[]).map(f => (
                              <SelectItem key={f} value={f}>{getMatchFormatName(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Formato final</Label>
                        <Select
                          value={finalFormat}
                          onValueChange={(v) => setFinalFormat(v as MatchFormat)}
                        >
                          <SelectTrigger className="h-8">
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
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <Label className="text-sm">Cruces por posición</Label>
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
            <TabsContent value="pots" className="m-0 h-full flex flex-col">
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Configuración de Bombos</Label>
                  <Button variant="outline" size="sm" onClick={autoAssignPots}>
                    <Shuffle className="w-4 h-4 mr-1" />
                    Auto-asignar por nivel
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Método de sorteo</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={drawMethod === "automatic" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDrawMethod("automatic")}
                    >
                      Automático
                    </Button>
                    <Button
                      variant={drawMethod === "visual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDrawMethod("visual")}
                    >
                      Visual paso a paso
                    </Button>
                  </div>
                </div>
                
                {/* Pot Validation Message */}
                <div className={cn(
                  "p-2 rounded-lg flex items-center gap-2 text-sm",
                  potValidation.valid 
                    ? "bg-green-500/10 text-green-600"
                    : "bg-destructive/10 text-destructive"
                )}>
                  {potValidation.valid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{potValidation.message || `Cada bombo debe tener ${numGroups} equipos`}</span>
                </div>
                
                {/* Pots and unassigned teams in scrollable container */}
                <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-3 p-3 pb-4">
                      {/* Pots */}
                      {pots.map((pot, potIndex) => {
                        const expectedCount = numGroups;
                        const isCorrectCount = pot.teamIds.length === expectedCount;
                        return (
                          <div key={pot.id} className={cn(
                            "p-3 rounded-lg space-y-2",
                            isCorrectCount ? "bg-muted/50" : "bg-amber-500/10 border border-amber-500/20"
                          )}>
                            <div className="flex items-center justify-between">
                              <Label className="font-medium">{pot.name}</Label>
                              <Badge variant={isCorrectCount ? "outline" : "destructive"}>
                                {pot.teamIds.length}/{expectedCount} equipos
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {pot.teamIds.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Sin equipos asignados</span>
                              ) : (
                              pot.teamIds.map(teamId => {
                                  const team = customTeams.find(t => t.id === teamId);
                                  return (
                                    <Badge 
                                      key={teamId} 
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-destructive/20 text-xs"
                                      onClick={() => {
                                        setPots(prev => prev.map((p, i) => 
                                          i === potIndex 
                                            ? { ...p, teamIds: p.teamIds.filter(id => id !== teamId) }
                                            : p
                                        ));
                                      }}
                                    >
                                      {team?.name || teamId}
                                      <Trash2 className="w-3 h-3 ml-1" />
                                    </Badge>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Unassigned teams */}
                      <div className="p-3 border rounded-lg space-y-2">
                        <Label className="text-sm font-medium">Equipos sin asignar</Label>
                        <div className="flex flex-wrap gap-1">
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
                                <SelectTrigger className="w-auto h-6 text-xs max-w-[140px]">
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
                            <span className="text-xs text-muted-foreground">Todos los equipos están asignados</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            
            {/* Summary Tab */}
            <TabsContent value="summary" className="m-0 h-full overflow-y-auto pr-4">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h3 className="font-display text-lg">{name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>{" "}
                      <span className="font-medium">{getCompetitionTypeName(competitionType)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Equipos:</span>{" "}
                      <span className="font-medium">{numTeams}</span>
                    </div>
                    {needsGroups && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Grupos:</span>{" "}
                          <span className="font-medium">{numGroups} de 4</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Clasifican:</span>{" "}
                          <span className="font-medium">{getQualificationRuleName(qualificationRule)}</span>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-muted-foreground">Eliminatorias:</span>{" "}
                      <span className="font-medium">{getMatchFormatName(knockoutMatchFormat)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Final:</span>{" "}
                      <span className="font-medium">{getMatchFormatName(finalFormat)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sorteo:</span>{" "}
                      <span className="font-medium">{drawMethod === "visual" ? "Visual" : "Automático"}</span>
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "p-3 rounded-lg flex items-center gap-2",
                  validation.valid && potValidation.valid
                    ? "bg-green-500/10 border border-green-500/20 text-green-600"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                )}>
                  {validation.valid && potValidation.valid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {!validation.valid ? validation.message : !potValidation.valid ? potValidation.message : "Configuración válida"}
                  </span>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!validation.valid || (needsGroups && !potValidation.valid)}
            className="gap-2"
          >
            <Trophy className="w-4 h-4" />
            Crear Competencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
