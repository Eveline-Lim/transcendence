import { GameLoopService } from '../../services/GameLoopService';
import { GameState } from '../../models/GameState';
import { Server } from 'socket.io';

// Testable subclass that exposes protected methods
export class TestableGameLoopService extends GameLoopService {
  public testUpdatePaddles(gameState: GameState) {
    return this.updatePaddles(gameState);
  }
  public testCheckCollisionY(gameState: GameState, distanceToRun: number) {
    return this.checkCollisionY(gameState, distanceToRun);
  }
  public testCheckPaddleCollision(gameState: GameState, player: 'player1' | 'player2') {
    return this.checkPaddleCollision(gameState, player);
  }
  public testUpdateBallSpeed(gameState: GameState) {
    return this.updateBallSpeed(gameState);
  }
}

// Factory for a default GameState with optional overrides
export function createTestGameState(overrides?: Partial<GameState>): GameState {
  return {
    gameId: 'test_game',
    player1_id: 'player_a',
    player2_id: 'player_b',
    status: 'playing',
    score: { player1: 0, player2: 0 },
    ball: { x: 50, y: 50, vx: 1, vy: 1 },
    paddles: { player1: 50, player2: 50 },
    inputs: {
      player1_up: false,
      player1_down: false,
      player2_up: false,
      player2_down: false
    },
    created_at: Date.now(),
    ...overrides
  };
}

// Creates a fresh TestableGameLoopService with a mock io
export function createTestService(): TestableGameLoopService {
  const mockIo = {} as Server;
  return new TestableGameLoopService(mockIo);
}
