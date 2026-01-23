use std::{env, io::Error, sync::Arc};

use futures_util::{SinkExt, StreamExt};
use log::{error, info};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;
use tokio::sync::oneshot;
use tokio_tungstenite::WebSocketStream;

// Define a type alias for our socket
type WsStream = WebSocketStream<TcpStream>;

// The "Waiting Room" is just an Option wrapping a single waiting player.
// We wrap it in Arc<Mutex<...>> so it can be shared across threads.
type SharedWaitingRoom = Arc<Mutex<Option<oneshot::Sender<WsStream>>>>;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let _ = env_logger::try_init();
    let addr = env::args()
        .nth(1)
        .unwrap_or_else(|| "127.0.0.1:8080".to_string());

    let try_socket = TcpListener::bind(&addr).await;
    let listener = try_socket.expect("Failed to bind");
    info!("Listening on: {}", addr);

    // Create the empty waiting room
    let waiting_room: SharedWaitingRoom = Arc::new(Mutex::new(None));

    while let Ok((stream, _)) = listener.accept().await {
        // Clone the reference to the waiting room for the new task
        let waiting_room = waiting_room.clone();
        tokio::spawn(accept_connection(stream, waiting_room));
    }

    Ok(())
}

async fn accept_connection(stream: TcpStream, waiting_room: SharedWaitingRoom) {
    let addr = stream.peer_addr().expect("addr");

    // Handshake first
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("Handshake failed: {}", e);
            return;
        }
    };
    info!("New player connected: {}", addr);

    // LOCK the waiting room to see if anyone is there
    let mut guard = waiting_room.lock().await;

    if guard.is_some() {
        info!("Found opponent! Starting match...");
        let sender = guard.take().unwrap();

        if let Err(_) = sender.send(ws_stream) {}
    } else {
        info!("No opponent found. Waiting in lobby...");
        let (tx, rx) = oneshot::channel::<WsStream>();
        *guard = Some(tx);
        drop(guard);
        wait_in_queue(ws_stream, rx, waiting_room);
    }
    // The lock is released here automatically when 'guard' goes out of scope.
}

async fn wait_in_queue(
    mut ws_stream: WsStream,
    rx: oneshot::Receiver<WsStream>,
    waiting_room: SharedWaitingRoom,
) {
    
}

async fn handle_match(player1: WsStream, player2: WsStream) {
    let (mut write1, mut read1) = player1.split();
    let (mut write2, mut read2) = player2.split();

    // Simple 1v1 forwarding
    let one_to_two = async {
        while let Some(msg) = read1.next().await {
            match msg {
                Ok(m) => {
                    if write2.send(m).await.is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    };

    let two_to_one = async {
        while let Some(msg) = read2.next().await {
            match msg {
                Ok(m) => {
                    if write1.send(m).await.is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    };

    tokio::select! {
        _ = one_to_two => info!("Game Over"),
        _ = two_to_one => info!("Game Over"),
    }
}
