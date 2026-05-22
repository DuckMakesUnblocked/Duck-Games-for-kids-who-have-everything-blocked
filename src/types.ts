export type GameId = "snake" | "brick_breaker" | "flappy" | "space_shooter";

export interface GameInfo {
  id: GameId;
  title: string;
  description: string;
  instructions: string;
  controls: { keys: string[]; description: string }[];
  category: "Classic" | "Arcade" | "Puzzle" | "Action";
  icon: string; // Lucide icon name matching our selector
  accentColor: string; // Tailwind color class for borders/glows
  bgColor: string; // Custom canvas base styling
  highScoreKey: string;
}

export interface PlayerStats {
  plays: Record<GameId, number>;
  highScores: Record<GameId, number>;
  totalTimePlayed: number; // in seconds
}
