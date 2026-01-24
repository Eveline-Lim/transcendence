export interface GameState {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  player1: {
    id: string;
    position: number;  // Position Y de la raquette (0-100)
    score: number;
  };
  player2: {
    id: string;
    position: number;
    score: number;
  };
  ball: {
    x: number;        // Position X (0-100)
    y: number;        // Position Y (0-100)
    velocityX: number;
    velocityY: number;
  };
  lastUpdate: number; // Timestamp
}