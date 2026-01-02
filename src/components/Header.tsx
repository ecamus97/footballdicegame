import { Button } from "@/components/ui/button";
import { RotateCcw, Trophy, Info } from "lucide-react";
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

interface HeaderProps {
  onReset: () => void;
}

export const Header = ({ onReset }: HeaderProps) => {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gold rounded-lg flex items-center justify-center">
              <Trophy className="w-7 h-7 text-pitch" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wide">
                Campeonato Chileno 2026
              </h1>
              <p className="text-sm opacity-80">
                Simulador de Liga por Dados
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
                      <li><span className="inline-block w-16 text-level-1 font-medium">Nivel 1:</span> U. Chile, Colo Colo, U. Católica</li>
                      <li><span className="inline-block w-16 text-level-2 font-medium">Nivel 2:</span> Coquimbo, O'Higgins, Palestino</li>
                      <li><span className="inline-block w-16 text-level-3 font-medium">Nivel 3:</span> Equipos medios</li>
                      <li><span className="inline-block w-16 text-level-4 font-medium">Nivel 4:</span> Equipos débiles</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
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
