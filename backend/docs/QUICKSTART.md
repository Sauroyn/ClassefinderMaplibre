# Backend Quick Start Guide

## Installation rapide

```bash
# 1. Installer les dépendances
cd backend
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Générer le client Prisma
npm run prisma:generate

# 4. Créer la base de données et les tables
npm run prisma:migrate:dev

# 5. Importer les données depuis public/
npm run seed

# 6. Démarrer le serveur
npm run dev
```

Le serveur démarre sur `http://localhost:3001`.

## Frontend - Configuration

Ajoutez dans le fichier `.env` du frontend :

```env
VITE_API_URL=http://localhost:3001/api
```

## Vérifier que ça fonctionne

```bash
# Tester l'API
curl http://localhost:3001/api/configs
curl http://localhost:3001/api/geojson

# Ouvrir Prisma Studio pour voir les données
npm run prisma:studio
```

## Commandes utiles

```bash
# Développement
npm run dev              # Serveur avec hot-reload

# Base de données
npm run prisma:studio    # Interface graphique
npm run seed             # Re-importer les données
npm run prisma:migrate:dev  # Créer une migration

# Production
npm run build            # Compiler TypeScript
npm start                # Démarrer en mode production
```

## Structure des URLs

- **Configs :** `GET /api/configs` et `GET /api/configs/:slug`
- **GeoJSON :** `GET /api/geojson` et `GET /api/geojson/by-path/:path`

## Documentation complète

- [README.md](./README.md) - Documentation API complète
- [MIGRATION.md](./MIGRATION.md) - Migrer SQLite → PostgreSQL
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Déployer en production
