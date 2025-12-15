# Migration SQLite vers PostgreSQL

Ce guide explique comment migrer votre base de données SQLite de développement vers PostgreSQL pour la production.

## Prérequis

1. **PostgreSQL installé** : Installez PostgreSQL sur votre serveur ou utilisez un service cloud (Railway, Supabase, Neon, etc.)
2. **Base de données créée** : Créez une base de données PostgreSQL vide
3. **URL de connexion** : Obtenez l'URL de connexion PostgreSQL

## Étape 1 : Préparer PostgreSQL

### Installation locale (optionnelle)

#### Sur Ubuntu/Debian :
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Sur macOS avec Homebrew :
```bash
brew install postgresql
brew services start postgresql
```

### Créer la base de données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base et l'utilisateur
CREATE DATABASE maplibre;
CREATE USER maplibre_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE maplibre TO maplibre_user;
\q
```

## Étape 2 : Configurer l'environnement

### 1. Mettre à jour `.env`

Ajoutez votre URL PostgreSQL :

```env
# Development (SQLite)
# DATABASE_URL="file:./dev.db"

# Production (PostgreSQL) - DÉCOMMENTEZ CETTE LIGNE
DATABASE_URL="postgresql://maplibre_user:votre_mot_de_passe@localhost:5432/maplibre?schema=public"

# Si vous utilisez un service cloud :
# DATABASE_URL="postgresql://user:password@host.region.provider.com:5432/database"
```

### 2. Mettre à jour `schema.prisma`

Modifiez le provider dans `prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"  // Changez de "sqlite" à "postgresql"
  url      = env("DATABASE_URL")
}
```

## Étape 3 : Créer les tables PostgreSQL

```bash
# Générer le client Prisma pour PostgreSQL
npm run prisma:generate

# Créer les migrations
npm run prisma:migrate:dev
```

Cette commande va :
- Créer les tables dans PostgreSQL
- Générer les fichiers de migration
- Mettre à jour le client Prisma

## Étape 4 : Migrer les données

### Option A : Script automatique (recommandé)

Utilisez le script de migration fourni :

```bash
# 1. Assurez-vous que SQLite contient vos données
DATABASE_URL="file:./dev.db" npm run seed

# 2. Configurez PostgreSQL dans .env (voir Étape 2)

# 3. Exécutez le script de migration
POSTGRES_URL="postgresql://user:password@host:5432/database" npm run migrate:sqlite-to-pg
```

Le script va :
1. Lire toutes les données de SQLite
2. Les transférer vers PostgreSQL
3. Afficher un résumé

### Option B : Export/Import manuel

#### 1. Exporter depuis SQLite

```bash
# Exporter les configs
sqlite3 dev.db <<EOF
.mode json
.output configs.json
SELECT * FROM configs;
.quit
EOF

# Exporter les geojson
sqlite3 dev.db <<EOF
.mode json
.output geojson.json
SELECT * FROM geojson;
.quit
EOF
```

#### 2. Importer vers PostgreSQL

Utilisez un script Node.js ou l'API REST pour réimporter les données.

### Option C : Re-seed depuis les fichiers

Si vous avez toujours les fichiers dans `public/` :

```bash
# Avec PostgreSQL configuré dans .env
npm run seed
```

## Étape 5 : Vérification

### 1. Vérifier la connexion

```bash
npm run prisma:studio
```

Ouvrez `http://localhost:5555` et vérifiez que les données sont présentes.

### 2. Tester l'API

```bash
# Démarrer le serveur
npm run dev

# Tester les endpoints
curl http://localhost:3001/api/configs
curl http://localhost:3001/api/geojson
```

## Différences SQLite vs PostgreSQL

### Types de données

| SQLite      | PostgreSQL    |
|-------------|---------------|
| TEXT        | TEXT          |
| INTEGER     | INTEGER       |
| REAL        | DOUBLE PRECISION |

Prisma gère automatiquement ces conversions.

### Syntaxe SQL

PostgreSQL est plus strict que SQLite :

- **Sensibilité à la casse** : PostgreSQL traite différemment majuscules/minuscules dans les noms de colonnes
- **Guillemets** : Utilisez des guillemets doubles pour les identifiants : `"createdAt"`
- **Transactions** : PostgreSQL supporte les transactions complètes (BEGIN/COMMIT/ROLLBACK)

### Performance

- **SQLite** : Parfait pour le développement, petites applications
- **PostgreSQL** : Optimisé pour la production, supporte les connexions concurrentes

## Problèmes courants

### Erreur : "Connection refused"

**Solution :** Vérifiez que PostgreSQL est démarré :

```bash
# Ubuntu/Debian
sudo systemctl status postgresql

# macOS
brew services list
```

### Erreur : "password authentication failed"

**Solution :** Vérifiez vos identifiants dans `.env` et les permissions PostgreSQL.

### Erreur : "relation already exists"

**Solution :** Supprimez les migrations existantes et recommencez :

```bash
rm -rf prisma/migrations/
npm run prisma:migrate:dev
```

## Services PostgreSQL cloud recommandés

### 1. **Railway** (gratuit jusqu'à 500h/mois)
- URL : https://railway.app/
- Setup facile, PostgreSQL en 1 clic

### 2. **Supabase** (gratuit jusqu'à 500MB)
- URL : https://supabase.com/
- Inclut dashboard, API REST auto-générée

### 3. **Neon** (gratuit jusqu'à 3GB)
- URL : https://neon.tech/
- Serverless PostgreSQL, très rapide

### 4. **Vercel Postgres** (intégré avec Vercel)
- URL : https://vercel.com/storage/postgres
- Parfait si vous déployez sur Vercel

## Configuration multi-environnements

Utilisez différents fichiers `.env` :

### `.env.development`
```env
DATABASE_URL="file:./dev.db"
```

### `.env.production`
```env
DATABASE_URL="postgresql://user:password@prod-host:5432/database"
```

Dans `package.json` :

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx watch src/server.ts",
    "start": "NODE_ENV=production node dist/server.js"
  }
}
```

## Backup et restauration

### Backup PostgreSQL

```bash
pg_dump -U maplibre_user -d maplibre -F c -f backup.dump
```

### Restauration PostgreSQL

```bash
pg_restore -U maplibre_user -d maplibre -c backup.dump
```

## Prochaines étapes

- Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour déployer en production
- Configurer des backups automatiques
- Optimiser les index pour de meilleures performances
