# ⚡ Quick Start - Démarrage rapide

Vous êtes pressé ? Voici comment **démarrer en 5 minutes**. 🚀

## 🏃 Première utilisation (setup complet)

```bash
# 1. Cloner le repo
git clone <url-repo>
cd maplibreglgeojson

# 2. Installer TOUT
npm install
cd backend && npm install && cd ..

# 3. Générer le client Prisma (CRUCIAL)
cd backend && npm run prisma:generate && cd ..

# 4. Créer la base de données locale
cd backend && npm run prisma:migrate:dev && cd ..

# 5. Insérer des données (optionnel)
cd backend && npm run seed && cd ..

# Voilà ! Prêt à démarrer
```

## 🎯 Lancer en développement

**Terminal 1 - Frontend** :
```bash
npm run dev
# → http://localhost:5173
```

**Terminal 2 - Backend** :
```bash
cd backend && npm run dev
# → http://localhost:3001
```

Ouvrez http://localhost:5173 dans votre navigateur. C'est live ! 🎉

---

## 🔨 Build pour production

### Build les deux parties

```bash
# Frontend
npm run build

# Backend
cd backend && npm run build
```

### Tester le build en local

```bash
npm run preview        # Teste le frontend build
cd backend && npm start  # Lance le backend compilé
```

---

## 📤 Déployer sur Vercel + Render

### Frontend sur Vercel (3 clics)

1. Poussez votre code : `git push origin main`
2. Allez sur https://vercel.com/dashboard
3. "Add New Project" → Sélectionnez votre repo → Deploy ✅
4. Dans Settings → Env Vars → `VITE_API_URL=https://votre-api.onrender.com/api`

### Backend sur Render (5 minutes)

1. Créez la BD PostgreSQL : https://render.com/
   - "New+" → "PostgreSQL" → Copiez la connection string

2. Déployez le service : https://render.com/
   - "New+" → "Web Service" → Votre repo
   - Build: `cd backend && npm install && npm run prisma:generate && npm run prisma:migrate:deploy && npm run build`
   - Start: `npm start`
   - Env vars:
     - `DATABASE_URL=postgresql://...` (de la BD)
     - `FRONTEND_URL=https://app.vercel.app`

3. Testez : `curl https://votre-api.onrender.com/api/health`

---

## 🆘 Problèmes courants

### "Cannot find @prisma/client"
```bash
cd backend && npm run prisma:generate
```

### "DATABASE_URL not found"
- Vérifiez `.env` dans le dossier `backend/`
- Relancez : `cd backend && npm run dev`

### Migrations échouées
```bash
# Réinitialiser la BD (DEV SEULEMENT!)
rm backend/prisma/dev.db
cd backend && npm run prisma:migrate:dev
```

### API répond pas
- Backend lancé ? : `cd backend && npm run dev`
- Port 3001 libre ? : `lsof -i :3001`
- VITE_API_URL correct ? : Vérifiez dans `.env.local`

---

## 📚 Besoin de plus de détails ?

- **Déploiement complet** : Voir `DEPLOYMENT_GUIDE.md`
- **Structure projet** : Voir `PROJECT_STRUCTURE.md`
- **Gestion BD** : Voir `DEPLOYMENT_GUIDE.md#gestion-de-la-base-de-données`

---

Bon développement ! 💪
