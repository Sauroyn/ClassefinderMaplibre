# 🚀 Démarrage Rapide - MapLibre Backend + Frontend

**Guide express pour lancer le projet en 10 minutes.**

Le backend et le frontend sont **séparés** et doivent être configurés indépendamment.

---

## 📦 1. Backend (5 minutes)

### Installation

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
rm -rf prisma/migrations
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Vérification

```bash
curl http://localhost:3001/health
# ✅ {"status":"ok"}
```

**✅ Backend prêt sur http://localhost:3001**

➡️ **Détails complets :** [INSTALLATION_BACKEND.md](./INSTALLATION_BACKEND.md)

---

## 🎨 2. Frontend (5 minutes)

### Installation

```bash
cd ..                                              # Retour à la racine
echo "VITE_API_URL=http://localhost:3001/api" > .env
npm install
npm run dev
```

### Vérification

**Ouvrir http://localhost:5173**

- ✅ Sélecteur de config fonctionne
- ✅ Carte se charge

**✅ Frontend prêt sur http://localhost:5173**

➡️ **Détails complets :** [INSTALLATION_FRONTEND.md](./INSTALLATION_FRONTEND.md)

---

## 🐛 Problèmes courants

### Backend : "table does not exist"

```bash
cd backend
rm -rf prisma/migrations
npx prisma migrate dev --name init
npm run seed
```

### Frontend : Erreur CORS

Vérifier `backend/.env` :
```env
FRONTEND_URL=http://localhost:5173
```

Puis redémarrer le backend.

### Frontend : Sélecteur vide

```bash
# Vérifier que le backend tourne
curl http://localhost:3001/api/configs

# Vérifier .env à la racine
cat .env
# Doit contenir : VITE_API_URL=http://localhost:3001/api
```

---

## 📊 Résultat

```
Backend  → http://localhost:3001
Frontend → http://localhost:5173

┌──────────────┐
│   Browser    │
│  :5173       │
└──────┬───────┘
       │ fetch
       ↓
┌──────────────┐
│   Backend    │
│  :3001       │
└──────┬───────┘
       │ SQL
       ↓
┌──────────────┐
│   SQLite     │
│  dev.db      │
└──────────────┘
```

---

## 🎯 Prochaines étapes

1. **Développer** → Tout fonctionne localement !
2. **PostgreSQL** → [backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md)
3. **Déployer** → [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)

---

## 📚 Documentation complète

- **[INSTALLATION_BACKEND.md](./INSTALLATION_BACKEND.md)** - Backend détaillé
- **[INSTALLATION_FRONTEND.md](./INSTALLATION_FRONTEND.md)** - Frontend détaillé
- **[docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)** - Architecture
- **[backend/docs/README.md](./backend/docs/README.md)** - API complète

---

**Tout est prêt !** 🎉
