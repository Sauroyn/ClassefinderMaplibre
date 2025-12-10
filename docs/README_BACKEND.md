# MapLibre GeoJSON - Full Stack Application

Application de visualisation cartographique interactive avec backend Node.js et base de données.

## 🚀 Nouvelle Architecture

Le projet a été migré vers une architecture full-stack :

- **Frontend** : React + Vite + MapLibre GL
- **Backend** : Node.js + Express + Prisma ORM
- **Database** : SQLite (dev) / PostgreSQL (prod)

## 📁 Structure du projet

```
maplibreglgeojson/
├── backend/                    # API Node.js
│   ├── src/
│   │   ├── routes/            # Routes API (configs, geojson)
│   │   ├── scripts/           # Scripts de migration
│   │   └── server.ts          # Serveur Express
│   ├── prisma/                # ORM et migrations
│   └── docs/                  # Documentation backend
├── src/                       # Frontend React
│   ├── components/
│   ├── hooks/
│   ├── map/
│   └── utils/
│       └── api.ts            # Client API
├── public/
│   ├── configs/              # Configurations (source)
│   └── geojson/              # Fichiers GeoJSON (source)
└── docs/                     # Documentation projet
```

## 🎯 Démarrage rapide

### Installation complète

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
npm run dev

# 2. Frontend (dans un autre terminal)
cd ..
echo "VITE_API_URL=http://localhost:3001/api" > .env
npm install
npm run dev
```

- Backend : `http://localhost:3001`
- Frontend : `http://localhost:5173`

## 📚 Documentation

### Guides principaux

- **[INSTALLATION.md](./docs/INSTALLATION.md)** - Guide d'installation complet
- **[BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)** - Architecture et fonctionnement du backend

### Documentation backend

- **[Quick Start](./backend/docs/QUICKSTART.md)** - Démarrage rapide backend
- **[README](./backend/docs/README.md)** - Documentation API
- **[MIGRATION](./backend/docs/MIGRATION.md)** - Migration SQLite → PostgreSQL
- **[DEPLOYMENT](./backend/docs/DEPLOYMENT.md)** - Déploiement en production

## 🔌 API REST

### Endpoints disponibles

**Configs :**
- `GET /api/configs` - Liste des configurations
- `GET /api/configs/:slug` - Configuration spécifique

**GeoJSON :**
- `GET /api/geojson` - Liste des fichiers GeoJSON
- `GET /api/geojson/by-path/:path` - Fichier par chemin

Voir [backend/docs/README.md](./backend/docs/README.md) pour l'API complète.

## 🛠️ Scripts disponibles

### Backend

```bash
cd backend
npm run dev              # Serveur développement
npm run build            # Build production
npm start                # Démarrer en production
npm run seed             # Importer données depuis public/
npm run prisma:studio    # Interface DB graphique
```

### Frontend

```bash
npm run dev              # Serveur développement
npm run build            # Build production
npm run preview          # Preview build
```

## 🗄️ Base de données

### Développement (SQLite)

La base de données `dev.db` est créée automatiquement dans `backend/`.

### Production (PostgreSQL)

Voir [backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md) pour migrer vers PostgreSQL.

## 🌐 Déploiement

### Options recommandées

1. **Railway** - PostgreSQL + Node.js en un clic
2. **Vercel** - Frontend + Backend Serverless
3. **VPS** - Contrôle total avec PM2 + Nginx

Voir [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md) pour les guides détaillés.

## 🔧 Configuration

### Variables d'environnement

**Backend** (`backend/.env`) :
```env
DATABASE_URL=file:./dev.db
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`.env` à la racine) :
```env
VITE_API_URL=http://localhost:3001/api
```

## 📦 Technologies

### Frontend
- React 18
- TypeScript
- Vite
- MapLibre GL
- Tailwind CSS

### Backend
- Node.js 20+
- Express.js
- Prisma ORM
- TypeScript
- Zod (validation)

### Base de données
- SQLite (développement)
- PostgreSQL (production)

## 🔒 Sécurité

- CORS configuré
- Helmet.js pour les headers HTTP
- Validation des données avec Zod
- Variables d'environnement sécurisées

## 🐛 Troubleshooting

### Backend ne démarre pas

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run prisma:generate
```

### Frontend ne se connecte pas à l'API

1. Vérifier que le backend tourne : `curl http://localhost:3001/health`
2. Vérifier `VITE_API_URL` dans `.env`
3. Vider le cache du navigateur

### Base de données vide

```bash
cd backend
npm run seed
```

## 📊 Prisma Studio

Interface graphique pour explorer la base de données :

```bash
cd backend
npm run prisma:studio
```

Ouvre `http://localhost:5555`.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

## 📄 License

MIT

## 🎉 Ancienne documentation

L'ancienne documentation (avant la migration backend) est disponible dans :
- `docs/CONFIG_GUIDE.md`
- `docs/LABELS_ARCHITECTURE.md`
- `docs/ROUTE_PLANNER_STRUCTURE.md`
- etc.

Ces documents restent pertinents pour comprendre le fonctionnement du frontend.
