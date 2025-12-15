# 🎯 Index des Guides - Où trouver l'information

Naviguez rapidement vers le guide qui vous intéresse !

## 🎬 Commencer maintenant

| Guide | Durée | Pour qui |
|-------|-------|---------|
| **[QUICK_START.md](./QUICK_START.md)** | ⚡ 5 min | Impatient, veut juste développer |
| **[REORGANISATION_EXPLICATIONS.md](./REORGANISATION_EXPLICATIONS.md)** | 📋 5 min | Comprendre ce qui a changé |
| **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** | 🗂️ 10 min | Comprendre l'organisation du code |

---

## 🚀 Déployer en production

| Guide | Plateforme | Temps |
|-------|-----------|-------|
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | Vercel + Render | 📝 30 min complet |
| → Frontend | Vercel | 5 min |
| → Backend | Render | 10 min |
| → Database | PostgreSQL (Render) | 5 min |

---

## 📚 Apprendre le projet

### Frontend

| Document | Contient |
|----------|----------|
| **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md#dossier-frontend)** | Structure `/src`, composants React |
| **[DEMARRAGE_RAPIDE.md](./DEMARRAGE_RAPIDE.md)** | Installation frontend |
| **[INSTALLATION_FRONTEND.md](./INSTALLATION_FRONTEND.md)** | Guide détaillé frontend |

### Backend

| Document | Contient |
|----------|----------|
| **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md#dossier-backend)** | Structure Express, routes |
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#gestion-de-la-base-de-données)** | Prisma, migrations, BD |
| **[backend/README.md](./backend/README.md)** | Vue backend |
| **[backend/docs/README.md](./backend/docs/README.md)** | API endpoints complets |

### Architecture générale

| Document | Contient |
|----------|----------|
| **[COMMENT_CA_MARCHE.md](./COMMENT_CA_MARCHE.md)** | Fonctionnement complet |
| **[docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)** | Architecture technique |
| **[SYNTHESE_COMPLETE.md](./SYNTHESE_COMPLETE.md)** | Vue d'ensemble |

---

## 💾 Base de données

| Besoin | Document |
|--------|----------|
| Comprendre Prisma | **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#gestion-de-la-base-de-données)** |
| Ajouter une colonne | **[DEPLOYMENT_GUIDE.md#exemple--ajouter-une-colonne](./DEPLOYMENT_GUIDE.md#exemple--ajouter-une-colonne)** |
| Créer une migration | **[DEPLOYMENT_GUIDE.md#créer-une-nouvelle-migration-développement-local](./DEPLOYMENT_GUIDE.md#créer-une-nouvelle-migration-développement-local)** |
| Migrer SQLite → PostgreSQL | **[backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md)** |

---

## 🛠️ Scripts et commandes

### Tous les scripts

```bash
# Frontend (racine)
npm run dev           # Développement
npm run build         # Build production
npm run preview       # Preview build
npm run lint          # Vérifier code

# Backend
cd backend
npm run dev                   # Développement
npm run build                 # Build production
npm start                     # Lancer en prod
npm run prisma:generate       # Générer client
npm run prisma:migrate:dev    # Créer migration
npm run prisma:migrate:deploy # Exécuter migrations
npm run prisma:studio         # UI base de données
npm run seed                  # Données test
```

Voir : **[QUICK_START.md](./QUICK_START.md)**

---

## 🆘 Résoudre un problème

### Problème : Démarrage

| Problème | Guide |
|----------|-------|
| Backend ne démarre pas | **[QUICK_START.md#problèmes-courants](./QUICK_START.md#problèmes-courants)** |
| Frontend ne se connecte pas | **[DEPLOYMENT_GUIDE.md#débogage-et-dépannage](./DEPLOYMENT_GUIDE.md#débogage-et-dépannage)** |
| BD vide | **[DEPLOYMENT_GUIDE.md#problème-migrations-manquées-en-production](./DEPLOYMENT_GUIDE.md#problème-migrations-manquées-en-production)** |

### Problème : Déploiement

| Problème | Guide |
|----------|-------|
| Vercel échoue | **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#déploiement-frontend-vercel)** |
| Render échoue | **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#déploiement-backend-render)** |
| API ne répond pas | **[DEPLOYMENT_GUIDE.md#vérifiez-le-déploiement](./DEPLOYMENT_GUIDE.md#vérifiez-le-déploiement)** |
| CORS error | **[DEPLOYMENT_GUIDE.md#erreurs-courantes](./DEPLOYMENT_GUIDE.md#erreurs-courantes)** |

### Problème : Base de données

| Problème | Guide |
|----------|-------|
| "@prisma/client not found" | **[DEPLOYMENT_GUIDE.md#problème-cannot-find-module-prismaclient](./DEPLOYMENT_GUIDE.md#problème-cannot-find-module-prismaclient)** |
| "DATABASE_URL not set" | **[DEPLOYMENT_GUIDE.md#problème-database_url-not-set](./DEPLOYMENT_GUIDE.md#problème-database_url-not-set)** |
| Migrations échouées | **[DEPLOYMENT_GUIDE.md#problème-migrations-manquées-en-production](./DEPLOYMENT_GUIDE.md#problème-migrations-manquées-en-production)** |

---

## 📊 Structure fichier à fichier

### Racine du projet

| Fichier | Rôle | Voir |
|---------|------|------|
| `package.json` | Frontend deps | [QUICK_START.md](./QUICK_START.md) |
| `.env` | Variables frontend | [DEPLOYMENT_GUIDE.md#variables-denvironnement](./DEPLOYMENT_GUIDE.md#variables-denvironnement) |
| `vite.config.ts` | Config Vite | [PROJECT_STRUCTURE.md#fichiers-de-config-frontend](./PROJECT_STRUCTURE.md#fichiers-de-config-frontend) |
| `vercel.json` | Vercel config | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |

### Dossier `/backend`

| Fichier | Rôle | Voir |
|---------|------|------|
| `package.json` | Backend deps | [QUICK_START.md](./QUICK_START.md) |
| `src/server.ts` | Express app | [PROJECT_STRUCTURE.md#backendsrc](./PROJECT_STRUCTURE.md#backendsrc) |
| `prisma/schema.prisma` | Schéma BD | [DEPLOYMENT_GUIDE.md#fichier-schéma--backendprismaSchemaprisma](./DEPLOYMENT_GUIDE.md#fichier-schéma--backendprismaSchemaprisma) |

### Dossier `/src`

| Dossier | Contient | Voir |
|---------|----------|------|
| `components/` | Composants React | [PROJECT_STRUCTURE.md#srcontenu-source-react](./PROJECT_STRUCTURE.md#srcontenu-source-react) |
| `hooks/` | React hooks | [PROJECT_STRUCTURE.md#hooks](./PROJECT_STRUCTURE.md#hooks) |
| `map/` | Logique MapLibre | [PROJECT_STRUCTURE.md#map](./PROJECT_STRUCTURE.md#map) |

---

## 🎓 Parcours pédagogique

### Pour débutant

1. Lire : **[REORGANISATION_EXPLICATIONS.md](./REORGANISATION_EXPLICATIONS.md)** - Comprendre la structure
2. Faire : **[QUICK_START.md](./QUICK_START.md)** - Démarrer localement
3. Lire : **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Comprendre chaque fichier
4. Apprendre : **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Comprendre la BD et le déploiement

### Pour développeur expérimenté

1. **[QUICK_START.md](./QUICK_START.md)** - Prise en main rapide
2. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Déploiement
3. **[backend/docs/README.md](./backend/docs/README.md)** - API complète

### Pour DevOps / Infra

1. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Architecture production
2. **[backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)** - Options déploiement
3. **[backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md)** - Migration données

---

## 🔗 Tous les documents

### 📋 Guides créés pour vous

- ✅ **[QUICK_START.md](./QUICK_START.md)** - Démarrage rapide (5 min)
- ✅ **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Structure expliquée
- ✅ **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Déploiement complet
- ✅ **[REORGANISATION_EXPLICATIONS.md](./REORGANISATION_EXPLICATIONS.md)** - Résumé changements

### 📚 Documentation existante

- [DEMARRAGE_RAPIDE.md](./DEMARRAGE_RAPIDE.md)
- [INSTALLATION_BACKEND.md](./INSTALLATION_BACKEND.md)
- [INSTALLATION_FRONTEND.md](./INSTALLATION_FRONTEND.md)
- [COMMENT_CA_MARCHE.md](./COMMENT_CA_MARCHE.md)
- [SYNTHESE_COMPLETE.md](./SYNTHESE_COMPLETE.md)
- [backend/README.md](./backend/README.md)
- [backend/docs/README.md](./backend/docs/README.md)
- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)

---

## 🎯 Recommandation par profil

### 👨‍💻 Je viens de cloner le projet

→ **[QUICK_START.md](./QUICK_START.md)** (5 min) puis **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** (10 min)

### 🏗️ Je dois comprendre l'architecture

→ **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** puis **[COMMENT_CA_MARCHE.md](./COMMENT_CA_MARCHE.md)**

### 🚀 Je dois déployer en prod

→ **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** (tout dedans !)

### 💾 Je dois gérer la base de données

→ **[DEPLOYMENT_GUIDE.md#gestion-de-la-base-de-données](./DEPLOYMENT_GUIDE.md#gestion-de-la-base-de-données)**

### 🆘 Quelquechose ne marche pas

→ **[DEPLOYMENT_GUIDE.md#débogage-et-dépannage](./DEPLOYMENT_GUIDE.md#débogage-et-dépannage)** ou **[QUICK_START.md#problèmes-courants](./QUICK_START.md#problèmes-courants)**

---

**Besoin de précisions ? Tous les guides contiennent des exemples détaillés et des pas-à-pas ! 🎉**
