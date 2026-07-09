import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, Info, Home } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CompetitionSaveLoad } from "./CompetitionSaveLoad";
import { TournamentConfig as TournamentConfigType } from "@/types/game";

interface HeaderProps {
  onReset: () => void;
  tournamentConfig: TournamentConfigType;
  onSave: () => any;
  onLoad: (data: any) => boolean;
  playedMatches: number;
  totalMatches: number;
}

export const Header = ({
  onReset,
  tournamentConfig,
  onSave,
  onLoad,
  playedMatches,
  totalMatches,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Home button */}
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="w-5 h-5" />
              </Button>
            </Link>

            <div className="hidden sm:block w-px h-8 bg-border" />

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-gold/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <Trophy className="w-5 h-5 text-pitch" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold truncate">
                  {tournamentConfig.name}
                </span>
                {tournamentConfig.playoffsEnabled && (
                  <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                    + Playoffs
                  </Badge>
                )}
              </div>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {tournamentConfig.format === "double" ? "Ida y Vuelta" : "Solo Ida"} • Liga
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Info className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Reglas del Juego</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold mb-1">Mecánica de Dados</h3>
                    <p className="text-muted-foreground">
                      Cada equipo lanza 1 dado (1-6). Los goles = valor del dado - 1.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Mismo Nivel</h3>
                    <p className="text-muted-foreground">
                      Sin ventajas. El resultado del primer lanzamiento es definitivo.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">1 Nivel de Diferencia</h3>
                    <p className="text-muted-foreground">
                      Si el equipo fuerte es local y no gana, tiene segundo lanzamiento.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">2+ Niveles de Diferencia</h3>
                    <p className="text-muted-foreground">
                      El equipo fuerte siempre tiene segundo lanzamiento si no gana.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Niveles de Equipos</h3>
                    <ul className="text-muted-foreground space-y-1">
                      <li><span className="inline-block w-16 text-level-1 font-medium">Nivel 1:</span> Élite</li>
                      <li><span className="inline-block w-16 text-level-2 font-medium">Nivel 2:</span> Fuertes</li>
                      <li><span className="inline-block w-16 text-level-3 font-medium">Nivel 3:</span> Medios</li>
                      <li><span className="inline-block w-16 text-level-4 font-medium">Nivel 4:</span> Débiles</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <CompetitionSaveLoad
              type="liga"
              onSave={() => onSave()}
              onLoad={onLoad}
              currentName={tournamentConfig.name}
              currentPlayedMatches={playedMatches}
              currentTotalMatches={totalMatches}
              hasPlayoffs={tournamentConfig.playoffsEnabled}
              triggerVariant="outline"
              triggerSize="sm"
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reiniciar</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Reiniciar Torneo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto eliminará todos los resultados y reiniciará la tabla de posiciones. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onReset}>
                    Reiniciar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </header>
  );
};
