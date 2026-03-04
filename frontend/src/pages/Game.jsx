import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function Game() {

  // States && Refs
  const [gameState, setGameState] = useState(null);
  const socketRef = useRef(null);

  // useEffect, protected by []
  useEffect(() => {
    socketRef.current = io("http://localhost:3000");

    socketRef.current.on('game-update', ({ gameState }) => {
      setGameState(gameState);
    });

    return () => {
      socketRef.current.disconnect(); // cleanup
    };
  }, []);

  if (!gameState) return <p>Connexion en cours...</p>;

  return (
    <h1>Game Page</h1>
  );
}