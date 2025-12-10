# MapLibre GeoJSON - Application Full Stack

Visualisation cartographique interactive avec backend Node.js et base de données.

## 🚀 Démarrage rapide (5 minutes)

```bash
# 1. Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# 2. Backend (nouveau terminal)
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
# → http://localhost:3001
```

## 📁 Structure du projet

```
maplibreglgeojson/
├── frontend/          🎨 React + Vite + Tailwind
├── backend/           🔧 Express + Prisma + Node.js
├── docs/              📚 Documentation complète
└── Configuration files
```

## 📚 Documentation

Commencez par : **[docs/00_LISEZ_MOI_D_ABORD.txt](./docs/00_LISEZ_MOI_D_ABORD.txt)**

ou selon votre besoin :
- **Démarrer rapidement** → [docs/QUICK_START.md](./docs/QUICK_START.md)
- **Déployer** → [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) ⭐
- **Comprendre le code** → [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)
- **Tout chercher** → [docs/GUIDES_INDEX.md](./docs/GUIDES_INDEX.md)

## 🛠️ Scripts principaux

### Frontend
```bash
cd frontend
npm run dev        # Développement
npm run build      # Build production
npm run preview    # Preview build
npm run lint       # Vérifier code
```

### Backend
```bash
cd backend
npm run dev        # Développement
npm run build      # Build production
npm start          # Lancer prod
npm run prisma:generate      # Générer client Prisma
npm run prisma:migrate:dev   # Créer migration
npm run prisma:studio        # UI base de données
npm run seed                 # Insérer données test
```

## 💾 Base de données

- **Développement** : SQLite (fichier `backend/prisma/dev.db`)
- **Production** : PostgreSQL (sur Render)

Gérée par Prisma - **pas d'SQL à écrire !**

## 🌐 Déploiement

- **Frontend** : Vercel (gratuit, 1 clic)
- **Backend** : Render (gratuit, 5 min)
- **Database** : PostgreSQL Render (5GB gratuit)

**Guide complet** → [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)

## 📖 Documentation complète

Tous les guides sont dans `docs/` avec 15+ fichiers couvrant :
- Installation complète
- Déploiement Vercel + Render
- Gestion base de données
- Troubleshooting & erreurs
- Explications technologies
- Checklist avant production

## 🆘 Problème ?

1. Consultez [docs/GUIDES_INDEX.md](./docs/GUIDES_INDEX.md)
2. ou cherchez votre erreur dans les docs

Bonne chance ! 🚀
