
// export default function Game() {
// 	return (
// 		<div className="min-h-screen flex items-center justify-center p-4">
// 			<div className="card text-center max-w-sm">
// 				<h1 className="text-xl font-bold mb-2">Game</h1>
// 				<p className="msg-info">Game view coming soon...</p>
// 			</div>
// 		</div>
// 	);
// }

import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

// Map URL → route backend
const { difficulty } = useParams();
const MODE_CONFIG = {
	'/play/offline':	{ route: '/api/game/local',       body: { player_id: null } },
	'/play/ai':			{ route: '/api/game/IA',           body: { player: null, IA_level: difficulty } },
	'/play/ranked':		{ route: '/api/game/matchmaking',  body: { player1_id: null, player2_id: null } },
	'/play/casual':		{ route: '/api/game/matchmaking',  body: { player1_id: null, player2_id: null } },
};

// Map URL → touches écoutées
const KEY_CONFIG = {
  '/play/offline': {
		w:			'player1_up',
		s:			'player1_down',
		ArrowDown:	'player2_down',
		ArrowUp:	'player2_up',
  },
  '/play/ai':      { ArrowUp: 'up', ArrowDown: 'down' },
  '/play/ranked':  { ArrowUp: 'up', ArrowDown: 'down' },
  '/play/casual':  { ArrowUp: 'up', ArrowDown: 'down' },
};

export default function Game() {
	const [gameState, setGameState] = useState(null);
	const socketRef = useRef(null);
	const inputsRef = useRef({});  // état courant des touches
	const location = useLocation();

	useEffect(() => {
		const config = MODE_CONFIG[location.pathname];
		const keyMap = KEY_CONFIG[location.pathname];

		if (!config) return;

		// 1. Créer la partie
		const initGame = async () => {
			const res = await fetch(`http://localhost:3000${config.route}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config.body),
			});
			const { gameId } = await res.json();

			// 2. Connecter le socket avec le gameId
			socketRef.current = io('http://localhost:3000', {
				query: { gameId },
			});

			// 3. Recevoir le gameState
			socketRef.current.on('game-update', ({ gameState }) => {
				setGameState(gameState);
			});
		};

		initGame();

		// 4. Inputs clavier — uniquement quand une touche change
		const handleKey = (pressed) => ({ key }) => {
			const inputKey = keyMap[key];
			if (!inputKey) return; // touche non concernée

			inputsRef.current[inputKey] = pressed;
			socketRef.current?.emit('player-input', inputsRef.current);
		};

		window.addEventListener('keydown', handleKey(true));
		window.addEventListener('keyup',   handleKey(false));

		return () => {
			socketRef.current?.disconnect();
			window.removeEventListener('keydown', handleKey(true));
			window.removeEventListener('keyup',   handleKey(false));
		};
	}, [location.pathname]);
	// END useEffect();

	if (!gameState) return <p>Connexion en cours...</p>;

	return (
		<h1>Game Page</h1>
	);
}