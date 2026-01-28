  /***********/
 /*	IMPORT	*/
/***********/

import{ Router } from 'express';
import { redis } from '../services/RedisInstance'
import path from 'path';

/* ------------------------------------------------- */

export const	debugRouter = Router();

  /***********************/
 /*	Route http simple	*/
/***********************/
debugRouter.get('/hello', (req, res) => {
	res.json({ message: 'Hello from game service!' });
});

debugRouter.get('/patate', (req, res) => {
	res.json({ message: 'OUIII DES PATATES' });
});

// Nouvelle route : sauvegarder dans Redis
debugRouter.post('/save', async (req, res) => {
	if (!redis) return res.status(503).json({ error: 'Redis unavailable' })
	const { key, value } = req.body;
	await redis.set(key, value);
	res.json({ message: 'Saved to Redis!', key, value });
});

// Nouvelle route : lire depuis Redis
debugRouter.get('/get/:key', async (req, res) => {
	if (!redis) return res.status(503).json({ error: 'Redis unavailable' })
	const value = await redis.get(req.params.key);
	res.json({ key: req.params.key, value });
});

// Route basique
debugRouter.get('/', (req, res) => {
	res.sendFile(path.join(process.cwd(), '../test-client.html'));
});