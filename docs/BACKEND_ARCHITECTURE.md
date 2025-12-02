# Backend Architecture - MapLibre GeoJSON

Ce document explique l'architecture backend du projet MapLibre, sa migration vers une base de données et comment l'utiliser.

## 📋 Vue d'ensemble

Le projet a été migré d'une architecture statique (fichiers JSON/GeoJSON dans `public/`) vers une architecture client-serveur avec :

- **Backend** : API REST Node.js + Express + Prisma ORM
- **Base de données** : SQLite (développement) et PostgreSQL (production)
- **Frontend** : Consomme l'API au lieu de charger des fichiers statiques

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Vite/React)  │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│   Backend API   │
│   (Express.js)  │
└────────┬────────┘
         │ Prisma ORM
         ↓
┌─────────────────┐
│   Database      │
│ SQLite/PostgreSQL│
└─────────────────┘
```

## 📁 Structure des fichiers

```
backend/
├── src/
│   ├── server.ts              # Point d'entrée Express
│   ├── middleware/
│   │   └── errorHandler.ts    # Gestion globale des erreurs
│   ├── routes/
│   │   ├── configs.ts         # CRUD pour les configurations
│   │   └── geojson.ts         # CRUD pour les fichiers GeoJSON
│   └── scripts/
│       ├── seed.ts            # Import initial depuis public/
│       └── migrate-sqlite-to-pg.ts  # Migration SQLite → PostgreSQL
├── prisma/
│   ├── schema.prisma          # Définition du schéma de données
│   └── migrations/            # Historique des migrations
├── docs/                      # Documentation détaillée
├── .env                       # Configuration locale (gitignored)
├── .env.example               # Template de configuration
├── package.json
└── tsconfig.json

src/utils/
├── api.ts                     # Client API pour le frontend
```

## 🗄️ Schéma de base de données

### Table `configs`

Stocke les configurations de l'application (anciennement dans `public/configs/*.json`).

```prisma
model Config {
  id          String   @id @default(cuid())
  name        String   @unique          // "Le Mans univ"
  slug        String   @unique          // "le-mans-univ"
  data        String                    // JSON stringifié
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Table `geojson`

Stocke les fichiers GeoJSON des bâtiments (anciennement dans `public/geojson/`).

```prisma
model GeoJSON {
  id          String   @id @default(cuid())
  path        String   @unique          // "LeMansUniv/ESGT.geojson"
  name        String                    // "ESGT"
  folder      String                    // "LeMansUniv"
  data        String                    // GeoJSON stringifié
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 🔌 API REST

### Configs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/configs` | Liste toutes les configurations |
| GET | `/api/configs/:slug` | Récupère une config par slug |
| POST | `/api/configs` | Crée une nouvelle config |
| PUT | `/api/configs/:slug` | Modifie une config |
| DELETE | `/api/configs/:slug` | Supprime une config |

### GeoJSON

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/geojson` | Liste tous les fichiers |
| GET | `/api/geojson?folder=X` | Filtre par dossier |
| GET | `/api/geojson/:id` | Récupère par ID |
| GET | `/api/geojson/by-path/:path` | Récupère par chemin |
| POST | `/api/geojson` | Crée un nouveau fichier |
| PUT | `/api/geojson/:id` | Modifie un fichier |
| DELETE | `/api/geojson/:id` | Supprime un fichier |

## 🚀 Démarrage

### Prérequis

- Node.js 18+
- npm ou yarn

### Installation

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env

# 4. Générer le client Prisma
npm run prisma:generate

# 5. Créer la base de données
npm run prisma:migrate:dev

# 6. Importer les données depuis public/
npm run seed

# 7. Démarrer le serveur
npm run dev
```

Le backend démarre sur `http://localhost:3001`.

### Configuration du frontend

Ajoutez la variable d'environnement dans le fichier `.env` du frontend :

```env
VITE_API_URL=http://localhost:3001/api
```

## 📦 Migration des données

### Import initial (public/ → DB)

Le script `seed.ts` importe automatiquement :
- Tous les `.json` de `public/configs/` → table `configs`
- Tous les `.geojson` de `public/geojson/` → table `geojson`

```bash
npm run seed
```

### Migration SQLite → PostgreSQL

Pour passer en production avec PostgreSQL :

1. **Modifier `prisma/schema.prisma`** :
   ```prisma
   datasource db {
     provider = "postgresql"  // au lieu de "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. **Configurer l'URL PostgreSQL dans `.env`** :
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/maplibre"
   ```

3. **Exécuter le script de migration** :
   ```bash
   npm run migrate:sqlite-to-pg
   ```

Voir [backend/docs/MIGRATION.md](../backend/docs/MIGRATION.md) pour plus de détails.

## 🔧 Modification du frontend

### Avant (fichiers statiques)

```typescript
// Charger depuis public/configs/le-mans-univ.json
const response = await fetch('/configs/le-mans-univ.json');
const config = await response.json();
```

### Après (API)

```typescript
import { configsAPI } from '../utils/api';

// Charger depuis l'API
const config = await configsAPI.get('le-mans-univ');
console.log(config.data); // Le JSON de configuration
```

### Hook `useConfigData`

Le hook a été modifié pour utiliser l'API :

```typescript
// Avant
const resp = await fetch(base + 'configs/' + selectedConfig);

// Après
const configData = await configsAPI.get(selectedConfig);
parsedConfig = configData.data;
```

## 🌐 Déploiement

### Option 1 : Railway (Recommandé)

1. Créer un compte sur [Railway](https://railway.app/)
2. Créer un projet avec PostgreSQL
3. Connecter le repo GitHub
4. Configurer les variables d'environnement
5. Railway déploie automatiquement

### Option 2 : Vercel

1. Backend et frontend séparés
2. Backend : Vercel Serverless Functions
3. Database : Vercel Postgres ou externe

### Option 3 : VPS

1. Ubuntu/Debian avec PostgreSQL
2. PM2 pour le process manager
3. Nginx en reverse proxy
4. Certificat SSL avec Let's Encrypt

Voir [backend/docs/DEPLOYMENT.md](../backend/docs/DEPLOYMENT.md) pour les guides détaillés.

## 🛠️ Outils de développement

### Prisma Studio

Interface graphique pour explorer la base de données :

```bash
cd backend
npm run prisma:studio
```

Ouvre `http://localhost:5555`.

### Logs

```bash
# Mode développement
npm run dev

# Les logs s'affichent en temps réel
```

## 📚 Documentation complète

- **[Quick Start](../backend/docs/QUICKSTART.md)** - Installation rapide
- **[README](../backend/docs/README.md)** - Documentation API complète
- **[MIGRATION](../backend/docs/MIGRATION.md)** - Migration SQLite → PostgreSQL
- **[DEPLOYMENT](../backend/docs/DEPLOYMENT.md)** - Déploiement en production

## 🔒 Sécurité

- **CORS** : Configuré pour accepter uniquement le frontend défini dans `FRONTEND_URL`
- **Helmet.js** : Headers HTTP sécurisés
- **Validation** : Zod valide toutes les entrées
- **Variables sensibles** : `.env` est ignoré par Git

## 🚨 Troubleshooting

### Le frontend ne se connecte pas au backend

1. Vérifier que le backend tourne : `http://localhost:3001/health`
2. Vérifier `VITE_API_URL` dans le `.env` du frontend
3. Vérifier CORS dans le backend

### Erreur de connexion à la base

```bash
# Vérifier que le fichier existe
ls backend/dev.db

# Régénérer la DB
cd backend
npm run prisma:migrate:dev
npm run seed
```

### Données manquantes après seed

```bash
# Réimporter
cd backend
npm run seed
```

## 🎯 Roadmap

- [ ] Authentification (JWT)
- [ ] Upload de fichiers GeoJSON via l'API
- [ ] Versioning des configurations
- [ ] Cache Redis pour les performances
- [ ] Tests automatisés (Jest)
- [ ] CI/CD avec GitHub Actions

## 📄 License

MIT
