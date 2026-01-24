import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import cors from 'cors';
import { RedisService } from './services/RedisService';
import { GameState } from './models/GameState';

import path from 'path';

// Crée l'application
const app = express();
// app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: '*',
  	}
});
const redis = new RedisService();

// Indique qu'on accepte du JSON
app.use(express.json());

  /***********************/
 /*	Route http simple	*/
/***********************/
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from game service!' });
});

app.get('/patate', (req, res) => {
  res.json({ message: 'OUIII DES PATATES' });
});

// Nouvelle route : sauvegarder dans Redis
app.post('/test/save', async (req, res) => {
  const { key, value } = req.body;
  await redis.set(key, value);
  res.json({ message: 'Saved to Redis!', key, value });
});

// Nouvelle route : lire depuis Redis
app.get('/test/get/:key', async (req, res) => {
  const value = await redis.get(req.params.key);
  res.json({ key: req.params.key, value });
});

// Route basique
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), '../test-client.html'));
});


app.post('/matchmaking', async (req, res) => {
	//blabla je cree ma partie je lenvoie dans REDIS
	const { player1_id, player2_id } = req.body;
})

  /***************/
 /*	WebSocket	*/
/***************/

io.on('connection', (socket) => {
  console.log(`WebSocket connected: ${socket.id}`);

  // Test simple
  socket.on('ping', () => {
    console.log('Received ping');
    socket.emit('pong', { message: 'Pong!' });
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket disconnected: ${socket.id}`);
  });
});

// Démarre le serveur
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Game service started on port ${PORT}`);
  console.log(`🔌 WebSocket ready`);
});

  /***************/
 /*	Function	*/
/***************/

function sum(a: number, b: number) {
	return a + b;
}

module.exports = sum;