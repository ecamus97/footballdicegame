import { Team } from "@/types/game";
import { getLevelColor, getLevelLabel } from "@/data/teams";
import { cn } from "@/lib/utils";

interface TeamBadgeProps {
  team: Team;
  showLevel?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
}

export const TeamBadge = ({ team, showLevel = true, size = "md", align = "center" }: TeamBadgeProps) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };
  
  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  };

  return (
    <div className={cn("flex flex-col gap-1", alignClasses[align])}>
      <span className={cn("font-semibold", sizeClasses[size])}>
        {team.name}
      </span>
      {showLevel && (
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            getLevelColor(team.level)
          )}
        >
          Nivel {team.level} · {getLevelLabel(team.level)}
        </span>
      )}
    </div>
  );
};
