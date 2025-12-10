# 🔧 Backend - Guide d'Installation et Configuration

Ce guide est **uniquement pour le backend**. Pour le frontend, voir [INSTALLATION_FRONTEND.md](./INSTALLATION_FRONTEND.md).

---

## 📋 Prérequis

- **Node.js** 18+ installé
- **npm** ou **yarn**
- Terminal bash/zsh

---

## 🚀 Installation du Backend

### Étape 1 : Aller dans le dossier backend

```bash
cd backend
```

### Étape 2 : Installer les dépendances

```bash
npm install
```

**Attendu :**
```
added 128 packages in 15s
```

---

### Étape 3 : Configuration environnement

```bash
cp .env.example .env
```

Le fichier `.env` est créé avec :
```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**⚠️ Important :** Si vous changez le port, mettez à jour `FRONTEND_URL` dans le `.env` du frontend !

---

### Étape 4 : Générer le client Prisma

```bash
npm run prisma:generate
```

**Attendu :**
```
✔ Generated Prisma Client (v5.22.0)
```

---

### Étape 5 : Créer la base de données

**Si c'est la première fois OU si vous avez des erreurs de migration :**

```bash
# Supprimer les migrations existantes et recréer
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

**Sinon, utilisez simplement :**

```bash
npm run prisma:migrate:dev
```

**Attendu :**
```
✔ Applying migration `init`
Your database is now in sync with your schema.
```

Cela crée :
- Le fichier `dev.db` (base SQLite)
- Les tables `configs` et `geojson`

---

### Étape 6 : Importer les données

```bash
npm run seed
```

**Attendu :**
```
🌱 Starting seed...

📋 Seeding configs...
  ✅ Le Mans univ multi
  ✅ Le Mans univ
  ✅ Paris

🗺️  Seeding GeoJSON files...
  ✅ LeMansUniv/ESGT.geojson
  ✅ LeMansUniv/GrapheESGT.geojson
  ✅ LeMansUniv/IRA.geojson
  ...

✨ Seed completed successfully!

📊 Stats:
   Configs: 3
   GeoJSON: 5
```

---

### Étape 7 : Démarrer le serveur

```bash
npm run dev
```

**Attendu :**
```
🚀 Server running on http://localhost:3001
📊 Environment: development
```

---

## ✅ Vérifier que ça fonctionne

### Test 1 : Health check

**Ouvrir un nouveau terminal** et tester :

```bash
curl http://localhost:3001/health
```

**Attendu :**
```json
{"status":"ok","timestamp":"2025-12-02T17:00:00.000Z"}
```

### Test 2 : Lister les configs

```bash
curl http://localhost:3001/api/configs
```

**Attendu :** Un array JSON avec vos configs

### Test 3 : Récupérer une config

```bash
curl http://localhost:3001/api/configs/le-mans-univ
```

**Attendu :** La config complète avec les données

### Test 4 : Lister les GeoJSON

```bash
curl http://localhost:3001/api/geojson
```

**Attendu :** Un array JSON avec vos fichiers GeoJSON

---

## 🗄️ Visualiser la base de données

Pour voir les données dans une interface graphique :

```bash
npm run prisma:studio
```

Ouvre **http://localhost:5555**

Vous pouvez :
- ✅ Voir toutes les tables
- ✅ Explorer les données
- ✅ Modifier directement les entrées

---

## 🐛 Problèmes fréquents

### Erreur : "The table `main.configs` does not exist"

**Cause :** Les tables n'ont pas été créées.

**Solution :**
```bash
# Supprimer et recréer les migrations
rm -rf prisma/migrations
npx prisma migrate dev --name init

# Réimporter les données
npm run seed
```

---

### Erreur : "EADDRINUSE: address already in use :::3001"

**Cause :** Le port 3001 est déjà utilisé.

**Solution 1 - Changer le port :**
```bash
# Dans backend/.env
PORT=3002
```

**Solution 2 - Tuer le processus :**
```bash
# Trouver le processus
lsof -i :3001

# Tuer le processus (remplacer PID)
kill -9 PID
```

---

### Erreur : "Cannot find module '@prisma/client'"

**Solution :**
```bash
npm run prisma:generate
```

---

### Erreur : Migration provider mismatch

**Solution :**
```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

---

## 📦 Commandes utiles

```bash
# Développement
npm run dev              # Serveur avec hot-reload
npm run build            # Compiler TypeScript
npm start                # Démarrer en production

# Base de données
npm run prisma:studio    # Interface graphique DB
npm run seed             # Réimporter les données
npm run prisma:generate  # Régénérer le client Prisma
npx prisma migrate dev   # Créer une migration

# Maintenance
rm dev.db                # Supprimer la DB
npm run prisma:migrate:dev  # Recréer la DB
npm run seed             # Réimporter
```

---

## 🌐 Déploiement

### Pour Railway

1. Créer compte sur [railway.app](https://railway.app)
2. Créer projet avec PostgreSQL
3. Dans `prisma/schema.prisma`, changer :
   ```prisma
   provider = "postgresql"  // au lieu de "sqlite"
   ```
4. Connecter GitHub et déployer

### Pour VPS

Voir [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)

---

## 📚 Documentation

- **[backend/docs/README.md](./backend/docs/README.md)** - Documentation API complète
- **[backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md)** - Migration PostgreSQL
- **[backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)** - Déploiement production

---

## ✅ Checklist backend

- [ ] `cd backend`
- [ ] `npm install`
- [ ] `cp .env.example .env`
- [ ] `npm run prisma:generate`
- [ ] `rm -rf prisma/migrations && npx prisma migrate dev --name init`
- [ ] `npm run seed`
- [ ] `npm run dev`
- [ ] `curl http://localhost:3001/health` → OK
- [ ] `curl http://localhost:3001/api/configs` → JSON array

**Backend prêt !** → Passer à [INSTALLATION_FRONTEND.md](./INSTALLATION_FRONTEND.md)
