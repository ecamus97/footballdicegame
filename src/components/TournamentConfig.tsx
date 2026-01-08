import { useState } from "react";
import { Team, TeamLevel, TournamentConfig as TournamentConfigType, TournamentFormat, PlayoffFormat, InternationalCup } from "@/types/game";
import { teams as allTeamsData, getLevelColor, getLevelLabel } from "@/data/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Users, Trophy, Repeat, PenLine, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch as SwitchComponent } from "@/components/ui/switch";

interface TournamentConfigProps {
  config: TournamentConfigType;
  teamLevels: Record<string, 1 | 2 | 3 | 4>;
  teamNames: Record<string, { name: string; shortName: string }>;
  onUpdateConfig: (config: Partial<TournamentConfigType>) => void;
  onUpdateLevel: (teamId: string, level: 1 | 2 | 3 | 4) => void;
  onResetLevels: () => void;
  onUpdateName: (teamId: string, name: string, shortName: string) => void;
  onResetNames: () => void;
  onApplyChanges: (newConfig?: TournamentConfigType) => void;
  hasPlayedMatches: boolean;
}

export const TournamentConfig = ({
  config,
  teamLevels,
  teamNames,
  onUpdateConfig,
  onUpdateLevel,
  onResetLevels,
  onUpdateName,
  onResetNames,
  onApplyChanges,
  hasPlayedMatches,
}: TournamentConfigProps) => {
  const [open, setOpen] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<Partial<TournamentConfigType>>({});
  const [pendingLevels, setPendingLevels] = useState<Record<string, TeamLevel>>({});
  const [pendingNames, setPendingNames] = useState<Record<string, { name: string; shortName: string }>>({});

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setPendingConfig({});
      setPendingLevels({});
      setPendingNames({});
    }
    setOpen(isOpen);
  };

  const getCurrentName = (teamId: string): { name: string; shortName: string } => {
    if (pendingNames[teamId]) return pendingNames[teamId];
    if (teamNames[teamId]) return teamNames[teamId];
    const team = allTeamsData.find(t => t.id === teamId);
    return { name: team?.name || "", shortName: team?.shortName || "" };
  };

  const getCurrentConfig = (): TournamentConfigType => ({
    name: pendingConfig.name ?? config.name,
    format: pendingConfig.format ?? config.format,
    participatingTeamIds: pendingConfig.participatingTeamIds ?? config.participatingTeamIds,
    allowOddTeams: pendingConfig.allowOddTeams ?? config.allowOddTeams ?? false,
    relegationSpots: pendingConfig.relegationSpots ?? config.relegationSpots,
    // Playoffs
    playoffsEnabled: pendingConfig.playoffsEnabled ?? config.playoffsEnabled,
    playoffsFormat: pendingConfig.playoffsFormat ?? config.playoffsFormat,
    playoffsTeams: pendingConfig.playoffsTeams ?? config.playoffsTeams,
    // International cups
    internationalCups: pendingConfig.internationalCups ?? config.internationalCups,
    // Promotion/Relegation playoff
    promotionPlayoffEnabled: pendingConfig.promotionPlayoffEnabled ?? config.promotionPlayoffEnabled,
    promotionPlayoffSpots: pendingConfig.promotionPlayoffSpots ?? config.promotionPlayoffSpots,
  });

  const getCurrentLevel = (teamId: string): TeamLevel => {
    return pendingLevels[teamId] ?? teamLevels[teamId] ?? allTeamsData.find(t => t.id === teamId)?.level ?? 3;
  };

  const handleTournamentNameChange = (name: string) => {
    setPendingConfig(prev => ({ ...prev, name }));
  };

  const handleFormatChange = (format: TournamentFormat) => {
    setPendingConfig(prev => ({ ...prev, format }));
  };

  const handleTeamToggle = (teamId: string, checked: boolean) => {
    const currentTeams = getCurrentConfig().participatingTeamIds;
    let newTeams: string[];
    
    if (checked) {
      newTeams = [...currentTeams, teamId];
    } else {
      newTeams = currentTeams.filter(id => id !== teamId);
    }
    
    setPendingConfig(prev => ({ ...prev, participatingTeamIds: newTeams }));
  };

  const handleLevelChange = (teamId: string, level: string) => {
    setPendingLevels(prev => ({
      ...prev,
      [teamId]: parseInt(level) as TeamLevel,
    }));
  };

  const handleSelectAll = () => {
    setPendingConfig(prev => ({ 
      ...prev, 
      participatingTeamIds: allTeamsData.map(t => t.id) 
    }));
  };

  const handleDeselectAll = () => {
    setPendingConfig(prev => ({ 
      ...prev, 
      participatingTeamIds: [] 
    }));
  };

  const handleNameChange = (teamId: string, field: 'name' | 'shortName', value: string) => {
    const current = getCurrentName(teamId);
    setPendingNames(prev => ({
      ...prev,
      [teamId]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const handleRelegationSpotsChange = (spots: number) => {
    setPendingConfig(prev => ({ ...prev, relegationSpots: spots }));
  };

  const handleApply = () => {
    const currentConfig = getCurrentConfig();
    
    // Validate minimum teams
    if (currentConfig.participatingTeamIds.length < 4) {
      toast({
        title: "Error",
        description: "Se requieren al menos 4 equipos para el campeonato.",
        variant: "destructive",
      });
      return;
    }

    // Check if teams count is even (unless odd teams are allowed)
    if (currentConfig.participatingTeamIds.length % 2 !== 0 && !currentConfig.allowOddTeams) {
      toast({
        title: "Error",
        description: "El número de equipos debe ser par (o activa 'Equipos impares' para 1 equipo libre por fecha).",
        variant: "destructive",
      });
      return;
    }

    // Validate relegation spots
    if (currentConfig.relegationSpots >= currentConfig.participatingTeamIds.length) {
      toast({
        title: "Error",
        description: "Los equipos que descienden deben ser menos que el total de equipos.",
        variant: "destructive",
      });
      return;
    }

    // Apply config changes first
    const hasConfigChanges = Object.keys(pendingConfig).length > 0;
    
    if (hasConfigChanges) {
      onUpdateConfig(pendingConfig);
    }

    // Apply level changes
    Object.entries(pendingLevels).forEach(([teamId, level]) => {
      onUpdateLevel(teamId, level);
    });

    // Apply name changes
    Object.entries(pendingNames).forEach(([teamId, names]) => {
      onUpdateName(teamId, names.name, names.shortName);
    });

    // Apply changes and regenerate fixture with the NEW config
    const hasLevelChanges = Object.keys(pendingLevels).length > 0;
    const hasNameChanges = Object.keys(pendingNames).length > 0;

    if (hasConfigChanges || hasLevelChanges || hasNameChanges) {
      if (hasConfigChanges) {
        // Pass the full new config to applyConfigChanges
        onApplyChanges(currentConfig);
      }
      toast({
        title: hasPlayedMatches && hasConfigChanges ? "Torneo reiniciado" : "Configuración aplicada",
        description: hasPlayedMatches && hasConfigChanges
          ? "Los cambios requieren reiniciar el torneo."
          : "La configuración ha sido actualizada.",
      });
    }

    setPendingConfig({});
    setPendingLevels({});
    setPendingNames({});
    setOpen(false);
  };

  const handleResetLevels = () => {
    onResetLevels();
    setPendingLevels({});
    toast({
      title: "Niveles restablecidos",
      description: "Los niveles han vuelto a su configuración original.",
    });
  };

  const handleResetNames = () => {
    onResetNames();
    setPendingNames({});
    toast({
      title: "Nombres restablecidos",
      description: "Los nombres han vuelto a su configuración original.",
    });
  };

  const currentConfig = getCurrentConfig();
  const participatingTeams = allTeamsData.filter(t => 
    currentConfig.participatingTeamIds.includes(t.id)
  );

  // Calculate match info
  const numTeams = currentConfig.participatingTeamIds.length;
  const matchesPerRound = numTeams > 0 ? (numTeams * (numTeams - 1)) / 2 : 0;
  const totalMatches = currentConfig.format === "double" ? matchesPerRound * 2 : matchesPerRound;

  const oddAllowed = currentConfig.allowOddTeams && numTeams % 2 !== 0;
  const totalMatchdays = numTeams > 1
    ? oddAllowed
      ? (currentConfig.format === "double" ? numTeams * 2 : numTeams)
      : (currentConfig.format === "double" ? (numTeams - 1) * 2 : numTeams - 1)
    : 0;

  // Group participating teams by level
  const teamsByLevel = participatingTeams.reduce((acc, team) => {
    const level = getCurrentLevel(team.id);
    if (!acc[level]) acc[level] = [];
    acc[level].push(team);
    return acc;
  }, {} as Record<TeamLevel, Team[]>);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
          <Settings2 className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Configuración del Torneo</DialogTitle>
          <DialogDescription>
            Configura el nombre, formato y equipos participantes del campeonato.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="general" className="gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Equipos</span>
            </TabsTrigger>
            <TabsTrigger value="names" className="gap-2">
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">Nombres</span>
            </TabsTrigger>
            <TabsTrigger value="levels" className="gap-2">
              <Repeat className="w-4 h-4" />
              <span className="hidden sm:inline">Niveles</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="general" className="m-0 pr-4">
              <ScrollArea className="h-[350px]">
                <div className="space-y-6 pr-4">
                  <div className="space-y-2">
                    <Label htmlFor="tournament-name">Nombre del Campeonato</Label>
                    <Input
                      id="tournament-name"
                      value={currentConfig.name}
                      onChange={(e) => handleTournamentNameChange(e.target.value)}
                      placeholder="Ej: Campeonato Chileno 2026"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Formato del Torneo</Label>
                    <Select
                      value={currentConfig.format}
                      onValueChange={(value) => handleFormatChange(value as TournamentFormat)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Solo Ida (1 partido por enfrentamiento)</SelectItem>
                        <SelectItem value="double">Ida y Vuelta (2 partidos por enfrentamiento)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Playoffs Section */}
                  <div className="space-y-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Playoffs</Label>
                      <SwitchComponent
                        checked={currentConfig.playoffsEnabled}
                        onCheckedChange={(checked) => setPendingConfig(prev => ({ ...prev, playoffsEnabled: checked }))}
                      />
                    </div>
                    
                    {currentConfig.playoffsEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Equipos clasifican</Label>
                            <Select
                              value={String(currentConfig.playoffsTeams)}
                              onValueChange={(value) => setPendingConfig(prev => ({ ...prev, playoffsTeams: parseInt(value) }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2, 4, 6, 8].map(num => (
                                  <SelectItem key={num} value={String(num)}>{num} equipos</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Formato playoffs</Label>
                            <Select
                              value={currentConfig.playoffsFormat}
                              onValueChange={(value) => setPendingConfig(prev => ({ ...prev, playoffsFormat: value as PlayoffFormat }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Solo ida (todos los partidos, final en cancha neutral)</SelectItem>
                                <SelectItem value="double">Ida y vuelta + final única neutral</SelectItem>
                                <SelectItem value="final_only">Ida y vuelta completo (incluyendo final)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* International Cups Section */}
                  <div className="space-y-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Copas Internacionales</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const cups = [...currentConfig.internationalCups];
                          const colors = [
                            "bg-green-500/20 border-l-green-500",
                            "bg-blue-500/20 border-l-blue-500",
                            "bg-cyan-500/20 border-l-cyan-500",
                            "bg-teal-500/20 border-l-teal-500",
                          ];
                          cups.push({
                            name: `Copa ${cups.length + 1}`,
                            spots: 2,
                            color: colors[cups.length % colors.length],
                          });
                          setPendingConfig(prev => ({ ...prev, internationalCups: cups }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {currentConfig.internationalCups.map((cup, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                          <div className={cn("w-3 h-full min-h-[32px] rounded", cup.color.split(" ")[0])} />
                          <Input
                            value={cup.name}
                            onChange={(e) => {
                              const cups = [...currentConfig.internationalCups];
                              cups[index] = { ...cups[index], name: e.target.value };
                              setPendingConfig(prev => ({ ...prev, internationalCups: cups }));
                            }}
                            placeholder="Nombre de la copa"
                            className="h-8 flex-1"
                          />
                          <Select
                            value={String(cup.spots)}
                            onValueChange={(value) => {
                              const cups = [...currentConfig.internationalCups];
                              cups[index] = { ...cups[index], spots: parseInt(value) };
                              setPendingConfig(prev => ({ ...prev, internationalCups: cups }));
                            }}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5, 6].map(num => (
                                <SelectItem key={num} value={String(num)}>
                                  {num === 0 ? "Ninguno" : `${num} cupos`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              const cups = currentConfig.internationalCups.filter((_, i) => i !== index);
                              setPendingConfig(prev => ({ ...prev, internationalCups: cups }));
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {currentConfig.internationalCups.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Sin copas internacionales configuradas
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Relegation Section */}
                  <div className="space-y-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <Label className="text-base font-semibold">Descenso y Promoción</Label>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Equipos que descienden directamente</Label>
                        <Select
                          value={String(currentConfig.relegationSpots)}
                          onValueChange={(value) => handleRelegationSpotsChange(parseInt(value))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5, 6].map(num => (
                              <SelectItem key={num} value={String(num)}>
                                {num === 0 ? "Sin descenso directo" : `${num} equipo${num > 1 ? 's' : ''}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div>
                          <Label className="text-sm">Partido de Promoción</Label>
                          <p className="text-xs text-muted-foreground">Posiciones que juegan promoción/descenso</p>
                        </div>
                        <SwitchComponent
                          checked={currentConfig.promotionPlayoffEnabled}
                          onCheckedChange={(checked) => setPendingConfig(prev => ({ ...prev, promotionPlayoffEnabled: checked }))}
                        />
                      </div>
                      
                      {currentConfig.promotionPlayoffEnabled && (
                        <div className="space-y-1">
                          <Label className="text-xs">Posiciones en promoción</Label>
                          <Select
                            value={String(currentConfig.promotionPlayoffSpots)}
                            onValueChange={(value) => setPendingConfig(prev => ({ ...prev, promotionPlayoffSpots: parseInt(value) }))}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3].map(num => (
                                <SelectItem key={num} value={String(num)}>
                                  {num} posición{num > 1 ? 'es' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-medium">Resumen del Torneo</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Equipos:</span>{" "}
                        <span className="font-medium">{numTeams}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fechas:</span>{" "}
                        <span className="font-medium">{totalMatchdays}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Partidos totales:</span>{" "}
                        <span className="font-medium">{totalMatches}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Formato:</span>{" "}
                        <span className="font-medium">
                          {currentConfig.format === "single" ? "Ida" : "Ida y Vuelta"}
                        </span>
                      </div>
                      {currentConfig.playoffsEnabled && (
                        <div>
                          <span className="text-muted-foreground">Playoffs:</span>{" "}
                          <span className="font-medium">{currentConfig.playoffsTeams} equipos</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Descienden:</span>{" "}
                        <span className="font-medium">
                          {currentConfig.relegationSpots === 0 ? "Ninguno" : currentConfig.relegationSpots}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="teams" className="m-0 space-y-4 pr-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Selecciona los equipos que participarán ({numTeams} seleccionados)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Ninguno
                  </Button>
                </div>
              </div>

              {numTeams % 2 !== 0 && numTeams > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  El número de equipos debe ser par para generar el fixture.
                </div>
              )}

              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-4">
                  {allTeamsData.map((team) => {
                    const isSelected = currentConfig.participatingTeamIds.includes(team.id);
                    const level = getCurrentLevel(team.id);
                    return (
                      <div
                        key={team.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          isSelected ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-transparent"
                        )}
                      >
                        <Checkbox
                          id={`team-${team.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleTeamToggle(team.id, checked as boolean)}
                        />
                        <label
                          htmlFor={`team-${team.id}`}
                          className="flex-1 text-sm font-medium cursor-pointer"
                        >
                          {team.name}
                        </label>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          getLevelColor(level)
                        )}>
                          N{level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="names" className="m-0 space-y-4 pr-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Edita los nombres de los equipos participantes
                </p>
                <Button variant="outline" size="sm" onClick={handleResetNames}>
                  Restablecer
                </Button>
              </div>

              {participatingTeams.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay equipos seleccionados
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {participatingTeams.map((team) => {
                      const currentNames = getCurrentName(team.id);
                      const level = getCurrentLevel(team.id);
                      return (
                        <div
                          key={team.id}
                          className="p-3 bg-muted/50 rounded-lg space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              getLevelColor(level)
                            )}>
                              N{level}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {team.id}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Nombre completo</Label>
                              <Input
                                value={currentNames.name}
                                onChange={(e) => handleNameChange(team.id, 'name', e.target.value)}
                                placeholder="Nombre del equipo"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Nombre corto</Label>
                              <Input
                                value={currentNames.shortName}
                                onChange={(e) => handleNameChange(team.id, 'shortName', e.target.value)}
                                placeholder="Abreviación"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="levels" className="m-0 space-y-4 pr-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Ajusta el nivel de cada equipo participante
                </p>
                <Button variant="outline" size="sm" onClick={handleResetLevels}>
                  Restablecer
                </Button>
              </div>

              {participatingTeams.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay equipos seleccionados
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-6 pr-4">
                    {([1, 2, 3, 4] as TeamLevel[]).map(level => {
                      const teamsInLevel = teamsByLevel[level] || [];
                      if (teamsInLevel.length === 0) return null;
                      
                      return (
                        <div key={level} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded text-sm font-medium",
                              getLevelColor(level)
                            )}>
                              Nivel {level}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {getLevelLabel(level)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              ({teamsInLevel.length} equipos)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {teamsInLevel.map(team => {
                            const teamDisplayName = getCurrentName(team.id).name;
                            return (
                              <div
                                key={team.id}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                              >
                                <span className="text-sm font-medium truncate mr-2">
                                  {teamDisplayName}
                                </span>
                                <Select
                                  value={getCurrentLevel(team.id).toString()}
                                  onValueChange={(value) => handleLevelChange(team.id, value)}
                                >
                                  <SelectTrigger className="w-24 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">Nivel 1</SelectItem>
                                    <SelectItem value="2">Nivel 2</SelectItem>
                                    <SelectItem value="3">Nivel 3</SelectItem>
                                    <SelectItem value="4">Nivel 4</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};