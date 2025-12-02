# Backend API Documentation

## Vue d'ensemble

Le backend MapLibre utilise Node.js, Express, Prisma ORM et supporte SQLite (développement) et PostgreSQL (production).

## Architecture

```
backend/
├── src/
│   ├── server.ts              # Point d'entrée Express
│   ├── middleware/
│   │   └── errorHandler.ts    # Gestion des erreurs
│   ├── routes/
│   │   ├── configs.ts         # Routes pour les configurations
│   │   └── geojson.ts         # Routes pour les fichiers GeoJSON
│   └── scripts/
│       ├── seed.ts            # Import des données depuis public/
│       └── migrate-sqlite-to-pg.ts  # Migration SQLite → PostgreSQL
├── prisma/
│   └── schema.prisma          # Schéma de la base de données
└── package.json
```

## Installation

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configurer les variables d'environnement

Copiez `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Modifiez `.env` selon vos besoins :

```env
# Pour SQLite (développement)
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Pour PostgreSQL (production) - commenté par défaut
# DATABASE_URL="postgresql://user:password@localhost:5432/maplibre?schema=public"
```

### 3. Générer le client Prisma

```bash
npm run prisma:generate
```

### 4. Créer la base de données et les tables

```bash
npm run prisma:migrate:dev
```

Cette commande va :
- Créer le fichier `dev.db` (SQLite)
- Appliquer le schéma Prisma
- Générer les migrations dans `prisma/migrations/`

## Schéma de la base de données

### Table `configs`

Stocke les fichiers de configuration JSON.

| Colonne    | Type     | Description                          |
|------------|----------|--------------------------------------|
| id         | String   | Identifiant unique (CUID)            |
| name       | String   | Nom affiché (ex: "Le Mans univ")    |
| slug       | String   | Identifiant URL (ex: "le-mans-univ") |
| data       | String   | JSON stringifié de la config         |
| createdAt  | DateTime | Date de création                     |
| updatedAt  | DateTime | Date de modification                 |

### Table `geojson`

Stocke les fichiers GeoJSON.

| Colonne    | Type     | Description                               |
|------------|----------|-------------------------------------------|
| id         | String   | Identifiant unique (CUID)                 |
| path       | String   | Chemin complet (ex: "LeMansUniv/ESGT.geojson") |
| name       | String   | Nom du fichier (ex: "ESGT")               |
| folder     | String   | Dossier parent (ex: "LeMansUniv")         |
| data       | String   | GeoJSON stringifié                        |
| createdAt  | DateTime | Date de création                          |
| updatedAt  | DateTime | Date de modification                      |

## Import des données initiales (Seed)

Le script de seed importe automatiquement les fichiers depuis `public/configs/` et `public/geojson/`.

```bash
npm run seed
```

Ce script va :
1. Lire tous les fichiers `.json` dans `public/configs/`
2. Lire tous les fichiers `.geojson` dans `public/geojson/` (récursivement)
3. Les insérer dans la base de données
4. Afficher un résumé des données importées

**Note:** Le script utilise `upsert`, donc vous pouvez le réexécuter sans créer de doublons.

## API REST

### Endpoints Configs

#### `GET /api/configs`
Liste toutes les configurations.

**Réponse :**
```json
[
  {
    "id": "abc123",
    "name": "Le Mans univ",
    "slug": "le-mans-univ",
    "createdAt": "2025-12-02T10:00:00Z",
    "updatedAt": "2025-12-02T10:00:00Z"
  }
]
```

#### `GET /api/configs/:slug`
Récupère une configuration spécifique avec ses données.

**Réponse :**
```json
{
  "id": "abc123",
  "name": "Le Mans univ",
  "slug": "le-mans-univ",
  "data": { /* config JSON object */ },
  "createdAt": "2025-12-02T10:00:00Z",
  "updatedAt": "2025-12-02T10:00:00Z"
}
```

#### `POST /api/configs`
Crée une nouvelle configuration.

**Body :**
```json
{
  "name": "Paris",
  "slug": "paris",
  "data": { /* config object */ }
}
```

#### `PUT /api/configs/:slug`
Met à jour une configuration.

**Body :**
```json
{
  "name": "Paris Updated",
  "data": { /* new config */ }
}
```

#### `DELETE /api/configs/:slug`
Supprime une configuration.

---

### Endpoints GeoJSON

#### `GET /api/geojson`
Liste tous les fichiers GeoJSON.

**Query params :**
- `folder` (optional) : Filtrer par dossier

**Réponse :**
```json
[
  {
    "id": "xyz789",
    "path": "LeMansUniv/ESGT.geojson",
    "name": "ESGT",
    "folder": "LeMansUniv",
    "createdAt": "2025-12-02T10:00:00Z",
    "updatedAt": "2025-12-02T10:00:00Z"
  }
]
```

#### `GET /api/geojson/:id`
Récupère un GeoJSON par ID.

#### `GET /api/geojson/by-path/:path`
Récupère un GeoJSON par chemin.

**Exemple :**
```
GET /api/geojson/by-path/LeMansUniv/ESGT.geojson
```

**Réponse :**
```json
{
  "id": "xyz789",
  "path": "LeMansUniv/ESGT.geojson",
  "name": "ESGT",
  "folder": "LeMansUniv",
  "data": { "type": "FeatureCollection", "features": [...] },
  "createdAt": "2025-12-02T10:00:00Z",
  "updatedAt": "2025-12-02T10:00:00Z"
}
```

#### `POST /api/geojson`
Crée un nouveau fichier GeoJSON.

#### `PUT /api/geojson/:id`
Met à jour un fichier GeoJSON.

#### `DELETE /api/geojson/:id`
Supprime un fichier GeoJSON.

## Démarrage

### Mode développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3001` avec hot-reload (tsx watch).

### Mode production

```bash
# Build
npm run build

# Start
npm start
```

## Prisma Studio

Pour visualiser et éditer la base de données graphiquement :

```bash
npm run prisma:studio
```

Ouvre l'interface à `http://localhost:5555`.

## Tests de l'API

### Avec curl

```bash
# Lister les configs
curl http://localhost:3001/api/configs

# Récupérer une config
curl http://localhost:3001/api/configs/le-mans-univ

# Créer une config
curl -X POST http://localhost:3001/api/configs \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","slug":"test","data":{}}'
```

### Avec VS Code REST Client

Créez un fichier `test.http` :

```http
### Get all configs
GET http://localhost:3001/api/configs

### Get specific config
GET http://localhost:3001/api/configs/le-mans-univ

### Get GeoJSON by path
GET http://localhost:3001/api/geojson/by-path/LeMansUniv/ESGT.geojson
```

## Prochaines étapes

Voir :
- [MIGRATION.md](./MIGRATION.md) pour migrer vers PostgreSQL
- [DEPLOYMENT.md](./DEPLOYMENT.md) pour déployer en production
