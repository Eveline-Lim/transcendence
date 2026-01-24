# Étape 1 : Setup du Game Service

## Objectif
Installer les dépendances nécessaires pour créer un serveur backend en TypeScript.

---

## Installation des dépendances

### 1. Initialiser npm
```bash
npm init -y
```
**Pourquoi ?** Crée `package.json` (config du projet + liste des dépendances)

### 2. Dépendances de production
```bash
npm install express
```

| Package | Rôle |
|---------|------|
| `express` | Framework pour créer un serveur HTTP simplement |

**Pourquoi Express ?** Simplifie la gestion des routes, requêtes HTTP et réponses JSON.

### 3. Dépendances de développement
```bash
npm install --save-dev typescript @types/node @types/express ts-node nodemon
```

| Package | Rôle |
|---------|------|
| `typescript` | Compilateur TypeScript (.ts → .js) |
| `@types/node` | Définitions de types pour Node.js (autocomplétion) |
| `@types/express` | Définitions de types pour Express (autocomplétion) |
| `ts-node` | Exécute TypeScript directement sans compilation manuelle |
| `nodemon` | Redémarre automatiquement le serveur à chaque modification |

**Pourquoi TypeScript ?** Détecte les erreurs avant l'exécution grâce au typage.

---

## Configuration TypeScript

Créer `tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

**Pourquoi ?** Définit comment TypeScript compile le code.

---

## Créer la structure du code
```bash
mkdir src
touch src/index.ts
```

---

## Structure finale
```
game-service/
├── node_modules/        # Dépendances installées
├── src/
│   └── index.ts        # Point d'entrée du serveur
├── package.json        # Config npm + dépendances
├── package-lock.json   # Versions exactes des dépendances
└── tsconfig.json       # Config TypeScript
```

---

## Concepts clés

### Dependencies vs DevDependencies
- **dependencies** : Nécessaires en production (ex: `express`)
- **devDependencies** : Nécessaires uniquement en développement (ex: `typescript`, `nodemon`)

### Workflow
1. Tu codes en TypeScript (`.ts`)
2. `ts-node` compile et exécute
3. `nodemon` détecte les changements et redémarre
4. En production : compilation finale vers JavaScript

---

## Prochaine étape
Écrire le premier serveur dans `src/index.ts`

# Étape 2 : Connexion à Redis

## Objectif
Connecter le serveur à Redis pour stocker/récupérer des données en mémoire.

## Lancer Redis
```bash
docker run --name game-redis -p 6380:6379 -d redis:7-alpine
docker ps  # Vérifier que Redis tourne
```

## Installation
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

## Structure créée
```
game-service/
├── src/
│   ├── services/
│   │   └── RedisService.ts    # Service Redis
│   └── index.ts               # Serveur avec routes de test
```

## Tests
```bash
# Sauvegarder
curl -X POST http://localhost:3001/test/save \
  -H "Content-Type: application/json" \
  -d '{"key": "player1", "value": "Alice"}'

# Lire
curl http://localhost:3001/test/get/player1
```

## Résultat
Serveur Node.js connecté à Redis, capable de sauvegarder et lire des données.