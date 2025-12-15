# 🗂️ Structure du Projet - Explication

Ce document explique l'organisation du projet MapLibre avec séparation Frontend/Backend.

## 📁 Vue globale

```
maplibreglgeojson/
├── frontend (racine package.json)
│   ├── src/
│   ├── public/
│   ├── dist/                  ← Build output
│   ├── index.html
│   ├── package.json          ← Dépendances Frontend
│   ├── vite.config.ts        ← Config build Vite
│   ├── tsconfig.json         ← Config TypeScript
│   └── tailwind.config.js    ← Config Tailwind CSS
│
├── backend/                   ← Serveur Express + Prisma
│   ├── src/
│   │   ├── server.ts         ← Point d'entrée API
│   │   ├── routes/           ← Endpoints API
│   │   │   ├── configs.ts    ← GET/POST /api/configs
│   │   │   └── geojson.ts    ← GET/POST /api/geojson
│   │   ├── middleware/       ← Middlewares Express
│   │   │   └── errorHandler.ts
│   │   └── scripts/          ← Scripts BD
│   │       └── seed.ts       ← Données initiales
│   ├── dist/                 ← Compiled JavaScript
│   ├── prisma/
│   │   ├── schema.prisma     ← Schéma BD
│   │   ├── migrations/       ← Historique modifications BD
│   │   └── dev.db            ← BD locale (SQLite)
│   ├── package.json          ← Dépendances Backend
│   └── tsconfig.json         ← Config TypeScript
│
├── public/
│   ├── configs/              ← Configs JSON pour l'app
│   │   ├── Le Mans univ.json
│   │   ├── Paris.json
│   │   └── ...
│   ├── geojson/              ← Fichiers GeoJSON
│   │   ├── LeMansUniv/
│   │   └── test/
│   └── db/                   ← Scripts base de données
│
├── docs/                     ← Documentation
├── .env.example              ← Template variables
├── .env                      ← Variables (PAS sur git)
├── vercel.json              ← Config Vercel pour déploiement
├── vercel.backend.json      ← Config Backend Vercel
└── README.md                ← Vous êtes ici

```

---

## 🎯 Dossier Frontend

### `src/` - Code source React

```
src/
├── App.tsx              ← Composant racine
├── main.tsx             ← Entry point React
├── index.css            ← CSS global
├── App.css              ← Styles App
├── components/          ← Composants React
│   ├── ConfigSelector.tsx      ← Sélection config
│   ├── MapView.tsx             ← Affichage carte
│   ├── SearchBar.tsx           ← Recherche
│   ├── RoutePlanner.tsx        ← Planification trajet
│   ├── EventSelector.tsx       ← Sélection événements
│   ├── LevelSelector.tsx       ← Sélection étage
│   ├── SettingsButton.tsx      ← Paramètres
│   ├── MobileControlsBar.tsx   ← Contrôles mobile
│   ├── UserGeolocate.tsx       ← Géolocalisation
│   ├── events/                 ← Composants événements
│   ├── route-planner/          ← Composants navigation
│   ├── search/                 ← Composants recherche
│   └── settings/               ← Composants paramètres
│
├── hooks/               ← React Hooks custom
│   ├── useConfigData.ts        ← Gestion config
│   ├── useRoutePlannerState.ts ← État itinéraire
│   ├── useLocationLock.ts      ← Verrouillage position
│   └── ...
│
├── map/                 ← Logique carte MapLibre
│   ├── astar.ts         ← Algo pathfinding A*
│   ├── computeRoute.ts  ← Calcul itinéraire
│   ├── layers.ts        ← Couches carte
│   ├── interactions.ts  ← Interactions utilisateur
│   └── ...
│
├── theme/              ← Thème (couleurs, etc.)
├── types/              ← Types TypeScript
├── utils/              ← Fonctions utilitaires
└── assets/             ← Images, fonts
```

### Fichiers de config Frontend

| Fichier | Rôle |
|---------|------|
| `vite.config.ts` | Config build Vite (bundler) |
| `tsconfig.json` | Config compilateur TypeScript |
| `tailwind.config.js` | Config framework CSS |
| `eslint.config.js` | Config linter code |
| `postcss.config.js` | Config post-processeur CSS |
| `index.html` | HTML de base (un seul dans SPA) |

---

## 🔧 Dossier Backend

### `backend/src/` - Code serveur Express

```
backend/src/
├── server.ts          ← Démarre Express
├── routes/            ← Définit les endpoints
│   ├── configs.ts     ← GET /api/configs, POST /api/configs
│   └── geojson.ts     ← GET /api/geojson, POST /api/geojson
│
├── middleware/        ← Middlewares Express
│   └── errorHandler.ts ← Gestion erreurs
│
└── scripts/           ← Scripts spéciaux
    └── seed.ts        ← Insère données test
```

### `backend/prisma/` - Gestion base de données

```
backend/prisma/
├── schema.prisma         ← Définition tables & colonnes
├── migrations/           ← Historique modifications BD
│   ├── migration_lock.toml
│   └── 20250101000000_init/
│       └── migration.sql  ← SQL exécuté
└── dev.db              ← Fichier BD locale (SQLite)
```

### Fichiers de config Backend

| Fichier | Rôle |
|---------|------|
| `package.json` | Scripts npm et dépendances |
| `tsconfig.json` | Config TypeScript backend |
| `prisma/schema.prisma` | Schéma base de données |

---

## 🗃️ Base de données - Schéma

Actuellement 2 tables : **Config** et **GeoJSON**

### Table `Config`

Stocke les configurations de l'application.

```prisma
model Config {
  id        String   @id @default(cuid())  ← ID unique
  name      String   @unique               ← Ex: "Le Mans univ"
  slug      String   @unique               ← Ex: "le-mans-univ"
  data      String                         ← JSON stringified
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Exemple données** :
```json
{
  "id": "clxx123abc",
  "name": "Le Mans univ",
  "slug": "le-mans-univ",
  "data": "{\"label\": \"Le Mans University\", \"...\"}"
}
```

### Table `GeoJSON`

Stocke les données géographiques (bâtiments, routes, etc.).

```prisma
model GeoJSON {
  id        String   @id @default(cuid())
  path      String   @unique               ← Ex: "LeMansUniv/ESGT.geojson"
  name      String                         ← Ex: "ESGT"
  folder    String                         ← Ex: "LeMansUniv"
  data      String                         ← JSON stringified
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🔌 API Endpoints

### `/api/configs` - Gestion configurations

```
GET    /api/configs          ← Lister toutes les configs
POST   /api/configs          ← Créer une config
GET    /api/configs/:id      ← Récupérer une config
PUT    /api/configs/:id      ← Modifier une config
DELETE /api/configs/:id      ← Supprimer une config
```

### `/api/geojson` - Gestion fichiers GeoJSON

```
GET    /api/geojson          ← Lister tous les fichiers
POST   /api/geojson          ← Upload un fichier
GET    /api/geojson/:id      ← Récupérer un fichier
DELETE /api/geojson/:id      ← Supprimer un fichier
```

### `/health` - Health check

```
GET    /api/health           ← {"status":"ok"}
```

---

## 📦 Dépendances principales

### Frontend (`package.json`)

```json
{
  "react": "^18.2.0",              ← Framework UI
  "maplibre-gl": "^5.7.1",         ← Carte interactive
  "react-select": "^5.10.2",       ← Select dropdowns
  "react-spring": "^8.0.27",       ← Animations
  "tailwindcss": "^3.4.18"         ← Styling
}
```

### Backend (`backend/package.json`)

```json
{
  "express": "^4.18.2",            ← Framework serveur
  "@prisma/client": "^5.22.0",     ← ORM base de données
  "cors": "^2.8.5",                ← CORS middleware
  "helmet": "^7.1.0",              ← Sécurité HTTP
  "pg": "^8.11.3",                 ← Driver PostgreSQL
  "dotenv": "^16.3.1"              ← Variables .env
}
```

---

## 🌍 Variables d'environnement

### Frontend (`.env.local`)

```env
# URL API backend
VITE_API_URL=http://localhost:3001/api          # Développement
VITE_API_URL=https://api.prod.com/api           # Production
```

### Backend (`.env`)

```env
# Base de données
DATABASE_URL=file:./dev.db                      # SQLite (dev)
DATABASE_URL=postgresql://user:pwd@host/db      # PostgreSQL (prod)

# URLs
FRONTEND_URL=http://localhost:5173              # Développement
FRONTEND_URL=https://app.prod.com               # Production

# Serveur
PORT=3001
NODE_ENV=development
```

---

## 🚀 Flux de communication

### Développement local

```
http://localhost:5173 (Frontend React)
    ↓ fetch/axios
http://localhost:3001/api (Backend Express)
    ↓ Prisma
SQLite (dev.db)
```

### Production

```
https://app.vercel.app (Frontend React)
    ↓ fetch
https://api.onrender.com (Backend Express)
    ↓ Prisma
PostgreSQL (Render)
```

---

## 📝 Scripts utiles

### Frontend (racine)

```bash
npm run dev              # Démarre serveur dev Vite
npm run build           # Build production
npm run preview         # Prévisualise build
npm run lint            # Vérifie code
```

### Backend

```bash
cd backend

npm run dev             # Démarre serveur dev
npm run build           # Compile TypeScript
npm start               # Lance serveur produit

# Prisma
npm run prisma:generate         # Génère client
npm run prisma:migrate:dev      # Crée migration
npm run prisma:migrate:deploy   # Exécute migrations
npm run prisma:studio           # UI web pour BD
npm run seed                    # Insère données test
```

---

## 🔄 Comment les fichiers interagissent

### 1. L'utilisateur accède à l'app

```
index.html chargé
    ↓
main.tsx démarre React
    ↓
App.tsx rendu
```

### 2. L'app demande les configs

```
ConfigSelector.tsx
    ↓
useConfigData.ts (hook)
    ↓
fetch(VITE_API_URL + '/configs')
    ↓
Backend: backend/src/routes/configs.ts
    ↓
Prisma: SELECT * FROM configs
    ↓
SQLite/PostgreSQL
```

### 3. L'app affiche la carte

```
MapView.tsx
    ↓
map/layers.ts (ajoute couches)
    ↓
map/interactions.ts (gère clics)
    ↓
map/computeRoute.ts (calcule itinéraire)
    ↓
MapLibre GL (rendu WebGL)
```

---

## 💡 Points clés à retenir

✅ **Frontend** : React + Vite + Tailwind (interface utilisateur)

✅ **Backend** : Express + Prisma (logique métier + BD)

✅ **Communication** : API REST (HTTP JSON)

✅ **Base de données** : Prisma + PostgreSQL (production) / SQLite (dev)

✅ **Déploiement** : Vercel (frontend) + Render (backend + DB)

---

Voilà ! Vous avez maintenant une structure claire et professionnelle. 🎉
