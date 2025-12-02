# Installation et Configuration - Backend MapLibre

## 🚀 Installation complète (Backend + Frontend)

### Étape 1 : Cloner le projet

```bash
git clone <votre-repo>
cd maplibreglgeojson
```

### Étape 2 : Installer le backend

```bash
cd backend
npm install
```

### Étape 3 : Configurer l'environnement backend

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Le fichier .env contient :
# DATABASE_URL="file:./dev.db"
# PORT=3001
# NODE_ENV=development
# FRONTEND_URL=http://localhost:5173
```

### Étape 4 : Initialiser la base de données

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer la base de données et les tables
npm run prisma:migrate:dev

# Importer les données depuis public/
npm run seed
```

Vous devriez voir :
```
✅ Le Mans univ
✅ Le Mans univ multi
✅ Paris
✅ LeMansUniv/ESGT.geojson
✅ LeMansUniv/GrapheESGT.geojson
...
```

### Étape 5 : Démarrer le backend

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3001`.

**Tester** :
```bash
curl http://localhost:3001/health
# Devrait retourner : {"status":"ok","timestamp":"..."}
```

### Étape 6 : Configurer le frontend

Retour au dossier racine :

```bash
cd ..
```

Créer ou modifier `.env` à la racine :

```bash
echo "VITE_API_URL=http://localhost:3001/api" > .env
```

### Étape 7 : Installer et démarrer le frontend

```bash
npm install
npm run dev
```

Le frontend démarre sur `http://localhost:5173`.

### Étape 8 : Vérifier que tout fonctionne

1. Ouvrir `http://localhost:5173`
2. Le sélecteur de config devrait charger les configs depuis l'API
3. Sélectionner une config (ex: "Le Mans univ")
4. La carte devrait afficher les bâtiments

## 🔍 Vérification

### Backend

```bash
# Health check
curl http://localhost:3001/health

# Lister les configs
curl http://localhost:3001/api/configs

# Récupérer une config
curl http://localhost:3001/api/configs/le-mans-univ

# Lister les GeoJSON
curl http://localhost:3001/api/geojson
```

### Frontend

Ouvrir la console développeur (F12) :
- Pas d'erreurs CORS
- Les requêtes vers `http://localhost:3001/api` fonctionnent
- Les données se chargent

## 🛠️ Prisma Studio (optionnel)

Pour voir les données dans une interface graphique :

```bash
cd backend
npm run prisma:studio
```

Ouvre `http://localhost:5555`.

## 📋 Résumé des commandes

### Backend
```bash
cd backend
npm install                    # Installation
cp .env.example .env           # Configuration
npm run prisma:generate        # Générer client
npm run prisma:migrate:dev     # Créer DB
npm run seed                   # Importer données
npm run dev                    # Démarrer serveur
npm run prisma:studio          # Interface DB
```

### Frontend
```bash
# À la racine du projet
echo "VITE_API_URL=http://localhost:3001/api" > .env
npm install
npm run dev
```

## 🐛 Problèmes fréquents

### Erreur : "Cannot find module '@prisma/client'"

**Solution :**
```bash
cd backend
npm run prisma:generate
```

### Erreur : "EADDRINUSE: address already in use :::3001"

Le port 3001 est déjà utilisé.

**Solution :**
```bash
# Changer le port dans backend/.env
PORT=3002

# Puis mettre à jour le frontend
echo "VITE_API_URL=http://localhost:3002/api" > .env
```

### Erreur CORS dans le navigateur

**Solution :**
Vérifier que `FRONTEND_URL` dans `backend/.env` correspond bien à l'URL du frontend :
```env
FRONTEND_URL=http://localhost:5173
```

### Base de données vide après seed

**Solution :**
```bash
cd backend
npm run seed
npm run prisma:studio  # Vérifier visuellement
```

### Frontend charge les anciens fichiers statiques

**Solution :**
Vider le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R).

## 📦 Structure après installation

```
maplibreglgeojson/
├── backend/
│   ├── node_modules/
│   ├── dev.db              ← Base SQLite créée
│   ├── .env                ← Configuration locale
│   └── prisma/
│       └── migrations/     ← Migrations appliquées
├── node_modules/
├── .env                    ← Config frontend (VITE_API_URL)
└── public/
    ├── configs/            ← Données source (toujours utiles)
    └── geojson/            ← Données source
```

## 🎯 Prochaines étapes

- Lire [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) pour comprendre l'architecture
- Lire [backend/docs/MIGRATION.md](../backend/docs/MIGRATION.md) pour migrer vers PostgreSQL
- Lire [backend/docs/DEPLOYMENT.md](../backend/docs/DEPLOYMENT.md) pour déployer en production

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifier les logs du backend et frontend
2. Vérifier que toutes les dépendances sont installées
3. Vérifier les variables d'environnement
4. Consulter la documentation dans `backend/docs/`

## 🎉 Félicitations !

Votre environnement de développement est prêt ! Vous pouvez maintenant :
- Développer de nouvelles fonctionnalités
- Ajouter des configurations via l'API
- Importer de nouveaux fichiers GeoJSON
- Déployer en production
