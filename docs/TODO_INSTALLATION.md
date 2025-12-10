# 🎯 TODO - Mise en place du Backend

## Checklist d'installation

### ✅ Phase 1 : Installation backend

```bash
cd backend
npm install
```

**Attendu :** Installation de toutes les dépendances (Express, Prisma, etc.)

---

### ✅ Phase 2 : Configuration

```bash
cp .env.example .env
```

**Vérifier le contenu de `.env` :**
```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

### ✅ Phase 3 : Initialiser Prisma

```bash
npm run prisma:generate
```

**Attendu :** Génération du client Prisma

```bash
npm run prisma:migrate:dev
```

**Attendu :** 
- Création du fichier `dev.db`
- Application des migrations
- Tables créées : `configs` et `geojson`

---

### ✅ Phase 4 : Import des données

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
  ✅ test/batiment-a.geojson
  ✅ test/batiment-b.geojson

✨ Seed completed successfully!

📊 Stats:
   Configs: 3
   GeoJSON: 5
```

---

### ✅ Phase 5 : Démarrer le backend

```bash
npm run dev
```

**Attendu :**
```
🚀 Server running on http://localhost:3001
📊 Environment: development
```

---

### ✅ Phase 6 : Tester l'API

**Dans un autre terminal :**

```bash
# Health check
curl http://localhost:3001/health

# Devrait retourner :
# {"status":"ok","timestamp":"..."}

# Lister les configs
curl http://localhost:3001/api/configs

# Devrait retourner un array JSON avec vos configs

# Récupérer une config spécifique
curl http://localhost:3001/api/configs/le-mans-univ

# Devrait retourner la config avec ses données

# Lister les GeoJSON
curl http://localhost:3001/api/geojson

# Devrait retourner un array JSON avec vos fichiers
```

---

### ✅ Phase 7 : Configurer le frontend

**Retour au dossier racine :**

```bash
cd ..
```

**Créer/modifier `.env` :**

```bash
echo "VITE_API_URL=http://localhost:3001/api" > .env
```

Ou manuellement créer le fichier `.env` avec :
```env
VITE_API_URL=http://localhost:3001/api
```

---

### ✅ Phase 8 : Installer et démarrer le frontend

```bash
npm install
npm run dev
```

**Attendu :**
```
VITE ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### ✅ Phase 9 : Vérifier le frontend

1. **Ouvrir** `http://localhost:5173`
2. **Ouvrir la console développeur** (F12)
3. **Vérifier** :
   - Pas d'erreurs CORS
   - Les requêtes vers `http://localhost:3001/api` fonctionnent
   - Le sélecteur de config affiche vos configs
4. **Sélectionner une config** (ex: "Le Mans univ")
5. **Vérifier** que la carte se charge correctement

---

### ✅ Phase 10 : Prisma Studio (optionnel)

**Visualiser les données :**

```bash
cd backend
npm run prisma:studio
```

**Ouvrir** `http://localhost:5555`

Vous pouvez maintenant :
- Voir toutes vos tables
- Explorer les données
- Modifier directement les entrées

---

## 🐛 En cas de problème

### Problème : "Cannot find module '@prisma/client'"

**Solution :**
```bash
cd backend
npm run prisma:generate
```

---

### Problème : "EADDRINUSE :::3001"

Le port 3001 est déjà utilisé.

**Solution :**
```bash
# Dans backend/.env, changer le port
PORT=3002

# Dans .env du frontend
VITE_API_URL=http://localhost:3002/api
```

---

### Problème : CORS error dans le navigateur

**Solution :**
Vérifier `backend/.env` :
```env
FRONTEND_URL=http://localhost:5173
```

Puis redémarrer le backend.

---

### Problème : Base de données vide

**Solution :**
```bash
cd backend
npm run seed
```

---

### Problème : Frontend charge les anciens fichiers

**Solution :**
- Vider le cache du navigateur (Ctrl+Shift+R)
- Vérifier que `VITE_API_URL` est bien défini dans `.env`

---

## 📊 Résultat attendu

Une fois tout installé, vous devriez avoir :

1. ✅ Backend qui tourne sur `http://localhost:3001`
2. ✅ Base de données SQLite avec vos configs et GeoJSON
3. ✅ Frontend qui tourne sur `http://localhost:5173`
4. ✅ Frontend qui charge les données depuis l'API
5. ✅ Carte interactive fonctionnelle

---

## 🎯 Prochaines étapes

Une fois l'installation terminée :

1. **Lire** [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md) pour comprendre l'architecture
2. **Lire** [backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md) pour migrer vers PostgreSQL
3. **Lire** [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md) pour déployer en production

---

## 📞 Besoin d'aide ?

Si vous avez des questions ou des problèmes :

1. Vérifier les logs du backend et du frontend
2. Consulter la documentation complète dans `backend/docs/`
3. Vérifier que toutes les étapes ci-dessus ont été suivies

---

## 🎉 Félicitations !

Une fois toutes les étapes validées, votre backend est opérationnel ! 🚀

Vous pouvez maintenant :
- Développer de nouvelles fonctionnalités
- Ajouter/modifier des configs via l'API
- Migrer vers PostgreSQL pour la production
- Déployer sur Railway/Vercel/VPS
