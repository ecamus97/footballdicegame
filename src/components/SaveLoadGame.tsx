import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, FolderOpen, Trash2, Calendar, Plus, Edit2, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "liga-saves";

export interface SavedGame {
  id: string;
  name: string;
  savedAt: string;
  tournamentName: string;
  playedMatches: number;
  totalMatches: number;
  hasPlayoffs: boolean;
  data: any;
}

interface SaveLoadGameProps {
  onSave: () => any;
  onLoad: (data: any) => boolean;
  currentTournamentName: string;
  currentPlayedMatches: number;
  currentTotalMatches: number;
  hasPlayoffs: boolean;
}

export const getSavedGames = (): SavedGame[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const SaveLoadGame = ({ 
  onSave, 
  onLoad,
  currentTournamentName,
  currentPlayedMatches,
  currentTotalMatches,
  hasPlayoffs,
}: SaveLoadGameProps) => {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const refreshSavedGames = () => {
    setSavedGames(getSavedGames());
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      refreshSavedGames();
      setSaveName(currentTournamentName || "");
      setConfirmDelete(null);
      setEditingId(null);
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
      const data = onSave();
      const saves = getSavedGames();
      
      // Check if name exists and update, otherwise add new
      const existingIndex = saves.findIndex(s => s.name === saveName.trim());
      
      const newSave: SavedGame = {
        id: existingIndex >= 0 ? saves[existingIndex].id : `save-${Date.now()}`,
        name: saveName.trim(),
        savedAt: new Date().toISOString(),
        tournamentName: currentTournamentName,
        playedMatches: currentPlayedMatches,
        totalMatches: currentTotalMatches,
        hasPlayoffs,
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

  const handleLoad = (save: SavedGame) => {
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
      const saves = getSavedGames().filter(s => s.id !== saveId);
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

  const handleStartEdit = (save: SavedGame) => {
    setEditingId(save.id);
    setEditingName(save.name);
  };

  const handleConfirmEdit = (saveId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "El nombre no puede estar vacío.",
        variant: "destructive",
      });
      return;
    }

    try {
      const saves = getSavedGames();
      const saveIndex = saves.findIndex(s => s.id === saveId);
      if (saveIndex >= 0) {
        saves[saveIndex] = { ...saves[saveIndex], name: editingName.trim() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
        refreshSavedGames();
        toast({
          title: "Nombre actualizado",
          description: `Partida renombrada a "${editingName.trim()}".`,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo renombrar la partida.",
        variant: "destructive",
      });
    }
    
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
          <Save className="w-5 h-5" />
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
                {savedGames.length} {savedGames.length === 1 ? 'partida' : 'partidas'}
              </span>
            </div>
            
            {savedGames.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                No hay partidas guardadas
              </div>
            ) : (
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {savedGames.map((save) => (
                    <div
                      key={save.id}
                      className="p-3 bg-muted/50 rounded-lg space-y-2 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {editingId === save.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmEdit(save.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => handleConfirmEdit(save.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{save.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {save.tournamentName} {save.hasPlayoffs && "• Con Playoffs"}
                              </div>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                              onClick={() => handleStartEdit(save)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(save.savedAt), "d MMM yyyy, HH:mm", { locale: es })}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {save.playedMatches} / {save.totalMatches} partidos
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all rounded-full",
                              save.playedMatches === save.totalMatches ? "bg-gold" : "bg-primary"
                            )}
                            style={{ width: `${(save.playedMatches / save.totalMatches) * 100}%` }}
                          />
                        </div>
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
