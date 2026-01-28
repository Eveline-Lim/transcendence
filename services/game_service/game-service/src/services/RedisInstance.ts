// src/services/redis.instance.ts

import { RedisService } from './RedisService';
import { IS_TEST } from '../config/env'

export const redis = IS_TEST ? null : new RedisService();
