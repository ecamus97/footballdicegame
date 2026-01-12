import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, FolderOpen, Trash2, Calendar, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "competition-saves";

export interface SavedCompetition {
  id: string;
  name: string;
  savedAt: string;
  competitionName: string;
  phase: string;
  type: "competition" | "liga";
  data: any;
}

interface CompetitionSaveLoadProps {
  currentName: string;
  currentPhase: string;
  type: "competition" | "liga";
  onSave: (name: string) => any;
  onLoad: (data: any) => boolean;
}

export const getSavedCompetitions = (): SavedCompetition[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const CompetitionSaveLoad = ({ 
  currentName,
  currentPhase,
  type,
  onSave, 
  onLoad,
}: CompetitionSaveLoadProps) => {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedGames, setSavedGames] = useState<SavedCompetition[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refreshSavedGames = () => {
    setSavedGames(getSavedCompetitions());
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      refreshSavedGames();
      setSaveName(currentName || "");
    }
  };

  const handleSave = () => {
    if (!saveName.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un nombre para la partida.",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = onSave(saveName);
      const saves = getSavedCompetitions();
      
      // Check if name exists and update, otherwise add new
      const existingIndex = saves.findIndex(s => s.name === saveName.trim() && s.type === type);
      
      const newSave: SavedCompetition = {
        id: existingIndex >= 0 ? saves[existingIndex].id : `save-${Date.now()}`,
        name: saveName.trim(),
        savedAt: new Date().toISOString(),
        competitionName: currentName,
        phase: currentPhase,
        type,
        data,
      };

      if (existingIndex >= 0) {
        saves[existingIndex] = newSave;
      } else {
        saves.push(newSave);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
      refreshSavedGames();
      
      toast({
        title: "Partida guardada",
        description: `"${saveName}" ha sido guardada.`,
      });
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la partida.",
        variant: "destructive",
      });
    }
  };

  const handleLoad = (save: SavedCompetition) => {
    const success = onLoad(save.data);
    if (success) {
      toast({
        title: "Partida cargada",
        description: `"${save.name}" ha sido cargada.`,
      });
      setOpen(false);
    } else {
      toast({
        title: "Error al cargar",
        description: "No se pudo cargar la partida.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (saveId: string) => {
    try {
      const saves = getSavedCompetitions().filter(s => s.id !== saveId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
      refreshSavedGames();
      setConfirmDelete(null);
      
      toast({
        title: "Partida eliminada",
        description: "La partida ha sido eliminada.",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar la partida.",
        variant: "destructive",
      });
    }
  };

  const filteredSaves = savedGames.filter(s => s.type === type);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Save className="w-4 h-4" />
          Guardar / Cargar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Guardar / Cargar</DialogTitle>
          <DialogDescription>
            Guarda tu progreso o carga una partida anterior.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Save Section */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Nueva partida</div>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre de la partida..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSave} className="gap-2">
                <Plus className="w-4 h-4" />
                Guardar
              </Button>
            </div>
          </div>
          
          {/* Saved Games List */}
          <div className="space-y-3">
            <div className="text-sm font-medium flex items-center justify-between">
              <span>Partidas guardadas</span>
              <span className="text-xs text-muted-foreground">
                {filteredSaves.length} {type === "liga" ? "ligas" : "torneos"}
              </span>
            </div>
            
            {filteredSaves.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                No hay partidas guardadas
              </div>
            ) : (
              <ScrollArea className="h-[250px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {filteredSaves.map((save) => (
                    <div
                      key={save.id}
                      className="p-3 bg-muted/50 rounded-lg space-y-2 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{save.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {save.competitionName} • {save.phase}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(save.savedAt), "d MMM yyyy, HH:mm", { locale: es })}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleLoad(save)} 
                          variant="outline" 
                          size="sm"
                          className="flex-1 gap-2"
                        >
                          <FolderOpen className="w-3 h-3" />
                          Cargar
                        </Button>
                        
                        {confirmDelete === save.id ? (
                          <Button 
                            onClick={() => handleDelete(save.id)} 
                            variant="destructive" 
                            size="sm"
                            className="gap-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            Confirmar
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => setConfirmDelete(save.id)} 
                            variant="outline" 
                            size="icon"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
