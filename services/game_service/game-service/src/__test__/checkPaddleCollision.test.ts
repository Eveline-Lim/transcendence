import { createTestService, createTestGameState } from './helpers/gameTestHelpers';


  /*********************** */
 /*	CheckPaddleCollision  */
/*********************** */

describe('GameLoopService - checkPaddleCollision', () => {
  let service = createTestService();

  beforeEach(() => {
    service = createTestService();
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
        ball: { x: 5, y: 40, vx: -1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(false);
    });

    test('should NOT detect collision when ball too low', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 60, vx: -1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(false);
    });

    test('should work with paddle at top limit', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 7.5, vx: -1, vy: 0 },
        paddles: { player1: 7.5, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should work with paddle at bottom limit', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 92.5, vx: -1, vy: 0 },
        paddles: { player1: 92.5, player2: 50 }
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
        ball: { x: 5, y: 7.5, vx: -1, vy: 0 },
        paddles: { player1: 0, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should work when paddle is exactly at 100', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 92.5, vx: -1, vy: 0 },
        paddles: { player1: 100, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });

    test('should work when ball exactly on edge (boundary)', () => {
      const gameState = createTestGameState({
        ball: { x: 5, y: 42.5, vx: -1, vy: 0 },
        paddles: { player1: 50, player2: 50 }
      });

      const collision = service.testCheckPaddleCollision(gameState, 'player1');

      expect(collision).toBe(true);
    });
  });
});
