import Redis from 'ioredis';
import { GameState } from '../models/GameState';

export class RedisService {
  private client: Redis;

  constructor() {
    // Connexion à Redis sur le port 6380
    this.client = new Redis({
      host: 'localhost',
      port: 6380,
    });

    // Gestion des événements
    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  // Sauvegarder une donnée
  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  // Récupérer une donnée
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  // ===== Méthodes pour GameState =====
  async setGameState(gameId: string, state: GameState): Promise<void> {
    await this.client.setex(//set expiration
      `game:${gameId}`,
      3600, // TTL = 1 heure (la partie expire après 1h)
      JSON.stringify(state)
    );
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    const data = await this.client.get(`game:${gameId}`);
    return data ? JSON.parse(data) : null;
  }

  // Supprimer une donnée
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
