// src/__tests__/GameLoopService.test.ts

import { GameLoopService } from '../services/GameLoopService';
import { GameState } from '../models/GameState';
import { Server } from 'socket.io';

// Classe testable qui hérite de GameLoopService
class TestableGameLoopService extends GameLoopService {
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

// Helper pour créer un gameState par défaut
function createTestGameState(overrides?: Partial<GameState>): GameState {
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


  /***************** */
 /*	UpdatePaddles	*/
/***************** */


describe('GameLoopService - updatePaddles', () => {
  let service: TestableGameLoopService;

  beforeEach(() => {
    const mockIo = {} as Server;
    service = new TestableGameLoopService(mockIo);
  });

  describe('Player 1 movements', () => {
    test('should move paddle up when UP is pressed', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: true, player1_down: false, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(48);  // 50 - 2
    });

    test('should move paddle down when DOWN is pressed', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: false, player1_down: true, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(52);  // 50 + 2
    });

    test('should not move when no input', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: false, player1_down: false, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(50);  // Pas de changement
    });

    test('should clamp paddle at top limit (0)', () => {
      const gameState = createTestGameState({
        paddles: { player1: 1, player2: 50 },
        inputs: { player1_up: true, player1_down: false, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(0);  // Clamped à 0
    });

    test('should clamp paddle at bottom limit (100)', () => {
      const gameState = createTestGameState({
        paddles: { player1: 99, player2: 50 },
        inputs: { player1_up: false, player1_down: true, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(100);  // Clamped à 100
    });

    test('should not move when both UP and DOWN pressed', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: true, player1_down: true, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      // 50 - 2 + 2 = 50 (les deux s'annulent)
      expect(gameState.paddles.player1).toBe(50);
    });
  });

  describe('Player 2 movements', () => {
    test('should move paddle up when UP is pressed', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: false, player1_down: false, player2_up: true, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player2).toBe(48);
    });

    test('should move paddle down when DOWN is pressed', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: false, player1_down: false, player2_up: false, player2_down: true }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player2).toBe(52);
    });

    test('should work independently from Player 1', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: true, player1_down: false, player2_up: false, player2_down: true }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(48);  // Player 1 monte
      expect(gameState.paddles.player2).toBe(52);  // Player 2 descend
    });
  });
});

  /***************** */
 /*	CheckCollisionY	*/
/***************** */

// Ajoute après les tests updatePaddles

describe('GameLoopService - checkCollisionY', () => {
  let service: TestableGameLoopService;

  beforeEach(() => {
    const mockIo = {} as Server;
    service = new TestableGameLoopService(mockIo);
  });

  test('should not bounce if ball stays within limits', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 1, vy: 2 }
    });

    service.testCheckCollisionY(gameState, 1);  // y = 50 + 2 = 52

    expect(gameState.ball.y).toBe(52);
    expect(gameState.ball.vy).toBe(2);  // Direction inchangée
  });

  describe('Bounce on top wall (y < 0)', () => {
    test('should bounce when hitting top wall', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 2, vx: 1, vy: -5 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 2 + (-5) = -3

      expect(gameState.ball.y).toBe(3);     // Rebond : -(-3) = 3
      expect(gameState.ball.vy).toBe(5);    // Direction inversée
    });

    test('should handle exact boundary (y = 0)', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 0, vx: 1, vy: -1 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 0 + (-1) = -1

      expect(gameState.ball.y).toBe(1);
      expect(gameState.ball.vy).toBe(1);
    });

    test('should bounce with partial distance', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 5, vx: 1, vy: -10 }
      });

      service.testCheckCollisionY(gameState, 0.8);  // y = 5 + (-10 * 0.8) = -3

      expect(gameState.ball.y).toBe(3);
      expect(gameState.ball.vy).toBe(10);
    });
  });

  describe('Bounce on bottom wall (y > 100)', () => {
    test('should bounce when hitting bottom wall', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 98, vx: 1, vy: 5 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 98 + 5 = 103

      expect(gameState.ball.y).toBe(97);    // Rebond : 100 - (103 - 100) = 97
      expect(gameState.ball.vy).toBe(-5);   // Direction inversée
    });

    test('should handle exact boundary (y = 100)', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 100, vx: 1, vy: 1 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 100 + 1 = 101

      expect(gameState.ball.y).toBe(99);
      expect(gameState.ball.vy).toBe(-1);
    });

    test('should bounce with partial distance', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 95, vx: 1, vy: 10 }
      });

      service.testCheckCollisionY(gameState, 0.6);  // y = 95 + (10 * 0.6) = 101

      expect(gameState.ball.y).toBe(99);
      expect(gameState.ball.vy).toBe(-10);
    });
  });

  describe('Multiple bounces', () => {
    test('should handle multiple bounces (very fast ball)', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 5, vx: 0, vy: -250 }
      });

      service.testCheckCollisionY(gameState, 1);  
      // y = 5 + (-250) = -245
      // Rebond 1: y = 245 (top wall)
      // Rebond 2: y = 100 - (245 - 100) = -45 (bottom wall)
      // Rebond 3: y = 45 (top wall)

      // Vérifie que la balle reste dans les limites
      expect(gameState.ball.y).toBeGreaterThanOrEqual(0);
      expect(gameState.ball.y).toBeLessThanOrEqual(100);
    });

    test('should stabilize after multiple bounces', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 10, vx: 0, vy: 300 }
      });

      service.testCheckCollisionY(gameState, 1);

      expect(gameState.ball.y).toBeGreaterThanOrEqual(0);
      expect(gameState.ball.y).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge cases', () => {
    test('should handle zero velocity', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 50, vx: 0, vy: 0 }
      });

      service.testCheckCollisionY(gameState, 1);

      expect(gameState.ball.y).toBe(50);
      expect(gameState.ball.vy).toBe(0);
    });

    test('should handle zero distance', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 50, vx: 1, vy: 10 }
      });

      service.testCheckCollisionY(gameState, 0);

      expect(gameState.ball.y).toBe(50);  // Pas de mouvement
      expect(gameState.ball.vy).toBe(10); // Direction inchangée
    });

    test('should handle negative velocity (moving down)', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 50, vx: 1, vy: 10 }
      });

      service.testCheckCollisionY(gameState, 1);

      expect(gameState.ball.y).toBe(60);
      expect(gameState.ball.vy).toBe(10);
    });
  });
});

  /*********************** */
 /*	CheckPaddleCollision  */
/*********************** */

describe('GameLoopService - checkPaddleCollision', () => {
  let service: TestableGameLoopService;

  beforeEach(() => {
    const mockIo = {} as Server;
    service = new TestableGameLoopService(mockIo);
  });

  describe('Player 1 (left paddle)', () => {
    test('should detect collision when ball at paddle center', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 50, vx: -1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should detect collision at top of paddle', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 42.5, vx: -1, vy: 0 },  // 50 - 7.5 (PADDLE_HEIGHT/2)
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should detect collision at bottom of paddle', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 57.5, vx: -1, vy: 0 },  // 50 + 7.5 (PADDLE_HEIGHT/2)
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should NOT detect collision when ball too high', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 40, vx: -1, vy: 0 },  // < 42.5 (top)
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(false);
    });

    test('should NOT detect collision when ball too low', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 60, vx: -1, vy: 0 },  // > 57.5 (bottom)
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(false);
    });

    test('should work with paddle at top limit', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 7.5, vx: -1, vy: 0 },  // Centre du paddle quand paddle à 7.5
        paddles: { player1: 7.5, player2: 50 }  // Paddle très haut
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should work with paddle at bottom limit', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 92.5, vx: -1, vy: 0 },  // Centre du paddle quand paddle à 92.5
        paddles: { player1: 92.5, player2: 50 }  // Paddle très bas
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });
  });

  describe('Player 2 (right paddle)', () => {
    test('should detect collision when ball at paddle center', () => {
      const gameState = createTestGameState({
        ball: { x: 95, y: 50, vx: 1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player2');

      expect(collision).toBe(true);
    });

    test('should detect collision at top of paddle', () => {
      const gameState = createTestGameState({
        ball: { x: 95, y: 42.5, vx: 1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player2');

      expect(collision).toBe(true);
    });

    test('should detect collision at bottom of paddle', () => {
      const gameState = createTestGameState({
        ball: { x: 95, y: 57.5, vx: 1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player2');

      expect(collision).toBe(true);
    });

    test('should NOT detect collision when ball too high', () => {
      const gameState = createTestGameState({
        ball: { x: 95, y: 40, vx: 1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player2');

      expect(collision).toBe(false);
    });

    test('should NOT detect collision when ball too low', () => {
      const gameState = createTestGameState({
        ball: { x: 95, y: 60, vx: 1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player2');

      expect(collision).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('should work when paddle is exactly at 0', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 7.5, vx: -1, vy: 0 },  // Au centre du paddle (0 + PADDLE_HEIGHT/2)
        paddles: { player1: 0, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should work when paddle is exactly at 100', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 92.5, vx: -1, vy: 0 },  // Au centre du paddle (100 - PADDLE_HEIGHT/2)
        paddles: { player1: 100, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should work when ball exactly on edge (boundary)', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 42.5, vx: -1, vy: 0 },  // Exactement sur le bord
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });
  });
});

  /****************** */
 /*	UpdateBallSpeed  */
/****************** */

describe('GameLoopService - updateBallSpeed', () => {
  let service: TestableGameLoopService;

  beforeEach(() => {
    const mockIo = {} as Server;
    service = new TestableGameLoopService(mockIo);
  });

  test('should increase speed when ball moving right (vx > 0)', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 1, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vx).toBe(1.05);  // 1 + 0.05
  });

  test('should increase speed when ball moving left (vx < 0)', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: -1, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vx).toBe(-1.05);  // -1 + (-0.05)
  });

  test('should preserve direction (positive stays positive)', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 2, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vx).toBeGreaterThan(0);  // Reste positif
    expect(gameState.ball.vx).toBe(2.05);
  });

  test('should preserve direction (negative stays negative)', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: -2, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vx).toBeLessThan(0);  // Reste négatif
    expect(gameState.ball.vx).toBe(-2.05);
  });

  test('should compound speed increases', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 1, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);  // 1.05
    service.testUpdateBallSpeed(gameState);  // 1.10
    service.testUpdateBallSpeed(gameState);  // 1.15

    expect(gameState.ball.vx).toBeCloseTo(1.15, 2);
  });

  test('should work with very small velocities', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 0.1, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vx).toBeCloseTo(0.15);
  });

  test('should work with large velocities', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 10, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vx).toBe(10.05);
  });

  test('should not modify vertical velocity (vy)', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 1, vy: 3 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vy).toBe(3);  // Inchangé
  });
});