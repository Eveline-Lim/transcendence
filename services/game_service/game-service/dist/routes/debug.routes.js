"use strict";
/***********/
/*	IMPORT	*/
/***********/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugRouter = void 0;
const express_1 = require("express");
const RedisInstance_1 = require("../services/RedisInstance");
const env_1 = require("../config/env");
const path_1 = __importDefault(require("path"));
/* ------------------------------------------------- */
exports.debugRouter = (0, express_1.Router)();
// Block all debug routes in production
exports.debugRouter.use((_req, res, next) => {
    if (env_1.IS_PROD) {
        return res.status(404).json({ error: 'Not found' });
    }
    next();
});
/***********************/
/*	Route http simple	*/
/***********************/
exports.debugRouter.get('/hello', (req, res) => {
    res.json({ message: 'Hello from game service!' });
});
exports.debugRouter.get('/patate', (req, res) => {
    res.json({ message: 'OUIII DES PATATES' });
});
// Nouvelle route : sauvegarder dans Redis
exports.debugRouter.post('/save', async (req, res) => {
    if (!RedisInstance_1.redis)
        return res.status(503).json({ error: 'Redis unavailable' });
    const { key, value } = req.body;
    await RedisInstance_1.redis.set(key, value);
    res.json({ message: 'Saved to Redis!', key, value });
});
// Nouvelle route : lire depuis Redis
exports.debugRouter.get('/get/:key', async (req, res) => {
    if (!RedisInstance_1.redis)
        return res.status(503).json({ error: 'Redis unavailable' });
    const value = await RedisInstance_1.redis.get(req.params.key);
    res.json({ key: req.params.key, value });
});
// Route basique
exports.debugRouter.get('/', (req, res) => {
    res.sendFile(path_1.default.join(process.cwd(), '../test-client.html'));
});
