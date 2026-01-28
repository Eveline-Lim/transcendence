
// '?' Defini une propriete optionnel

export interface GameState {
	gameId: string;			// ID unique
	player1_id: string;
	player2_id: string;

	status: 'waiting' | 'playing' | 'finished';	//State of the game
	
	score: {
		player1: number;
		player2: number;
	}

	ball: {
		x: number;
		y: number;
		vx: number;			// Velocity
		vy: number;
	};

	paddles: {
		player1: number;	// Position Y
		player2: number;	// X doesn't change
	}

	created_at: number;		// Timestamp
	updated_at?: number;	// Timestamp updated (Do I need it ?)
	
	winner?: string;		// ID winner
}