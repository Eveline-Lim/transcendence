import { createTestService, createTestGameState } from './helpers/gameTestHelpers';


  /***************** */
 /*	CheckCollisionY	*/
/***************** */

describe('GameLoopService - checkCollisionY', () => {
  let service = createTestService();

  beforeEach(() => {
    service = createTestService();
  });

  test('should not bounce if ball stays within limits', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: 1, vy: 2 }
    });

    service.testCheckCollisionY(gameState, 1);  // y = 50 + 2 = 52

    expect(gameState.ball.y).toBe(52);
    expect(gameState.ball.vy).toBe(2);
  });

  describe('Bounce on top wall (y < 0)', () => {
    test('should bounce when hitting top wall', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 2, vx: 1, vy: -5 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 2 + (-5) = -3

      expect(gameState.ball.y).toBe(5);     // Rebond off wall at BALL_RADIUS(1): 2*1 - (-3) = 5
      expect(gameState.ball.vy).toBe(5);    // Direction inversée
    });

    test('should handle exact boundary (y = 0)', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 0, vx: 1, vy: -1 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 0 + (-1) = -1

      expect(gameState.ball.y).toBe(3);     // Rebond off wall at BALL_RADIUS(1): 2*1 - (-1) = 3
      expect(gameState.ball.vy).toBe(1);
    });

    test('should bounce with partial distance', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 5, vx: 1, vy: -10 }
      });

      service.testCheckCollisionY(gameState, 0.8);  // y = 5 + (-10 * 0.8) = -3

      expect(gameState.ball.y).toBe(5);     // Rebond off wall at BALL_RADIUS(1): 2*1 - (-3) = 5
      expect(gameState.ball.vy).toBe(10);
    });
  });

  describe('Bounce on bottom wall (y > 100)', () => {
    test('should bounce when hitting bottom wall', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 98, vx: 1, vy: 5 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 98 + 5 = 103

      expect(gameState.ball.y).toBe(95);    // Rebond off wall at 100-BALL_RADIUS(99): 2*99 - 103 = 95
      expect(gameState.ball.vy).toBe(-5);   // Direction inversée
    });

    test('should handle exact boundary (y = 100)', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 100, vx: 1, vy: 1 }
      });

      service.testCheckCollisionY(gameState, 1);  // y = 100 + 1 = 101

      expect(gameState.ball.y).toBe(97);    // Rebond off wall at 100-BALL_RADIUS(99): 2*99 - 101 = 97
      expect(gameState.ball.vy).toBe(-1);
    });

    test('should bounce with partial distance', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 95, vx: 1, vy: 10 }
      });

      service.testCheckCollisionY(gameState, 0.6);  // y = 95 + (10 * 0.6) = 101

      expect(gameState.ball.y).toBe(97);    // Rebond off wall at 100-BALL_RADIUS(99): 2*99 - 101 = 97
      expect(gameState.ball.vy).toBe(-10);
    });
  });

  describe('Multiple bounces', () => {
    test('should handle multiple bounces (very fast ball)', () => {
      const gameState = createTestGameState({
        ball: { x: 50, y: 5, vx: 0, vy: -250 }
      });

      service.testCheckCollisionY(gameState, 1);

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

      expect(gameState.ball.y).toBe(50);
      expect(gameState.ball.vy).toBe(10);
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
