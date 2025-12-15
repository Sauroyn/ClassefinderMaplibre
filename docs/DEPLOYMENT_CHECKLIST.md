# ✅ Checklist Configuration - Avant de déployer

Utilisez cette checklist pour vérifier que tout est correctement configuré avant le déploiement.

## 🏠 Configuration Locale (Développement)

### Frontend (racine)

```env
✅ VITE_API_URL=http://localhost:3001/api
```

**Vérifier** :
```bash
cat .env.local | grep VITE_API_URL
# Ou créer le fichier :
echo "VITE_API_URL=http://localhost:3001/api" > .env.local
```

### Backend (backend/)

```env
✅ DATABASE_URL=file:./dev.db
✅ FRONTEND_URL=http://localhost:5173
✅ PORT=3001
✅ NODE_ENV=development
```

**Vérifier** :
```bash
cat backend/.env
```

### Base de données locale

```bash
✅ cd backend && npm run prisma:migrate:dev
# Doit créer backend/prisma/dev.db
```

---

## 🚀 Déploiement Vercel (Frontend)

### Variables d'environnement Vercel

Dans le dashboard Vercel → Settings → Environment Variables :

```env
✅ VITE_API_URL=https://votre-backend.onrender.com/api
```

**Vérifier** :
1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Settings → Environment Variables
4. Vérifiez que `VITE_API_URL` est défini

### Build configuration

- Build Command : `npm run build`
- Output Directory : `dist`

**Vérifier** :
1. Dashboard → Settings → Build & Development
2. Vérifiez les commandes ci-dessus

---

## 🔧 Déploiement Render (Backend)

### Étape 1 : Base de données PostgreSQL

```env
✅ DATABASE_URL=postgresql://user:password@host:5432/db
```

**Vérifier** :
1. Allez sur https://render.com/dashboard
2. Sélectionnez la BD PostgreSQL
3. Copiez la "Internal Database URL"
4. Utilisez-la dans le service Web

### Étape 2 : Service Web Backend

#### Variables d'environnement

```env
✅ DATABASE_URL=postgresql://...           # De la BD
✅ FRONTEND_URL=https://app.vercel.app     # Votre frontend Vercel
✅ NODE_ENV=production
```

**Vérifier** :
1. Dashboard → Service → Environment
2. Toutes les variables sont définies

#### Build Command

```bash
✅ cd backend && npm install && npm run prisma:generate && npm run prisma:migrate:deploy && npm run build
```

**Vérifier** :
1. Dashboard → Service → Settings → Build & Deploy
2. Build Command = le texte ci-dessus exact

#### Start Command

```bash
✅ npm start
```

**Vérifier** :
1. Dashboard → Service → Settings → Build & Deploy
2. Start Command = `npm start`

---

## 🧪 Tests après déploiement

### Test Backend (santé API)

```bash
# Doit répondre {"status":"ok",...}
curl https://votre-backend.onrender.com/api/health
```

### Test Frontend

1. Ouvrez : `https://votre-app.vercel.app`
2. Ouvrez DevTools → Console
3. Pas d'erreurs CORS ?
4. Pas d'erreurs 404 sur `/api/...` ?

### Test Complet

1. Frontend charge ?
2. Vous pouvez interagir avec la carte ?
3. Les données chargent depuis l'API ?

---

## ❌ Erreurs courantes lors du déploiement

### "Cannot GET /api/configs"

**Cause** : Backend pas déployé ou mauvaise URL

**Solution** :
1. Vérifiez que Render dit "Live"
2. Testez : `curl https://votre-backend.onrender.com/api/health`
3. Vérifiez `VITE_API_URL` sur Vercel

### "CORS error"

**Cause** : `FRONTEND_URL` mal configurée sur Render

**Solution** :
1. Render → Service → Environment
2. Vérifiez `FRONTEND_URL=https://app.vercel.app` (exact!)
3. Redéployez

### "relation exists" en BD

**Cause** : Schéma déjà existe

**Solution** :
1. Render → DB → Delete & Recreate (ATTENTION: perte de données!)
2. Puis redéployez le backend

### Build fails avec "tsc command not found"

**Cause** : TypeScript pas installé

**Solution** :
```bash
cd backend && npm install
npm run build  # Teste localement
```

---

## 📊 Checklist finale (avant de dire c'est fini)

### ✅ Développement local

- [ ] `npm install && cd backend && npm install` réussi
- [ ] `npm run dev` fonctionne (frontend sur 5173)
- [ ] `cd backend && npm run dev` fonctionne (backend sur 3001)
- [ ] Pas d'erreurs en console / terminal

### ✅ Build local

- [ ] `npm run build` réussi (frontend)
- [ ] `cd backend && npm run build` réussi (backend)
- [ ] `npm run preview` fonctionne

### ✅ Déploiement Vercel

- [ ] Repo poussé sur GitHub
- [ ] Projet Vercel créé
- [ ] `VITE_API_URL` configurée
- [ ] Build réussi
- [ ] App accessible
- [ ] Pas d'erreurs console

### ✅ Déploiement Render

- [ ] BD PostgreSQL créée
- [ ] Service Web créé
- [ ] `DATABASE_URL` configurée
- [ ] `FRONTEND_URL` configurée
- [ ] Build réussi
- [ ] Service est "Live"

### ✅ Tests finaux

- [ ] `curl /api/health` répond ✅
- [ ] Frontend charge sans erreur
- [ ] Vous pouvez interagir avec l'app
- [ ] Les données chargent depuis l'API

---

## 📞 Besoin d'aide ?

| Problème | Voir |
|----------|------|
| Démarrage local | [QUICK_START.md](./QUICK_START.md) |
| Déploiement détaillé | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |
| Erreurs spécifiques | [DEPLOYMENT_GUIDE.md#débogage-et-dépannage](./DEPLOYMENT_GUIDE.md#débogage-et-dépannage) |
| Structure du projet | [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) |

---

**Tout coché ? Vous êtes prêt ! 🚀**
