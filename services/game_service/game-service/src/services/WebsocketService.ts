  /***********/
 /*	IMPORT	*/
/***********/

import { Server, Socket } from 'socket.io';

  /***********/
 /*	CLASS	*/
/***********/

export class WebsocketService {
	private io: Server;

	constructor(io: Server) {
		this.io = io;
		this.setupHandlers();
	}

	private setupHandlers() {
		this.io.on('connection', (socket: Socket) => {
			console.log(`WebSocket connected: ${socket.id}`);

			this.handlePing(socket);
			this.handleDisconnect(socket);
			// this.handleJoinGame(socket);      // ← À ajouter
			// this.handlePlayerMove(socket);    // ← À ajouter
			// this.handleError(socket);         // ← À ajouter
		});
	}

	private handlePing(socket: Socket) {
		socket.on('ping', () => {
			console.log('Received ping');
			socket.emit('pong', { message: 'Pong!' });
		});
	}

	private handleDisconnect(socket: Socket) {
		socket.on('disconnect', () => {
			console.log(`WebSocket disconnected: ${socket.id}`);
		});
	}

}