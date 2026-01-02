import { cn } from "@/lib/utils";

interface DiceProps {
  value: number | null;
  rolling?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "home" | "away";
}

const dotPositions: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export const Dice = ({ value, rolling = false, size = "md", variant = "home" }: DiceProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };
  
  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };
  
  const gridSize = {
    sm: "gap-1 p-2",
    md: "gap-1.5 p-2.5",
    lg: "gap-2 p-3",
  };

  const bgColor = variant === "home" 
    ? "bg-primary text-primary-foreground" 
    : "bg-card border-2 border-primary text-primary";

  const dotColor = variant === "home" ? "bg-primary-foreground" : "bg-primary";

  return (
    <div
      className={cn(
        sizeClasses[size],
        bgColor,
        "rounded-lg shadow-dice flex items-center justify-center transition-all duration-300",
        rolling && "dice-rolling"
      )}
    >
      {value !== null && !rolling ? (
        <div className={cn("grid grid-cols-3 grid-rows-3", gridSize[size])}>
          {[0, 1, 2].map(row =>
            [0, 1, 2].map(col => {
              const hasDot = dotPositions[value]?.some(
                ([r, c]) => r === row && c === col
              );
              return (
                <div
                  key={`${row}-${col}`}
                  className={cn(
                    dotSizes[size],
                    "rounded-full transition-all",
                    hasDot ? dotColor : "bg-transparent"
                  )}
                />
              );
            })
          )}
        </div>
      ) : (
        <span className="text-2xl font-bold opacity-30">?</span>
      )}
    </div>
  );
};
