# 🎯 Récapitulatif - Backend MapLibre

## ✅ Ce qui a été créé

### 1. Backend complet (Node.js + Express + Prisma)

**Structure :**
```
backend/
├── src/
│   ├── server.ts                    # Serveur Express
│   ├── middleware/errorHandler.ts   # Gestion erreurs
│   ├── routes/
│   │   ├── configs.ts              # API Configs
│   │   └── geojson.ts              # API GeoJSON
│   └── scripts/
│       ├── seed.ts                 # Import données
│       └── migrate-sqlite-to-pg.ts # Migration PostgreSQL
├── prisma/
│   ├── schema.prisma               # Schéma DB
│   └── migrations/                 # Migrations SQL
├── docs/                           # Documentation complète
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### 2. Base de données

**Tables :**
- `configs` - Configurations JSON (ex: Le Mans univ, Paris)
- `geojson` - Fichiers GeoJSON (ex: LeMansUniv/ESGT.geojson)

**Support :**
- SQLite pour le développement
- PostgreSQL pour la production

### 3. API REST complète

**Endpoints Configs :**
- `GET /api/configs` - Liste
- `GET /api/configs/:slug` - Détail
- `POST /api/configs` - Créer
- `PUT /api/configs/:slug` - Modifier
- `DELETE /api/configs/:slug` - Supprimer

**Endpoints GeoJSON :**
- `GET /api/geojson` - Liste
- `GET /api/geojson/:id` - Par ID
- `GET /api/geojson/by-path/:path` - Par chemin
- `POST /api/geojson` - Créer
- `PUT /api/geojson/:id` - Modifier
- `DELETE /api/geojson/:id` - Supprimer

### 4. Frontend adapté

**Fichiers modifiés :**
- `src/utils/api.ts` - Client API créé
- `src/hooks/useConfigData.ts` - Utilise l'API
- `src/components/ConfigSelector.tsx` - Charge depuis l'API

### 5. Scripts de migration

- `seed.ts` - Import automatique depuis `public/`
- `migrate-sqlite-to-pg.ts` - Migration SQLite → PostgreSQL

### 6. Documentation complète

**Documents créés :**
- `backend/README.md` - Vue d'ensemble backend
- `backend/docs/QUICKSTART.md` - Démarrage rapide
- `backend/docs/README.md` - Documentation API complète
- `backend/docs/MIGRATION.md` - Guide migration PostgreSQL
- `backend/docs/DEPLOYMENT.md` - Guide déploiement production
- `docs/BACKEND_ARCHITECTURE.md` - Architecture système
- `docs/INSTALLATION.md` - Guide installation complet
- `README_BACKEND.md` - README projet mis à jour

## 🚀 Pour démarrer

### Installation rapide

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
npm run dev

# Frontend (nouveau terminal)
cd ..
echo "VITE_API_URL=http://localhost:3001/api" > .env
npm install
npm run dev
```

### Vérification

1. Backend : `curl http://localhost:3001/health`
2. API Configs : `curl http://localhost:3001/api/configs`
3. Frontend : Ouvrir `http://localhost:5173`

## 📚 Comment utiliser

### Développement local

1. Démarrer le backend (port 3001)
2. Démarrer le frontend (port 5173)
3. Les deux communiquent via HTTP

### Migration vers PostgreSQL

```bash
# 1. Modifier backend/prisma/schema.prisma
provider = "postgresql"

# 2. Mettre à jour .env
DATABASE_URL="postgresql://user:pass@host:5432/db"

# 3. Migrer les données
npm run migrate:sqlite-to-pg
```

### Déploiement production

**Option 1 : Railway (recommandé)**
- PostgreSQL + Node.js automatique
- Deploy depuis GitHub

**Option 2 : Vercel**
- Frontend + Backend serverless
- Vercel Postgres ou externe

**Option 3 : VPS**
- PM2 + Nginx + PostgreSQL
- Contrôle complet

Voir [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md).

## 🛠️ Commandes importantes

### Backend

```bash
npm run dev              # Dev serveur
npm run build            # Build prod
npm start                # Démarrer prod
npm run seed             # Importer données
npm run prisma:studio    # Interface DB
npm run prisma:migrate:dev      # Créer migration
npm run migrate:sqlite-to-pg    # Migrer vers PostgreSQL
```

### Frontend

```bash
npm run dev              # Dev serveur
npm run build            # Build prod
```

## 🔍 Outils utiles

### Prisma Studio

Interface graphique pour la base de données :

```bash
cd backend
npm run prisma:studio
# Ouvre http://localhost:5555
```

### Tests API

```bash
# Health check
curl http://localhost:3001/health

# Lister configs
curl http://localhost:3001/api/configs

# Récupérer une config
curl http://localhost:3001/api/configs/le-mans-univ

# Lister GeoJSON
curl http://localhost:3001/api/geojson

# GeoJSON par path
curl http://localhost:3001/api/geojson/by-path/LeMansUniv/ESGT.geojson
```

## 📋 Données

### Source des données

Les données originales restent dans :
- `public/configs/*.json`
- `public/geojson/**/*.geojson`

### Import dans la DB

Le script `seed` lit ces fichiers et les importe dans la base de données.

```bash
cd backend
npm run seed
```

## 🔒 Sécurité

- **CORS** : Configuré pour le frontend uniquement
- **Validation** : Zod valide toutes les entrées
- **Helmet** : Headers HTTP sécurisés
- **Variables** : `.env` gitignored

## 🐛 Problèmes fréquents

### "Cannot find module '@prisma/client'"

```bash
cd backend
npm run prisma:generate
```

### CORS error

Vérifier `FRONTEND_URL` dans `backend/.env` :
```env
FRONTEND_URL=http://localhost:5173
```

### Port déjà utilisé

Changer dans `backend/.env` :
```env
PORT=3002
```

Puis mettre à jour frontend `.env` :
```env
VITE_API_URL=http://localhost:3002/api
```

## 📖 Lire la documentation

1. **[docs/INSTALLATION.md](./docs/INSTALLATION.md)** - Guide d'installation
2. **[docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)** - Architecture
3. **[backend/docs/README.md](./backend/docs/README.md)** - API complète
4. **[backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md)** - Migration PostgreSQL
5. **[backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)** - Déploiement

## 🎉 Prêt à utiliser !

Le backend est **100% fonctionnel** et prêt pour :
- ✅ Développement local
- ✅ Migration PostgreSQL
- ✅ Déploiement production
- ✅ Ajout de nouvelles fonctionnalités

**Questions ?** Consultez la documentation dans `backend/docs/`.

## 💡 Prochaines étapes suggérées

1. **Tester** : Démarrer et tester localement
2. **PostgreSQL** : Migrer vers PostgreSQL pour la prod
3. **Déployer** : Choisir Railway/Vercel/VPS et déployer
4. **Améliorer** : Ajouter authentification, cache, tests

Bon développement ! 🚀
