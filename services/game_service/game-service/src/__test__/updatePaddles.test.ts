import { createTestService, createTestGameState } from './helpers/gameTestHelpers';


  /***************** */
 /*	UpdatePaddles	*/
/***************** */

describe('GameLoopService - updatePaddles', () => {
  let service = createTestService();

  beforeEach(() => {
    service = createTestService();
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

      expect(gameState.paddles.player1).toBe(50);
    });

    test('should clamp paddle at top limit (0)', () => {
      const gameState = createTestGameState({
        paddles: { player1: 1, player2: 50 },
        inputs: { player1_up: true, player1_down: false, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(0);
    });

    test('should clamp paddle at bottom limit (100)', () => {
      const gameState = createTestGameState({
        paddles: { player1: 99, player2: 50 },
        inputs: { player1_up: false, player1_down: true, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      expect(gameState.paddles.player1).toBe(100);
    });

    test('should not move when both UP and DOWN pressed', () => {
      const gameState = createTestGameState({
        paddles: { player1: 50, player2: 50 },
        inputs: { player1_up: true, player1_down: true, player2_up: false, player2_down: false }
      });

      service.testUpdatePaddles(gameState);

      // 50 - 2 + 2 = 50 (cancel each other out)
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

      expect(gameState.paddles.player1).toBe(48);  // Player 1 up
      expect(gameState.paddles.player2).toBe(52);  // Player 2 down
    });
  });
});
