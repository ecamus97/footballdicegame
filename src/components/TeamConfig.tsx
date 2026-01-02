import { Team, TeamLevel } from "@/types/game";
import { getLevelColor, getLevelLabel } from "@/data/teams";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Settings, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface TeamConfigProps {
  teams: Team[];
  teamLevels: Record<string, TeamLevel>;
  onUpdateLevel: (teamId: string, level: TeamLevel) => void;
  onResetLevels: () => void;
  onResetTournament: () => void;
  hasPlayedMatches: boolean;
}

export const TeamConfig = ({ 
  teams, 
  teamLevels, 
  onUpdateLevel, 
  onResetLevels,
  onResetTournament,
  hasPlayedMatches 
}: TeamConfigProps) => {
  const [open, setOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, TeamLevel>>({});

  const handleLevelChange = (teamId: string, level: string) => {
    const newLevel = parseInt(level) as TeamLevel;
    setPendingChanges(prev => ({
      ...prev,
      [teamId]: newLevel,
    }));
  };

  const handleApplyChanges = () => {
    // Apply all pending changes
    Object.entries(pendingChanges).forEach(([teamId, level]) => {
      onUpdateLevel(teamId, level);
    });
    
    // If there are played matches, warn and reset
    if (hasPlayedMatches && Object.keys(pendingChanges).length > 0) {
      onResetTournament();
      toast({
        title: "Torneo reiniciado",
        description: "Los cambios de nivel requieren reiniciar el torneo.",
      });
    } else if (Object.keys(pendingChanges).length > 0) {
      toast({
        title: "Niveles actualizados",
        description: "Los niveles de los equipos han sido modificados.",
      });
    }
    
    setPendingChanges({});
    setOpen(false);
  };

  const handleReset = () => {
    onResetLevels();
    setPendingChanges({});
    if (hasPlayedMatches) {
      onResetTournament();
    }
    toast({
      title: "Niveles restablecidos",
      description: "Los niveles han vuelto a su configuración original.",
    });
  };

  const getCurrentLevel = (teamId: string): TeamLevel => {
    return pendingChanges[teamId] ?? teamLevels[teamId];
  };

  // Group teams by level
  const teamsByLevel = teams.reduce((acc, team) => {
    const level = getCurrentLevel(team.id);
    if (!acc[level]) acc[level] = [];
    acc[level].push(team);
    return acc;
  }, {} as Record<TeamLevel, Team[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Configurar Niveles de Equipos</DialogTitle>
          <DialogDescription>
            Ajusta el nivel de cada equipo. Los cambios reiniciarán el torneo si hay partidos jugados.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {([1, 2, 3, 4] as TeamLevel[]).map(level => (
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
                  ({teamsByLevel[level]?.length || 0} equipos)
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teams
                  .filter(team => getCurrentLevel(team.id) === level)
                  .map(team => (
                    <div 
                      key={team.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm font-medium truncate mr-2">
                        {team.name}
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
                  ))}
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </Button>
          <Button onClick={handleApplyChanges}>
            Aplicar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
