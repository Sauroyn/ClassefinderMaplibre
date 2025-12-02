# MapLibre Backend API

Backend Node.js + Express + Prisma pour l'application MapLibre GeoJSON.

## 🚀 Démarrage rapide

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
npm run dev
```

Server: `http://localhost:3001`

## 📚 Documentation

- **[Quick Start](./docs/QUICKSTART.md)** - Installation en 5 minutes
- **[README](./docs/README.md)** - Documentation API complète
- **[MIGRATION](./docs/MIGRATION.md)** - Migration SQLite → PostgreSQL
- **[DEPLOYMENT](./docs/DEPLOYMENT.md)** - Déploiement en production

## 🗄️ Base de données

- **Développement :** SQLite (`dev.db`)
- **Production :** PostgreSQL

### Modèles

#### Configs
Stocke les fichiers de configuration JSON.

#### GeoJSON
Stocke les fichiers GeoJSON des bâtiments.

## 🔌 API Endpoints

### Configs
- `GET /api/configs` - Liste des configurations
- `GET /api/configs/:slug` - Configuration spécifique
- `POST /api/configs` - Créer une config
- `PUT /api/configs/:slug` - Modifier une config
- `DELETE /api/configs/:slug` - Supprimer une config

### GeoJSON
- `GET /api/geojson` - Liste des fichiers
- `GET /api/geojson/:id` - Fichier par ID
- `GET /api/geojson/by-path/:path` - Fichier par chemin
- `POST /api/geojson` - Créer un fichier
- `PUT /api/geojson/:id` - Modifier un fichier
- `DELETE /api/geojson/:id` - Supprimer un fichier

## 🛠️ Scripts

```bash
npm run dev                    # Serveur développement
npm run build                  # Build TypeScript
npm start                      # Production
npm run prisma:studio          # Interface DB
npm run seed                   # Importer données
npm run migrate:sqlite-to-pg   # Migrer vers PostgreSQL
```

## 🌐 Variables d'environnement

```env
DATABASE_URL=file:./dev.db
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 📦 Stack technique

- **Runtime :** Node.js 20+
- **Framework :** Express.js
- **ORM :** Prisma
- **Database :** SQLite (dev) / PostgreSQL (prod)
- **Language :** TypeScript
- **Validation :** Zod

## 🔐 Sécurité

- Helmet.js pour les headers HTTP
- CORS configuré
- Validation des données avec Zod
- Variables d'environnement sécurisées

## 📊 Monitoring

```bash
# Logs en développement
npm run dev

# Prisma Studio (interface graphique)
npm run prisma:studio
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

## 📄 License

MIT
