import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

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
  const [displayValue, setDisplayValue] = useState<number>(1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate through random values when rolling
  useEffect(() => {
    if (rolling) {
      setIsAnimating(true);
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 80);
      
      return () => clearInterval(interval);
    } else {
      setIsAnimating(false);
      if (value !== null) {
        setDisplayValue(value);
      }
    }
  }, [rolling, value]);

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-18 h-18",
    lg: "w-24 h-24",
  };
  
  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };
  
  const gridSize = {
    sm: "gap-1 p-2",
    md: "gap-1.5 p-3",
    lg: "gap-2 p-4",
  };

  const bgStyles = variant === "home" 
    ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-[0_8px_0_hsl(var(--pitch)),0_12px_30px_-8px_hsl(152_30%_15%/0.5)]" 
    : "bg-gradient-to-br from-white via-gray-50 to-gray-100 border-2 border-primary/30 text-primary shadow-[0_8px_0_hsl(var(--border)),0_12px_30px_-8px_hsl(152_30%_15%/0.3)]";

  const dotColor = variant === "home" 
    ? "bg-primary-foreground shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]" 
    : "bg-primary shadow-[inset_0_-2px_4px_rgba(0,0,0,0.15)]";

  const currentValue = rolling ? displayValue : (value ?? 1);

  return (
    <div className="perspective-1000">
      <div
        className={cn(
          sizeClasses[size],
          bgStyles,
          "rounded-xl flex items-center justify-center transition-all duration-200 transform-style-3d",
          isAnimating && "dice-rolling-3d",
          !isAnimating && value !== null && "dice-land"
        )}
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {value !== null || rolling ? (
          <div className={cn("grid grid-cols-3 grid-rows-3", gridSize[size])}>
            {[0, 1, 2].map(row =>
              [0, 1, 2].map(col => {
                const hasDot = dotPositions[currentValue]?.some(
                  ([r, c]) => r === row && c === col
                );
                return (
                  <div
                    key={`${row}-${col}`}
                    className={cn(
                      dotSizes[size],
                      "rounded-full transition-all duration-150",
                      hasDot ? cn(dotColor, "scale-100 opacity-100") : "bg-transparent scale-0 opacity-0"
                    )}
                  />
                );
              })
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold opacity-40">?</span>
          </div>
        )}
      </div>
    </div>
  );
};
