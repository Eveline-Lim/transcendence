"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINNING_SCORE = exports.MAX_BOUNCE_ANGLE = exports.PADDLE_RIGHT_X = exports.PADDLE_LEFT_X = exports.PADDLE_HEIGHT = exports.PADDLE_SPEED = exports.BALL_RADIUS = exports.PORT = exports.IS_PROD = exports.IS_DEV = exports.IS_TEST = exports.NODE_ENV = void 0;
exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.IS_TEST = exports.NODE_ENV === 'test';
exports.IS_DEV = exports.NODE_ENV === 'development';
exports.IS_PROD = exports.NODE_ENV === 'production';
exports.PORT = 3001;
// export const PORT = parseInt(process.env.PORT || '3001', 10); // 10 pour la base
exports.BALL_RADIUS = 1;
exports.PADDLE_SPEED = 2;
exports.PADDLE_HEIGHT = 15;
exports.PADDLE_LEFT_X = 5;
exports.PADDLE_RIGHT_X = 95;
exports.MAX_BOUNCE_ANGLE = 2;
exports.WINNING_SCORE = 11;
