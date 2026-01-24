  /***********/
 /*	IMPORT	*/
/***********/

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebsocketService } from './services/WebsocketService';
import cors from 'cors';
import { gameRouter } from './routes/game.routes';
import { debugRouter } from './routes/debug.routes';

  /*******/
 /*	APP	*/
/*******/

// Crée l'application
export const app = express();
app.use(cors());

export const httpServer = createServer(app);
export const io = new Server(httpServer, {
	cors: {
		origin: '*',
  	}
});

// Indique qu'on accepte du JSON
app.use(express.json());

//configuration pour les routes
app.use('/', debugRouter);
app.use('/api', gameRouter);

//configure les websocket
new WebsocketService(io);

  /***************/
 /*	Function	*/
/***************/

export function sum(a: number, b: number) {
	return a + b;
}
