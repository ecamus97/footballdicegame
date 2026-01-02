import { Team, TeamLevel } from "@/types/game";

export const teams: Team[] = [
  // Nivel 1 - Muy fuertes
  { id: "udechile", name: "Universidad de Chile", shortName: "U. Chile", level: 1 },
  { id: "colocolo", name: "Colo Colo", shortName: "Colo Colo", level: 1 },
  { id: "ucatolica", name: "Universidad Católica", shortName: "U. Católica", level: 1 },
  
  // Nivel 2 - Fuertes
  { id: "coquimbo", name: "Coquimbo Unido", shortName: "Coquimbo", level: 2 },
  { id: "ohiggins", name: "O'Higgins", shortName: "O'Higgins", level: 2 },
  { id: "palestino", name: "Palestino", shortName: "Palestino", level: 2 },
  
  // Nivel 3 - Medios
  { id: "cobresal", name: "Cobresal", shortName: "Cobresal", level: 3 },
  { id: "huachipato", name: "Huachipato", shortName: "Huachipato", level: 3 },
  { id: "audax", name: "Audax Italiano", shortName: "Audax", level: 3 },
  { id: "everton", name: "Everton de Viña", shortName: "Everton", level: 3 },
  { id: "nublense", name: "Ñublense", shortName: "Ñublense", level: 3 },
  { id: "limache", name: "Deportes Limache", shortName: "Limache", level: 3 },
  
  // Nivel 4 - Débiles
  { id: "udeconce", name: "Universidad de Concepción", shortName: "U. Conce", level: 4 },
  { id: "dconce", name: "Deportes Concepción", shortName: "D. Conce", level: 4 },
  { id: "laserena", name: "Deportes La Serena", shortName: "La Serena", level: 4 },
  { id: "lacalera", name: "Unión La Calera", shortName: "La Calera", level: 4 },
];

export const getTeamById = (id: string): Team | undefined => {
  return teams.find(team => team.id === id);
};

export const getLevelColor = (level: TeamLevel): string => {
  const colors = {
    1: "bg-level-1 text-primary-foreground",
    2: "bg-level-2 text-primary-foreground",
    3: "bg-level-3 text-accent-foreground",
    4: "bg-level-4 text-primary-foreground",
  };
  return colors[level];
};

export const getLevelLabel = (level: TeamLevel): string => {
  const labels = {
    1: "Élite",
    2: "Fuerte",
    3: "Medio",
    4: "Débil",
  };
  return labels[level];
};
