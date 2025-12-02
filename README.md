# MapLibre GeoJSON - Full Stack Application

Application de visualisation cartographique interactive avec backend Node.js et base de données.

**⚠️ Important : Le backend et le frontend sont séparés et indépendants.**

---

## 🚀 Démarrage Rapide

**Installation complète en 10 minutes :**

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
npm run prisma:generate
rm -rf prisma/migrations && npx prisma migrate dev --name init
npm run seed
npm run dev

# 2. Frontend (nouveau terminal)
cd ..
echo "VITE_API_URL=http://localhost:3001/api" > .env
npm install
npm run dev
```

- **Backend :** http://localhost:3001
- **Frontend :** http://localhost:5173

**📖 Guide détaillé :** [DEMARRAGE_RAPIDE.md](./DEMARRAGE_RAPIDE.md)

---

## 📚 Documentation

### 🎯 Installation

| Document | Description |
|----------|-------------|
| **[DEMARRAGE_RAPIDE.md](./DEMARRAGE_RAPIDE.md)** | ⭐ Installation express (10 min) |
| **[INSTALLATION_BACKEND.md](./INSTALLATION_BACKEND.md)** | 🔧 Guide backend détaillé |
| **[INSTALLATION_FRONTEND.md](./INSTALLATION_FRONTEND.md)** | 🎨 Guide frontend détaillé |

### 📖 Comprendre

| Document | Description |
|----------|-------------|
| **[COMMENT_CA_MARCHE.md](./COMMENT_CA_MARCHE.md)** | Fonctionnement détaillé |
| **[docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)** | Architecture complète |
| **[SYNTHESE_COMPLETE.md](./SYNTHESE_COMPLETE.md)** | Vue d'ensemble du projet |

### 🔧 Backend

| Document | Description |
|----------|-------------|
| **[backend/README.md](./backend/README.md)** | Vue d'ensemble backend |
| **[backend/docs/README.md](./backend/docs/README.md)** | Documentation API complète |
| **[backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md)** | SQLite → PostgreSQL |
| **[backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)** | Déploiement production |

### 🗺️ Navigation

| Document | Description |
|----------|-------------|
| **[INDEX_DOCUMENTATION.md](./INDEX_DOCUMENTATION.md)** | Index complet de la documentation |

---

## 🏗️ Architecture

```
┌─────────────────────────────┐
│   Frontend (Port 5173)      │
│   - React + Vite            │
│   - MapLibre GL             │
│   - Tailwind CSS            │
└─────────────┬───────────────┘
              │ HTTP/REST
              ↓
┌─────────────────────────────┐
│   Backend (Port 3001)       │
│   - Express.js              │
│   - Prisma ORM              │
│   - TypeScript              │
└─────────────┬───────────────┘
              │ SQL
              ↓
┌─────────────────────────────┐
│   Database                  │
│   - SQLite (dev)            │
│   - PostgreSQL (prod)       │
└─────────────────────────────┘
```

---

## 🔌 API REST

### Endpoints Configs

- `GET /api/configs` - Liste des configurations
- `GET /api/configs/:slug` - Configuration spécifique
- `POST /api/configs` - Créer une config
- `PUT /api/configs/:slug` - Modifier une config
- `DELETE /api/configs/:slug` - Supprimer une config

### Endpoints GeoJSON

- `GET /api/geojson` - Liste des fichiers GeoJSON
- `GET /api/geojson/:id` - Fichier par ID
- `GET /api/geojson/by-path/:path` - Fichier par chemin
- `POST /api/geojson` - Créer un fichier
- `PUT /api/geojson/:id` - Modifier un fichier
- `DELETE /api/geojson/:id` - Supprimer un fichier

**Documentation complète :** [backend/docs/README.md](./backend/docs/README.md)

---

## 🛠️ Scripts disponibles

### Backend

```bash
cd backend
npm run dev              # Serveur développement
npm run build            # Build production
npm start                # Démarrer en production
npm run seed             # Importer données depuis public/
npm run prisma:studio    # Interface DB graphique
npm run prisma:migrate:dev      # Créer migration
npm run migrate:sqlite-to-pg    # Migrer vers PostgreSQL
```

### Frontend

```bash
npm run dev              # Serveur développement
npm run build            # Build production
npm run preview          # Preview build
```

---

## 🗄️ Base de données

### Développement (SQLite)

La base de données `dev.db` est créée automatiquement dans `backend/`.

```bash
cd backend
npm run prisma:studio  # Interface graphique
```

### Production (PostgreSQL)

Voir [backend/docs/MIGRATION.md](./backend/docs/MIGRATION.md) pour migrer vers PostgreSQL.

---

## 🌐 Déploiement

### Backend

**Options recommandées :**
1. **Railway** - PostgreSQL + Node.js en un clic
2. **Render** - Alternative gratuite
3. **VPS** - Contrôle total (Ubuntu + PM2 + Nginx)

**Guide complet :** [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)

### Frontend

**Options recommandées :**
1. **Vercel** - Déploiement automatique depuis GitHub
2. **Netlify** - Alternative populaire
3. **CDN** - Pour grandes applications

**Configuration :** Ajouter `VITE_API_URL=https://votre-backend.com/api`

---

## 🔧 Configuration

### Backend (.env)

```env
DATABASE_URL=file:./dev.db
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api
```

---

## 📦 Technologies

### Frontend
- React 18
- TypeScript
- Vite
- MapLibre GL
- Tailwind CSS

### Backend
- Node.js 20+
- Express.js
- Prisma ORM
- TypeScript
- Zod (validation)

### Base de données
- SQLite (développement)
- PostgreSQL (production)

---

## 🐛 Troubleshooting

### Backend ne démarre pas

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run prisma:generate
rm -rf prisma/migrations
npx prisma migrate dev --name init
npm run seed
```

### Frontend ne se connecte pas à l'API

1. Vérifier que le backend tourne : `curl http://localhost:3001/health`
2. Vérifier `VITE_API_URL` dans `.env`
3. Vider le cache du navigateur (Ctrl+Shift+R)

### Erreur CORS

Vérifier `backend/.env` :
```env
FRONTEND_URL=http://localhost:5173
```

Redémarrer le backend.

### Base de données vide

```bash
cd backend
npm run seed
```

---

## 🎓 Apprendre

- **Première fois avec backend + BDD ?** → [COMMENT_CA_MARCHE.md](./COMMENT_CA_MARCHE.md)
- **Comprendre l'architecture ?** → [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
- **Déployer en prod ?** → [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

---

## 📄 License

MIT

---

## 📞 Support

En cas de problème :
1. Consulter [INDEX_DOCUMENTATION.md](./INDEX_DOCUMENTATION.md)
2. Vérifier les logs backend et frontend
3. Utiliser Prisma Studio pour vérifier les données

---

**Prêt à commencer ?** → [DEMARRAGE_RAPIDE.md](./DEMARRAGE_RAPIDE.md) 🚀
