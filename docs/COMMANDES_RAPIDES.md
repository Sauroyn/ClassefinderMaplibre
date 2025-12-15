# 📋 Commandes rapides - Copy-Paste ready

Tous les scripts avec explications rapides. Copy-colle, exécute, profit !

---

## 🚀 Démarrer (développement local)

### Setup complet (première fois)

```bash
# Installer tout + créer BD
npm install
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate:dev && cd ..
```

Puis dans le terminal :
```
✅ Donnez un nom à la migration : init
```

### Lancer l'app

**Terminal 1** (Frontend):
```bash
npm run dev
# → http://localhost:5173
```

**Terminal 2** (Backend):
```bash
cd backend && npm run dev
# → http://localhost:3001
```

---

## 🛠️ Base de données (Prisma)

### Générer le client Prisma
```bash
cd backend && npm run prisma:generate
```

### Créer une migration (après modif schema.prisma)
```bash
cd backend && npm run prisma:migrate:dev
```

### Voir la BD graphiquement
```bash
cd backend && npm run prisma:studio
# → http://localhost:5555
```

### Insérer des données de test
```bash
cd backend && npm run seed
```

### Réinitialiser la BD (DEV SEULEMENT)
```bash
cd backend
rm prisma/dev.db
npm run prisma:migrate:dev
```

### Exécuter migrations (production)
```bash
cd backend && npm run prisma:migrate:deploy
```

---

## 🏗️ Build pour production

### Build frontend
```bash
npm run build
# → Crée dist/
```

### Build backend
```bash
cd backend && npm run build
# → Crée dist/
```

### Tester le build
```bash
npm run preview       # Frontend build
cd backend && npm start  # Backend compilé
```

---

## 🧹 Maintenance

### Nettoyer & réinstaller (si problème)

```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json dist
npm install
npm run prisma:generate
npm run prisma:migrate:dev
```

### Vérifier qu'aucun port est utilisé
```bash
lsof -i :5173   # Frontend
lsof -i :3001   # Backend
lsof -i :5555   # Prisma Studio
```

### Tuer les processus (si besoin)
```bash
kill -9 <PID>  # PID du lsof ci-dessus
```

---

## 🚀 Déploiement

### Vercel (frontend)

```bash
# 1. Poussez le code
git add .
git commit -m "Deploy"
git push origin main

# 2. Allez sur https://vercel.com/dashboard
# 3. "Add New Project" → Sélectionnez repo → Deploy

# 4. Configurez variable
# Settings → Environment Variables
# VITE_API_URL=https://votre-api.onrender.com/api
```

### Render (backend + BD)

#### Créer la BD PostgreSQL
```bash
# https://render.com/dashboard
# New+ → PostgreSQL → Create
# Copiez la connection string interne
```

#### Déployer le backend
```bash
# https://render.com/dashboard
# New+ → Web Service → Votre repo

# Build Command:
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate:deploy && npm run build

# Start Command:
npm start

# Env vars:
DATABASE_URL=postgresql://...
FRONTEND_URL=https://app.vercel.app
NODE_ENV=production
```

---

## 🔍 Debugging

### Voir les logs backend (dev)
```bash
cd backend && npm run dev
# Regarde la console
```

### Voir les logs frontend
```bash
npm run dev
# Ouvrez DevTools → Console (F12)
```

### Tester l'API manuellement
```bash
# Health check
curl http://localhost:3001/api/health

# Lister configs
curl http://localhost:3001/api/configs

# Lister GeoJSON
curl http://localhost:3001/api/geojson
```

### Vérifier que la BD se connecte
```bash
cd backend && npm run prisma:studio
# Doit ouvrir http://localhost:5555
```

### Vérifier les variables d'environnement
```bash
# Frontend
cat .env.local | grep VITE_API_URL

# Backend
cat backend/.env | grep DATABASE_URL
```

---

## 📊 Statistiques du projet

### Compter les fichiers
```bash
find . -type f -name "*.ts" -o -name "*.tsx" | wc -l
```

### Taille du projet
```bash
du -sh .
du -sh backend
du -sh node_modules  # À ignorer
```

### Dépendances installées
```bash
npm list --depth=0
cd backend && npm list --depth=0
```

---

## 🎯 Scripts essentiels résumé

| Commande | Rôle | Où? |
|----------|------|-----|
| `npm install` | Install frontend | Racine |
| `npm run dev` | Dev server | Racine |
| `npm run build` | Build prod | Racine |
| `cd backend && npm install` | Install backend | Backend |
| `cd backend && npm run dev` | Dev server | Backend |
| `cd backend && npm run prisma:migrate:dev` | Créer migration | Backend |
| `cd backend && npm run prisma:studio` | Voir BD | Backend |
| `cd backend && npm run seed` | Données test | Backend |

---

## 💡 Trucs utiles

### Copier-coller du terminal
```bash
# Voir ce que vous êtes sur le point de faire
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001/api
EOF

# Vérifier que c'est bien écrit
cat .env.local
```

### Relancer le serveur rapidement
```bash
# Ctrl+C pour arrêter
# Puis
npm run dev  # Relancer
```

### Vider le cache React
```bash
# Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac)
```

### Voir les ports utilisés
```bash
# macOS/Linux
lsof -i -P -n | grep LISTEN

# Windows
netstat -ano | grep LISTENING
```

---

## 🚨 If things break

### Nuclear option (réinstaller)
```bash
# Frontend
rm -rf node_modules package-lock.json dist
npm install
npm run build

# Backend
cd backend
rm -rf node_modules package-lock.json dist prisma/dev.db
npm install
npm run prisma:generate
npm run prisma:migrate:dev
```

### Puis relancer normalement
```bash
npm run dev
cd backend && npm run dev
```

---

**Besoin d'explication sur une commande ?** Voir [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) ou [QUICK_START.md](./QUICK_START.md) 📚
