/***********/
 /*	IMPORT	*/
/***********/

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { AI_SERVICE_URL, PADDLE_HEIGHT, PADDLE_SPEED, PADDLE_RIGHT_X, PADDLE_WIDTH } from '../config/env';
import { GameState } from '../models/GameState';
import { logger } from '../config/logger';

const AI_OPPONENT_SERVICE_PROTO_PATH = path.join(
	__dirname,
	'..',
	'..',
	'proto',
	'ai_opponent_service.proto',
);

  /***********/
 /*	TYPES	*/
/***********/

export interface AIMoveResult {
	target_y: number;
	reaction_delay_ms?: number;
}

  /***********/
 /*	CLASS	*/
/***********/

export class AIServiceClient {
  private client: any;

  constructor() {
    try {
      const packageDefinition = protoLoader.loadSync(AI_OPPONENT_SERVICE_PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const aiProto = (grpc.loadPackageDefinition(packageDefinition) as any).ai_opponent;
      this.client = new aiProto.AIOpponentService(AI_SERVICE_URL, grpc.credentials.createInsecure());
      logger.info('AIServiceClient created successfully.');
      logger.info(`Connecting to AI service at ${AI_SERVICE_URL}`);
    } catch (error) {
      logger.error('Failed to create AIServiceClient:', error);
      throw error;
    }
  }

  /**
   * Request the AI's next move given the current game state.
   * Translates the internal GameState into the proto GameState format.
   */
  getMove(gameState: GameState, difficulty = 2): Promise<AIMoveResult> {
    // Map internal game state to proto GameState message
    const protoState = {
      game_id: gameState.gameId,
      difficulty,
      ball: {
        x: gameState.ball.x,
        y: gameState.ball.y,
        velocity_x: gameState.ball.vx,
        velocity_y: gameState.ball.vy,
      },
      ai_paddle: {
        y: gameState.paddles.player2,
        height: PADDLE_HEIGHT,
        speed: PADDLE_SPEED,
      },
      player_paddle: {
        y: gameState.paddles.player1,
        height: PADDLE_HEIGHT,
        speed: PADDLE_SPEED,
      },
      arena: {
        width: PADDLE_RIGHT_X - PADDLE_WIDTH / 2,
        height: 100,
      },
      ai_score: gameState.score.player2,
      player_score: gameState.score.player1,
      power_ups: [],
      config: {
        power_ups_enabled: false,
        paddle_speed_multiplier: 1.0,
        ball_speed_multiplier: 1.0,
      },
    };

    return new Promise((resolve, reject) => {
      this.client.GetMove(
        protoState,
        (error: grpc.ServiceError | null, response: AIMoveResult) => {
          if (error) {
            logger.error('Error from AI service:', error);
            return reject(error);
          }
          resolve(response);
        },
      );
    });
  }

  destroy(): void {
    grpc.closeClient(this.client);
  }
}

export const aiServiceClient = new AIServiceClient();
