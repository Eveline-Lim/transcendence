"use strict";
// src/services/redis.instance.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const RedisService_1 = require("./RedisService");
const env_1 = require("../config/env");
exports.redis = env_1.IS_TEST ? null : new RedisService_1.RedisService();
