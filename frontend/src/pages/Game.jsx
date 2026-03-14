import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import NavBar from "../components/NavBar";
import { MatchSocket } from "../utils/matchSocket";
import { GameSocket } from "../utils/gameSocket";
import { LocalGameEngine } from "../utils/localGameEngine";
import { api } from "../utils/api";

// ─── Canvas rendering constants ──────────────────────────────────────────────
const CANVAS_W = 800;
const CANVAS_H = 500;

// Mirror the game-service config values (src/config/env.ts)
const PADDLE_LEFT_X  = 5;   // % from left
const PADDLE_RIGHT_X = 95;  // % from left
const PADDLE_HEIGHT  = 15;  // %
const PADDLE_WIDTH   = 1.5; // % (visual only)
const BALL_RADIUS    = 1;   // %

const MODE_LABEL = {
	casual:  "Casual",
	ranked:  "Ranked",
	ai:      "vs AI",
	offline: "Local (Offline)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a percentage value to canvas pixels along an axis. */
const px = (pct, axis) => (pct / 100) * (axis === "x" ? CANVAS_W : CANVAS_H);

/** Draw the current game state onto a canvas 2D context. */
function renderFrame(ctx, gs) {
	if (!ctx || !gs) return;

	// Background
	ctx.fillStyle = "#0d0d1a";
	ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

	// Center net (dashed)
	ctx.setLineDash([8, 8]);
	ctx.strokeStyle = "rgba(255,255,255,0.25)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(CANVAS_W / 2, 0);
	ctx.lineTo(CANVAS_W / 2, CANVAS_H);
	ctx.stroke();
	ctx.setLineDash([]);

	// Score
	ctx.fillStyle = "rgba(255,255,255,0.8)";
	ctx.font = "bold 48px monospace";
	ctx.textAlign = "center";
	ctx.fillText(gs.score.player1, CANVAS_W / 2 - 80, 60);
	ctx.fillText(gs.score.player2, CANVAS_W / 2 + 80, 60);

	// Left paddle
	const pw = px(PADDLE_WIDTH,  "x");
	const ph = px(PADDLE_HEIGHT, "y");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(
		px(PADDLE_LEFT_X, "x") - pw / 2,
		px(gs.paddles.player1, "y") - ph / 2,
		pw,
		ph,
	);

	// Right paddle
	ctx.fillRect(
		px(PADDLE_RIGHT_X, "x") - pw / 2,
		px(gs.paddles.player2,  "y") - ph / 2,
		pw,
		ph,
	);

	// Ball
	ctx.beginPath();
	ctx.arc(
		px(gs.ball.x, "x"),
		px(gs.ball.y, "y"),
		px(BALL_RADIUS, "x"),
		0,
		Math.PI * 2,
	);
	ctx.fill();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Game() {
	const location  = useLocation();
	const navigate  = useNavigate();
	const { currentUser, authLoading } = useContext(AuthContext);

	// Derive game mode from URL: /play/casual | /play/ranked | /play/ai | /play/offline
	const mode = location.pathname.split("/").pop();

	// ── Phase state machine ────────────────────────────────────────────────────
	// idle → matchmaking → found → waiting → playing → finished
	const [phase,     setPhase]     = useState("idle");
	const [queueInfo, setQueueInfo] = useState(null);   // { playersWaiting, estimatedWaitTime }
	const [matchInfo, setMatchInfo] = useState(null);   // { matchId, opponent }
	const [gameState, setGameState] = useState(null);   // live snapshot for the game-over UI
	const [myId,      setMyId]      = useState(null);   // "player1" | "player2"
	const [error,     setError]     = useState(null);

	// ── Refs (mutations here must not trigger re-renders) ─────────────────────
	const canvasRef      = useRef(null);
	const matchSockRef   = useRef(null);
	const gameSockRef    = useRef(null);
	const gameStateRef   = useRef(null); // always-current snapshot for the RAF loop
	const keysRef        = useRef({ up: false, down: false });
	const rafRef         = useRef(null);
	const phaseRef       = useRef("idle");
	const localEngineRef = useRef(null);

	const isLocal = mode === "offline";

	const updatePhase = (next) => {
		phaseRef.current = next;
		setPhase(next);
	};

	// ── Redirect if unauthenticated ───────────────────────────────────────────
	useEffect(() => {
		if (!authLoading && !currentUser) navigate("/", { replace: true });
	}, [authLoading, currentUser, navigate]);

	// ── Cleanup on unmount ────────────────────────────────────────────────────
	useEffect(() => {
		return () => {
			matchSockRef.current?.disconnect();
			gameSockRef.current?.disconnect();
			localEngineRef.current?.stop();
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	// ── Canvas render loop (RAF) ───────────────────────────────────────────────
	useEffect(() => {
		if (phase !== "playing" && phase !== "finished") {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			return;
		}
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		const loop = () => {
			renderFrame(ctx, gameStateRef.current);
			rafRef.current = requestAnimationFrame(loop);
		};
		rafRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafRef.current);
	}, [phase]);

	// ── Keyboard input → paddle-input events ─────────────────────────────────
	useEffect(() => {
		if (phase !== "playing") return;

		const onDown = (e) => {
			if (isLocal) {
				const engine = localEngineRef.current;
				if (!engine) return;
				if (e.key === "w" || e.key === "W") engine.setInput("player1_up", true);
				if (e.key === "s" || e.key === "S") engine.setInput("player1_down", true);
				if (mode === "offline") {
					if (e.key === "ArrowUp")   { e.preventDefault(); engine.setInput("player2_up", true); }
					if (e.key === "ArrowDown") { e.preventDefault(); engine.setInput("player2_down", true); }
				} else {
					if (e.key === "ArrowUp")   { e.preventDefault(); engine.setInput("player1_up", true); }
					if (e.key === "ArrowDown") { e.preventDefault(); engine.setInput("player1_down", true); }
				}
			} else {
				const gs = gameSockRef.current;
				if (!gs) return;
				if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W") && !keysRef.current.up) {
					keysRef.current.up = true;
					gs.sendPaddleInput("up-pressed");
				}
				if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && !keysRef.current.down) {
					keysRef.current.down = true;
					gs.sendPaddleInput("down-pressed");
				}
			}
		};

		const onUp = (e) => {
			if (isLocal) {
				const engine = localEngineRef.current;
				if (!engine) return;
				if (e.key === "w" || e.key === "W") engine.setInput("player1_up", false);
				if (e.key === "s" || e.key === "S") engine.setInput("player1_down", false);
				if (mode === "offline") {
					if (e.key === "ArrowUp")   engine.setInput("player2_up", false);
					if (e.key === "ArrowDown") engine.setInput("player2_down", false);
				} else {
					if (e.key === "ArrowUp")   engine.setInput("player1_up", false);
					if (e.key === "ArrowDown") engine.setInput("player1_down", false);
				}
			} else {
				if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
					keysRef.current.up = false;
					gameSockRef.current?.sendPaddleInput("up-released");
				}
				if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
					keysRef.current.down = false;
					gameSockRef.current?.sendPaddleInput("down-released");
				}
			}
		};

		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup",   onUp);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup",   onUp);
		};
	}, [phase, isLocal, mode]);

	// ── Local game (offline) ─────────────────────────────────────────────────
	const startLocalGame = useCallback(() => {
		setError(null);
		const engine = new LocalGameEngine(
			(state) => {
				gameStateRef.current = state;
			},
			(state) => {
				gameStateRef.current = state;
				setGameState({ ...state });
				updatePhase("finished");
			},
			null,
		);
		localEngineRef.current = engine;
		const initial = engine.getState();
		gameStateRef.current = initial;
		setGameState({ ...initial });
		engine.start();
		updatePhase("playing");
	}, [mode]);

	// ── Game service connection ───────────────────────────────────────────────
	const connectToGame = useCallback(() => {
		const gs = new GameSocket();
		gameSockRef.current = gs;

		try {
			const socket = gs.connect();

			socket.on("connect", () => {
				updatePhase("waiting");
				gs.joinGame();
			});

			socket.on("joined-game", ({ game_state }) => {
				gameStateRef.current = game_state;
				setGameState(game_state);
				const uid = String(currentUser?.id ?? currentUser?.userId ?? "");
				if (uid) setMyId(game_state.player1_id === uid ? "player1" : "player2");
			});

			socket.on("game-start", ({ game_state }) => {
				gameStateRef.current = game_state;
				setGameState(game_state);
				updatePhase("playing");
			});

			socket.on("game-update", (update) => {
				const next = gameStateRef.current ? { ...gameStateRef.current, ...update } : update;
				gameStateRef.current = next;
				// Only update React state on score/status changes to avoid 60fps re-renders
				if (
					update.score !== undefined ||
					update.status !== undefined ||
					update.winner !== undefined
				) {
					setGameState(next);
				}
			});

			socket.on("game-over", ({ game_state }) => {
				gameStateRef.current = game_state;
				setGameState(game_state);
				updatePhase("finished");
			});

			socket.on("error", ({ message }) => {
				setError(message);
				updatePhase("idle");
				gs.disconnect();
				gameSockRef.current = null;
			});

			socket.on("disconnect", () => {
				if (phaseRef.current === "playing") {
					setError("Disconnected from game server.");
					updatePhase("idle");
				}
			});
		} catch {
			setError("Could not connect to game service. Please try again.");
			updatePhase("idle");
		}
	}, [currentUser]);

	// ── AI game (server-side via AI opponent service) ─────────────────────────
	const startAIGame = useCallback(async () => {
		setError(null);
		updatePhase("matchmaking");

		try {
			const result = await api("/api/v1/game/create-ai-game", { method: "POST" });
			if (!result.success) {
				setError(result.message || "Failed to create AI game");
				updatePhase("idle");
				return;
			}
			// Fake matchInfo so opponent-display code has something to show
			setMatchInfo({ opponent: { username: "AI", avatarUrl: null } });
			updatePhase("found");
			connectToGame();
		} catch {
			setError("Could not create AI game. Please try again.");
			updatePhase("idle");
		}
	}, [connectToGame]);

	// ── Match service connection ──────────────────────────────────────────────
	const startMatchmaking = useCallback(async () => {
		setError(null);
		updatePhase("matchmaking");

		const ms = new MatchSocket();
		matchSockRef.current = ms;

		ms.on("queue_update", (data) => setQueueInfo(data));

		ms.on("match_found", (data) => {
			setMatchInfo(data);
			updatePhase("found");
			ms.disconnect();
			matchSockRef.current = null;
			connectToGame();
		});

		ms.on("matchmaking_error", ({ message }) => {
			setError(message);
			updatePhase("idle");
			ms.disconnect();
			matchSockRef.current = null;
		});

		ms.on("close", () => {
			if (phaseRef.current === "matchmaking") {
				setError("Connection to match service lost. Please try again.");
				updatePhase("idle");
			}
		});

		ms.on("error", () => {
			setError("Could not connect to match service. Please try again.");
			updatePhase("idle");
		});

		try {
			await ms.connect(mode === "ranked" ? "ranked" : "casual");
		} catch {
			setError("Could not connect to match service. Please try again.");
			updatePhase("idle");
		}
	}, [mode, connectToGame]);

	const cancelMatchmaking = () => {
		matchSockRef.current?.leaveQueue();
		matchSockRef.current?.disconnect();
		matchSockRef.current = null;
		setPhase("idle");
		setQueueInfo(null);
	};

	const playAgain = () => {
		localEngineRef.current?.stop();
		localEngineRef.current = null;
		gameSockRef.current?.disconnect();
		gameSockRef.current = null;
		setGameState(null);
		setMatchInfo(null);
		setQueueInfo(null);
		setMyId(null);
		setError(null);
		gameStateRef.current = null;
		updatePhase("idle");
	};

	// ── Winner label ──────────────────────────────────────────────────────────
	const winnerLabel = () => {
		if (!gameState?.winner) return "Draw";
		if (mode === "offline") {
			return gameState.winner === "player1" ? "Player 1 wins! 🎉" : "Player 2 wins! 🎉";
		}
		const uid = String(currentUser?.id ?? currentUser?.userId ?? "");
		if (mode === "ai") {
			if (uid && gameState.winner === uid) return "You win! 🎉";
			return "AI wins!";
		}
		// Online (casual / ranked)
		if (uid && gameState.winner === uid) return "You win! 🎉";
		return `${matchInfo?.opponent?.username ?? "Opponent"} wins`;
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	if (authLoading) return null;




	return (
		<>
			<NavBar />
			<div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">

				{/* ── Idle ─────────────────────────────────────────────── */}
				{phase === "idle" && (
					<div className="card text-center max-w-sm w-full">
						<h1 className="text-2xl font-bold mb-1">
							{MODE_LABEL[mode] ?? mode} Mode
						</h1>
						<p className="msg-info mb-6">
								{mode === "offline" ? "Press Start to play Pong!" : mode === "ai" ? "Challenge the AI!" : "Find an opponent and play Pong!"}
							</p>
						{error && <p className="msg-error mb-4">{error}</p>}
			<button className="btn w-full" onClick={
					mode === "offline" ? startLocalGame
					: mode === "ai"      ? startAIGame
					:                     startMatchmaking
				}>
							{isLocal ? "Start Game" : mode === "ai" ? "Play vs AI" : "Find Match"}
						</button>
						<button
							className="btn btn-secondary mt-2 w-full"
							onClick={() => navigate("/home")}
						>
							Back to Home
						</button>
					</div>
				)}

				{/* ── Matchmaking ──────────────────────────────────────── */}
				{phase === "matchmaking" && (
					<div className="card text-center max-w-sm w-full">
						<h1 className="text-xl font-bold mb-2">Searching for opponent…</h1>
						<div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4" />
						{queueInfo && (
							<p className="msg-info mb-1">
								Players in queue: <strong>{queueInfo.playersWaiting}</strong>
							</p>
						)}
						{queueInfo?.estimatedWaitTime > 0 && (
							<p className="text-sm text-gray-400 mb-4">
								Estimated wait: ~{queueInfo.estimatedWaitTime}s
							</p>
						)}
						<button className="btn btn-secondary w-full" onClick={cancelMatchmaking}>
							Cancel
						</button>
					</div>
				)}

				{/* ── Match found / connecting to game ─────────────────── */}
				{(phase === "found" || phase === "waiting") && matchInfo && (
					<div className="card text-center max-w-sm w-full">
						<h1 className="text-xl font-bold mb-2">Match Found!</h1>
						{matchInfo.opponent?.avatarUrl && (
							<img
								src={matchInfo.opponent.avatarUrl}
								alt={matchInfo.opponent.username}
								className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
							/>
						)}
						<p className="text-lg mb-1">
							vs <strong>{matchInfo.opponent?.username ?? "Opponent"}</strong>
						</p>
						<p className="msg-info">
							{phase === "found"
								? "Connecting to game server…"
								: "Waiting for opponent to connect…"}
						</p>
						<div className="animate-spin w-6 h-6 border-4 border-t-transparent rounded-full mx-auto mt-4" />
					</div>
				)}

				{/* ── Playing / Finished ───────────────────────────────── */}
				{(phase === "playing" || phase === "finished") && (
					<div className="flex flex-col items-center gap-3">
						{/* Player name labels above canvas */}
						<div
							className="flex justify-between w-full text-sm text-gray-300"
							style={{ maxWidth: CANVAS_W }}
						>
							<span>
							{isLocal
								? "▶ Player 1 (W / S)"
								: mode === "ai"
									? `▶ You (${currentUser?.username ?? ""})`
									: myId === "player1"
										? `▶ You (${currentUser?.username ?? ""})`
										: (matchInfo?.opponent?.username ?? "Player 1")}
						</span>
						<span>
							{isLocal
								? "Player 2 (↑ / ↓) ◀"
								: mode === "ai"
									? "AI ◀"
									: myId === "player2"
										? `You (${currentUser?.username ?? ""}) ◀`
										: (matchInfo?.opponent?.username ?? "Player 2")}
							</span>
						</div>

						{/* Game canvas */}
						<canvas
							ref={canvasRef}
							width={CANVAS_W}
							height={CANVAS_H}
							className="rounded-lg border border-white/10 shadow-2xl"
							style={{ maxWidth: "100%", display: "block" }}
						/>

						{/* Controls hint */}
						{phase === "playing" && (
							<p className="text-xs text-gray-500">
								{mode === "offline"
									? "P1: W / S  ·  P2: ↑ / ↓"
									: "↑ / W – Up    ↓ / S – Down"}
							</p>
						)}

						{/* Game-over overlay */}
						{phase === "finished" && (
							<div className="card text-center mt-2">
								<p className="text-2xl font-bold mb-1">{winnerLabel()}</p>
								{gameState && (
									<p className="msg-info mb-4">
										Final score:&nbsp;
										<strong>{gameState.score.player1}</strong>
										&nbsp;–&nbsp;
										<strong>{gameState.score.player2}</strong>
									</p>
								)}
								<div className="flex gap-3 justify-center">
									<button className="btn" onClick={playAgain}>
										Play Again
									</button>
									<button
										className="btn btn-secondary"
										onClick={() => navigate("/home")}
									>
										Home
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</>
	);
}
