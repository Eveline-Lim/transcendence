## Concept de "Game Room"

### Flow de connection:

1.	Joueur 1 se connecte → création d'une room (stockée dans Redis avec statut "waiting")
2.	Joueur 2 se connecte → rejoint la room existante
3.	Quand room complète (2 joueurs) → la partie démarre
4.	Le serveur lance la game loop pour cette room spécifique

#### Reception sous le format:

*	player1_id : id du joueur a gauche
*	player2_id : id du joueur a droite

```js
	app.post('/matchmaking', async (req, res) => {
		// manage ERROR
		// stockage data
		const { player1_id, player2_id } = req.body;
		// create new game && send to Redis
		// renvoyer dans res l'id game
	})
```

*	Renvoie **ID game**

### Synchronisation du jeu:

#### Serveur autoritaire
**Pourquoi?** Pour que le serveur detienne la verite et bloque la triche

*	Le serveur possède la source de vérité : position de la balle, scores, positions des paddles
*	Les clients envoient seulement leurs inputs (touche haut/bas pressée)
*	Le serveur calcule tout (physique de la balle, collisions, scores)
*	Le serveur broadcast l'état du jeu à intervalle régulier (60 fois/sec par exemple)
*	Chaque client reçoit l'état et affiche

### Role de Redis

```js
// Stockage des rooms actives
rooms:{roomId} → {player1_id, player2_id, status, score}

// Pub/Sub si tu as plusieurs serveurs
channel:game:{roomId} → pour synchroniser les instances
```

Redis permet la persistance des donnees en cas de crash server

#### Gestion des deconnexions:
*	Mettre la partie en pause pendant X secondes
*	Si reconnexion -> reprendre
*	Sinon -> forfait