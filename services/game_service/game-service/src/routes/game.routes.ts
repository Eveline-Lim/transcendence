  /***********/
 /*	IMPORT	*/
/***********/

import{ Router } from 'express';
import { RedisService } from '../services/RedisService';
import { IS_TEST } from '../config/env';

/* ------------------------------------------------- */


/*
 * 
 * 		ATTENTION a commencer avec /API 
 */

export const	gameRouter = Router();
export const redis = IS_TEST ? null : new RedisService();
// export const 	redis = new RedisService();

gameRouter.post('/create-game', async (req, res) => {
	//blabla je cree ma partie je lenvoie dans REDIS
	const { player1_id, player2_id } = req.body;
	
	res.json("Thanks Mate :3\nJ'espere que c'est assez cringe, des bisous\n");
})