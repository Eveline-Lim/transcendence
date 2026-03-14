
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_TEST = NODE_ENV === 'test';
export const IS_DEV = NODE_ENV === 'development';
export const IS_PROD = NODE_ENV === 'production';
export const PORT = 3001;
// export const PORT = parseInt(process.env.PORT || '3001', 10); // 10 pour la base

export const PLAYER_SERVICE_URL = process.env.PLAYER_SERVICE_URL || 'http://player_service:8080';
export const AI_SERVICE_URL      = process.env.AI_SERVICE_URL      || 'ai_opponent_service:50051';

export const BALL_RADIUS = 1;
export const PADDLE_SPEED = 2;
export const PADDLE_HEIGHT = 15;
export const PADDLE_WIDTH = 1.5;
export const PADDLE_LEFT_X = 5;
export const PADDLE_RIGHT_X = 95;
export const MAX_BOUNCE_ANGLE = 2;
export const WINNING_SCORE = 11;