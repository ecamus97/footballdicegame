import { Button } from "@/components/ui/button";
import { RotateCcw, Trophy, Info, Home, ChevronRight } from "lucide-react";
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
import { TournamentConfig } from "./TournamentConfig";
import { CompetitionSaveLoad } from "./CompetitionSaveLoad";
import { Team, TeamLevel, TournamentConfig as TournamentConfigType } from "@/types/game";

interface HeaderProps {
  onReset: () => void;
  teams: Team[];
  teamLevels: Record<string, TeamLevel>;
  teamNames: Record<string, { name: string; shortName: string }>;
  tournamentConfig: TournamentConfigType;
  onUpdateConfig: (config: Partial<TournamentConfigType>) => void;
  onUpdateLevel: (teamId: string, level: TeamLevel) => void;
  onResetLevels: () => void;
  onUpdateName: (teamId: string, name: string, shortName: string) => void;
  onResetNames: () => void;
  onApplyChanges: (newConfig?: TournamentConfigType) => void;
  hasPlayedMatches: boolean;
  onSave: () => any;
  onLoad: (data: any) => boolean;
  playedMatches: number;
  totalMatches: number;
}

export const Header = ({ 
  onReset,
  teams,
  teamLevels,
  teamNames,
  tournamentConfig,
  onUpdateConfig,
  onUpdateLevel,
  onResetLevels,
  onUpdateName,
  onResetNames,
  onApplyChanges,
  hasPlayedMatches,
  onSave,
  onLoad,
  playedMatches,
  totalMatches,
}: HeaderProps) => {
  return (
    <header className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Home button */}
            <Link to="/" className="group">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all"
              >
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            
            <div className="hidden sm:block w-px h-8 bg-primary-foreground/20" />
            
            <div className="w-11 h-11 bg-gradient-to-br from-gold to-gold/80 rounded-xl flex items-center justify-center shadow-md">
              <Trophy className="w-6 h-6 text-pitch" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl tracking-wide">
                  {tournamentConfig.name}
                </h1>
                {tournamentConfig.playoffsEnabled && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-200 text-xs font-medium rounded-full">
                    + Playoffs
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm opacity-75">
                <span>{tournamentConfig.format === "double" ? "Ida y Vuelta" : "Solo Ida"}</span>
                <ChevronRight className="w-3 h-3" />
                <span>Simulador de Liga por Dados</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <Info className="w-5 h-5" />
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

            <TournamentConfig
              config={tournamentConfig}
              teamLevels={teamLevels}
              teamNames={teamNames}
              onUpdateConfig={onUpdateConfig}
              onUpdateLevel={onUpdateLevel}
              onResetLevels={onResetLevels}
              onUpdateName={onUpdateName}
              onResetNames={onResetNames}
              onApplyChanges={onApplyChanges}
              hasPlayedMatches={hasPlayedMatches}
            />

            <CompetitionSaveLoad
              type="liga"
              onSave={() => onSave()}
              onLoad={onLoad}
              currentName={tournamentConfig.name}
              currentPlayedMatches={playedMatches}
              currentTotalMatches={totalMatches}
              hasPlayoffs={tournamentConfig.playoffsEnabled}
              triggerVariant="ghost"
              triggerSize="icon"
              triggerClassName="text-primary-foreground hover:bg-primary-foreground/10"
              triggerIconClassName="w-5 h-5"
              showTriggerLabel={false}
            />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <RotateCcw className="w-5 h-5" />
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
