import { createTestService, createTestGameState } from './helpers/gameTestHelpers';


  /****************** */
 /*	UpdateBallSpeed  */
/****************** */

describe('GameLoopService - updateBallSpeed', () => {
  let service = createTestService();

  beforeEach(() => {
    service = createTestService();
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

    expect(gameState.ball.vx).toBeGreaterThan(0);
    expect(gameState.ball.vx).toBe(2.05);
  });

  test('should preserve direction (negative stays negative)', () => {
    const gameState = createTestGameState({
      ball: { x: 50, y: 50, vx: -2, vy: 0 }
    });

    service.testUpdateBallSpeed(gameState);

    expect(gameState.ball.vx).toBeLessThan(0);
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

    expect(gameState.ball.vy).toBe(3);
  });
});
