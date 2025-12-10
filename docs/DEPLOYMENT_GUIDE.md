# 📚 Guide Complet de Déploiement et Build

Ce guide vous explique en détail comment **construire (build)**, **déployer** et **gérer** votre application MapLibre avec base de données.

## 📋 Table des matières

1. [Architecture du Projet](#architecture-du-projet)
2. [Prérequis](#prérequis)
3. [Installation Locale](#installation-locale)
4. [Build de l'Application](#build-de-lapplication)
5. [Déploiement Frontend (Vercel)](#déploiement-frontend-vercel)
6. [Déploiement Backend (Render)](#déploiement-backend-render)
7. [Gestion de la Base de Données](#gestion-de-la-base-de-données)
8. [Débogage et Dépannage](#débogage-et-dépannage)

---

## 🏗️ Architecture du Projet

```
maplibreglgeojson/
├── frontend (package.json racine)
│   ├── src/                  # Code React/TypeScript
│   ├── public/               # Assets et configs
│   ├── index.html
│   └── vite.config.ts
│
├── backend/                  # Express + Prisma
│   ├── src/
│   │   ├── server.ts        # Point d'entrée
│   │   ├── routes/          # Endpoints API
│   │   ├── middleware/      # Middlewares Express
│   │   └── scripts/         # Scripts Prisma
│   ├── prisma/
│   │   └── schema.prisma    # Schéma base de données
│   └── package.json
│
└── docs/                    # Documentation
```

### 🔄 Communication Frontend ↔ Backend

```
Frontend (Vercel)
    ↓ (HTTP Requests)
Backend API (Render)
    ↓ (SQL Queries)
PostgreSQL Database (Render)
```

---

## 📦 Prérequis

### Pour le développement local :
- **Node.js** >= 18.x
- **npm** ou **yarn**
- **Git**
- **PostgreSQL** (optionnel : SQLite pour dev)

### Pour le déploiement :
- Compte **Vercel** (Frontend)
- Compte **Render** (Backend + Database)
- Compte **GitHub** (pour les repos)

---

## 🚀 Installation Locale

### 1. Cloner le projet

```bash
git clone <votre-repo-git>
cd maplibreglgeojson
```

### 2. Installer les dépendances Frontend

```bash
npm install
```

### 3. Installer les dépendances Backend

```bash
cd backend
npm install
cd ..
```

### 4. Configurer les variables d'environnement

**À la racine (`frontend/.env.local`)** :
```env
VITE_API_URL=http://localhost:3001/api
```

**Pour le backend (`backend/.env`)** :
```env
# Base de données (développement avec SQLite)
DATABASE_URL="file:./dev.db"

# Ou PostgreSQL pour la production
# DATABASE_URL="postgresql://user:password@localhost:5432/maplibre_db"

# URLs
FRONTEND_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

---

## 🛠️ Build de l'Application

### Important : Premier build avec la base de données 🚨

Puisque c'est votre **premier projet avec une base de données**, voici les étapes à suivre :

### Étape 1 : Générer le client Prisma

```bash
cd backend
npm run prisma:generate
```

**Qu'est-ce que ça fait ?**
- Crée le client Prisma (`@prisma/client`) utilisé pour communiquer avec la BD
- Génère les types TypeScript automatiquement

### Étape 2 : Créer/Mettre à jour la base de données

**Option A : Développement avec SQLite (FACILE)**

```bash
cd backend
npm run prisma:migrate:dev
# Donnez un nom à la migration (ex: "init")
```

**Qu'est-ce que ça fait ?**
- Crée le fichier `backend/prisma/dev.db` (local)
- Exécute les migrations pour créer les tables
- Génère le client Prisma

**Option B : Production avec PostgreSQL (voir section Render)**

### Étape 3 : Alimenter la base (optionnel)

```bash
cd backend
npm run seed
```

**Qu'est-ce que ça fait ?**
- Exécute le script `backend/src/scripts/seed.ts`
- Insère les données de test dans la BD

### Étape 4 : Build du Frontend

```bash
npm run build
```

**Qu'est-ce que ça fait ?**
- Compile TypeScript (`tsc -b`)
- Bundle le code avec Vite
- Génère les fichiers optimisés dans `dist/`

### Étape 5 : Build du Backend (optionnel en dev)

```bash
cd backend
npm run build
```

**Qu'est-ce que ça fait ?**
- Compile TypeScript → JavaScript
- Génère les fichiers dans `backend/dist/`

### Résumé commandes BUILD pour développement local

```bash
# 1. Première fois SEULEMENT
npm install && cd backend && npm install && npm run prisma:generate && npm run prisma:migrate:dev && cd ..

# 2. Ensuite, pour relancer le dev
npm run dev                # Frontend sur http://localhost:5173
# Dans un autre terminal:
cd backend && npm run dev  # Backend sur http://localhost:3001
```

---

## 🌐 Déploiement Frontend (Vercel)

### Prérequis

- Code pushé sur GitHub dans une branche
- Compte Vercel connecté à votre GitHub

### Méthode 1 : Dashboard Vercel (Recommandé pour débutants)

1. **Allez sur** : https://vercel.com/dashboard
2. **Cliquez** sur "Add New..." → "Project"
3. **Sélectionnez** votre repo GitHub
4. **Configurez le projet** :
   - Framework: **Next.js** (laissez, Vite est compatible)
   - Root directory: **laissez vide** (racine du projet)
   - Build command: `npm run build`
   - Output directory: `dist`

5. **Variables d'environnement** :
   Cliquez sur "Environment Variables" et ajoutez :
   ```
   VITE_API_URL=https://votre-backend-render.onrender.com/api
   ```

6. **Cliquez** "Deploy"

### Méthode 2 : Avec fichier `vercel.json`

Le fichier `vercel.json` à la racine configure le déploiement :

```json
{
  "version": 2
}
```

**Pour un déploiement frontend-backend combiné**, voir section Render.

### Après le déploiement

- URL Frontend : `https://<votre-projet>.vercel.app`
- Votre app est en ligne ! 🎉

---

## 🔧 Déploiement Backend (Render)

### Pourquoi Render ?

- Base de données PostgreSQL **GRATUITE** (5GB)
- Déploiement gratuit pour services Node.js
- Facile d'intégration avec GitHub

### Étape 1 : Créer la base de données PostgreSQL

1. **Allez sur** : https://render.com/
2. **Créez un compte** (avec GitHub)
3. **Cliquez** sur "New+" → "PostgreSQL"
4. **Configurez** :
   - Name: `maplibre-db`
   - Database: `maplibre`
   - User: `maplibre_user`
   - Leave region as default
   - IPV4: Toggle OFF

5. **Créez** et attendez ~1 minute
6. **Copiez** la **connection string interne** :
   ```
   postgresql://maplibre_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/maplibre
   ```

### Étape 2 : Déployer le Backend

1. **Allez sur Render** → "New+" → "Web Service"
2. **Connectez GitHub** (si pas déjà fait)
3. **Sélectionnez** votre repo
4. **Configurez** :
   - **Name** : `maplibre-api`
   - **Runtime** : Node
   - **Build command** : 
     ```
     cd backend && npm install && npm run prisma:generate && npm run prisma:migrate:deploy && npm run build
     ```
   - **Start command** : 
     ```
     npm start
     ```
   - **Environment Variables** :
     ```
     DATABASE_URL=postgresql://...  # (copié ci-dessus)
     FRONTEND_URL=https://<votre-frontend>.vercel.app
     NODE_ENV=production
     ```

5. **Créez** le service

### Étape 3 : Mettre à jour le Frontend

1. Dans Vercel, allez à Settings → Environment Variables
2. Mettez à jour `VITE_API_URL` :
   ```
   https://maplibre-api.onrender.com/api
   ```
3. **Redéployez** le frontend

### ✅ Vérifiez le déploiement

```bash
# Dans votre terminal local
curl https://maplibre-api.onrender.com/api/health
# Vous devez voir : {"status":"ok","timestamp":"2025-..."}
```

---

## 💾 Gestion de la Base de Données

### Qu'est-ce que Prisma ?

Prisma est un **ORM** (Object-Relational Mapping) qui :
- Définit le schéma de la BD en `schema.prisma`
- Génère un client TypeScript pour requêter
- Gère les migrations

### Fichier schéma : `backend/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"  // En production
  url      = env("DATABASE_URL")
}

model Config {
  id        String @id @default(cuid())
  name      String @unique
  slug      String @unique
  data      String // JSON stringified
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model GeoJSON {
  id        String @id @default(cuid())
  path      String @unique
  name      String
  folder    String
  data      String // JSON stringified
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Migrations : Versioning de la BD

**Une migration = une version de la BD**

#### Créer une nouvelle migration (développement local)

```bash
cd backend

# 1. Modifiez schema.prisma
# 2. Exécutez :
npm run prisma:migrate:dev
# Donnez un nom (ex: "add_user_table")
```

Ça va :
1. Créer un fichier SQL dans `backend/prisma/migrations/`
2. L'exécuter sur votre BD locale
3. Générer le client Prisma

#### En production (Render)

Render exécute automatiquement au déploiement :
```
npm run prisma:migrate:deploy
```

Ça exécute **seulement** les migrations non encore appliquées.

### 🗃️ Commandes Prisma utiles

```bash
cd backend

# Voir la BD dans une UI web
npm run prisma:studio

# Générer le client (après modif schema)
npm run prisma:generate

# Créer migration + exécuter
npm run prisma:migrate:dev

# Exécuter les migrations non appliquées (production)
npm run prisma:migrate:deploy

# Insérer des données de test
npm run seed
```

### Exemple : Ajouter une colonne

1. **Modifiez** `backend/prisma/schema.prisma` :

```prisma
model Config {
  // ... autres champs ...
  description String? // Nouvelle colonne optionnelle
}
```

2. **Créez la migration** :

```bash
cd backend
npm run prisma:migrate:dev
# Entrez : "add_description_to_config"
```

3. **Vérifiez** dans Prisma Studio :

```bash
npm run prisma:studio
# Ouvrez http://localhost:5555
```

---

## 🔍 Débogage et Dépannage

### Problème : "Cannot find module '@prisma/client'"

**Solution** :
```bash
cd backend
npm install
npm run prisma:generate
```

### Problème : "DATABASE_URL not set"

**Solution** :
1. Vérifiez que `.env` ou `vercel.backend.json` contient `DATABASE_URL`
2. Redémarrez le serveur :
```bash
cd backend
npm run dev
```

### Problème : Migrations manquées en production

**Sur Render** :
- Allez à "Environment" → vérifiez `DATABASE_URL`
- Allez à "Settings" → "Build & Deploy" → "Redeploy latest commit"
- Vérifiez les logs : rendez-vous au bas du log pour voir les migrations

### Problème : "relation exists" en base de données

**Solution** : Supprimer la BD et recommencer

```bash
cd backend

# 1. Supprimer toutes les migrations
rm -rf prisma/migrations/*

# 2. Réinitialiser la BD
rm prisma/dev.db  # Si SQLite

# 3. Relancer
npm run prisma:migrate:dev
```

### Logs utiles

**Frontend (Vercel)** :
- Dashboard → Project → Deployments → View logs

**Backend (Render)** :
- Dashboard → Service → Logs (en direct)

### Tester l'API localement

```bash
# Terminal 1 : Backend
cd backend && npm run dev

# Terminal 2 : Test API
curl http://localhost:3001/api/health
```

---

## 📊 Résumé Checklist Déploiement

### ✅ Avant le déploiement

- [ ] Todas les dépendances installées : `npm install && cd backend && npm install`
- [ ] Prisma généré : `cd backend && npm run prisma:generate`
- [ ] Migrations testées localement : `npm run prisma:migrate:dev`
- [ ] Code testé localement : `npm run dev` et `cd backend && npm run dev`
- [ ] Code pushé sur GitHub : `git push origin main`

### ✅ Déploiement Backend (Render)

- [ ] BD PostgreSQL créée
- [ ] Service Web déployé
- [ ] `DATABASE_URL` configurée
- [ ] Build command exécute migrations : `npm run prisma:migrate:deploy`
- [ ] `/api/health` répond

### ✅ Déploiement Frontend (Vercel)

- [ ] Project créé
- [ ] `VITE_API_URL` pointant vers Render
- [ ] Build réussi
- [ ] App accessible

### ✅ Après le déploiement

- [ ] Tester quelques requêtes API
- [ ] Vérifier les logs en cas d'erreur
- [ ] Monitorez les performances

---

## 🚨 Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| 404 sur `/api/...` | Backend non déployé | Vérifiez Render, redéployez |
| "CORS error" | `FRONTEND_URL` mal configurée | Mettez à jour dans `backend/.env` |
| "Migration failed" | Schéma incohérent | Vérifiez les fichiers migration |
| "Cannot connect to database" | `DATABASE_URL` mauvaise | Copiez la bonne string depuis Render |

---

## 📞 Besoin d'aide ?

1. **Consultez les logs** (Vercel/Render)
2. **Relancez les migrations** localement
3. **Testez l'API** avec `curl` ou Postman
4. **Vérifiez** les variables d'environnement

Bon déploiement ! 🚀
