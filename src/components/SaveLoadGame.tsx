import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Save, FolderOpen, Trash2, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SaveLoadGameProps {
  onSave: () => boolean;
  onLoad: () => boolean;
  onDelete: () => void;
  hasSavedGame: boolean;
  getSavedGameInfo: () => { savedAt: Date; playedMatches: number; totalMatches: number } | null;
}

export const SaveLoadGame = ({ 
  onSave, 
  onLoad, 
  onDelete, 
  hasSavedGame,
  getSavedGameInfo 
}: SaveLoadGameProps) => {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const savedInfo = getSavedGameInfo();

  const handleSave = () => {
    const success = onSave();
    if (success) {
      toast({
        title: "Partida guardada",
        description: "El progreso del torneo ha sido guardado.",
      });
    }
  };

  const handleLoad = () => {
    const success = onLoad();
    if (success) {
      toast({
        title: "Partida cargada",
        description: "Se ha restaurado el progreso guardado.",
      });
      setOpen(false);
    } else {
      toast({
        title: "Error al cargar",
        description: "No se pudo cargar la partida guardada.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    onDelete();
    setConfirmDelete(false);
    toast({
      title: "Partida eliminada",
      description: "La partida guardada ha sido eliminada.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          {/* Save Button */}
          <Button onClick={handleSave} className="w-full gap-2" size="lg">
            <Save className="w-5 h-5" />
            Guardar Partida Actual
          </Button>
          
          {/* Saved Game Info */}
          {hasSavedGame && savedInfo && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="w-4 h-4 text-primary" />
                Partida Guardada
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(savedInfo.savedAt, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </div>
                <div>
                  Progreso: {savedInfo.playedMatches} / {savedInfo.totalMatches} partidos
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(savedInfo.playedMatches / savedInfo.totalMatches) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button onClick={handleLoad} variant="outline" className="flex-1 gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Cargar
                </Button>
                
                {!confirmDelete ? (
                  <Button 
                    onClick={() => setConfirmDelete(true)} 
                    variant="outline" 
                    size="icon"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleDelete} 
                    variant="destructive" 
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Confirmar
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {!hasSavedGame && (
            <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
              No hay partidas guardadas
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
