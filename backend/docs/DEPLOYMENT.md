# Déploiement en Production

Ce guide explique comment déployer le backend MapLibre en production avec PostgreSQL.

**Important :** Le backend et le frontend sont **séparés** et peuvent être déployés sur des plateformes différentes.

## Architecture de production

```
Frontend (Vercel/Netlify/autre)
    ↓ HTTP/HTTPS
Backend API (Railway/Render/VPS)
    ↓ PostgreSQL
Database (Managed PostgreSQL)
```

## 🎯 Recommandations par cas d'usage

### Petit projet / Prototype
- **Backend :** Railway (gratuit)
- **Frontend :** Vercel (gratuit)
- **Database :** Railway PostgreSQL (inclus)

### Projet moyen
- **Backend :** Render ou VPS
- **Frontend :** Netlify ou Vercel
- **Database :** Supabase ou Neon

### Grande application
- **Backend :** VPS dédié
- **Frontend :** CDN (Vercel/Netlify)
- **Database :** PostgreSQL managé (AWS RDS, Digital Ocean)

---

## Option 1 : Railway (Recommandé - Facile)

### Prérequis
- Compte Vercel
- PostgreSQL (Vercel Postgres ou externe)

### 1. Installer Vercel CLI

```bash
npm i -g vercel
```

### 2. Configurer `vercel.json` dans le dossier backend

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Variables d'environnement

Dans le dashboard Vercel, ajoutez :

```
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://votre-app.vercel.app
```

### 4. Déployer

```bash
cd backend
vercel --prod
```

### 5. Exécuter les migrations

```bash
# Sur votre machine locale, connecté à la prod DB
DATABASE_URL="postgresql://..." npm run prisma:migrate:deploy
DATABASE_URL="postgresql://..." npm run seed
```

## Option 2 : Railway

Railway est parfait pour Node.js + PostgreSQL.

### 1. Créer un compte sur [Railway](https://railway.app/)

### 2. Créer un nouveau projet

- Cliquez sur "New Project"
- Sélectionnez "Deploy from GitHub repo"
- Choisissez votre repository

### 3. Ajouter PostgreSQL

- Cliquez sur "+ New"
- Sélectionnez "Database" → "PostgreSQL"
- Railway génère automatiquement `DATABASE_URL`

### 4. Configurer les variables d'environnement

Dans les settings du service backend :

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://votre-app.vercel.app
```

### 5. Configuration Railway

Créez `railway.json` dans le dossier backend :

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run prisma:migrate:deploy && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 6. Mettre à jour `package.json`

```json
{
  "scripts": {
    "build": "npm run prisma:generate && tsc",
    "start": "node dist/server.js",
    "deploy": "npm run prisma:migrate:deploy && npm start"
  }
}
```

Railway détectera automatiquement et déploiera.

## Option 3 : Render

### 1. Créer un compte sur [Render](https://render.com/)

### 2. Créer une base PostgreSQL

- Dashboard → "New" → "PostgreSQL"
- Choisissez le plan gratuit ou payant
- Notez l'URL de connexion

### 3. Créer un Web Service

- Dashboard → "New" → "Web Service"
- Connectez votre repo GitHub
- Configurez :

```yaml
Name: maplibre-backend
Environment: Node
Build Command: npm install && npm run build
Start Command: npm run prisma:migrate:deploy && npm start
```

### 4. Variables d'environnement

```
DATABASE_URL=postgresql://...
NODE_ENV=production
FRONTEND_URL=https://votre-app.com
```

## Option 4 : VPS (DigitalOcean, Linode, OVH, etc.)

### 1. Préparer le serveur

```bash
# Se connecter au serveur
ssh root@votre-ip

# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Installer PM2 (process manager)
sudo npm install -g pm2
```

### 2. Créer la base de données

```bash
sudo -u postgres psql
CREATE DATABASE maplibre;
CREATE USER maplibre_user WITH PASSWORD 'votre_password';
GRANT ALL PRIVILEGES ON DATABASE maplibre TO maplibre_user;
\q
```

### 3. Cloner et configurer le projet

```bash
# Cloner le repo
git clone https://github.com/votre-user/maplibre.git
cd maplibre/backend

# Installer les dépendances
npm install

# Créer .env
cat > .env << EOF
DATABASE_URL="postgresql://maplibre_user:votre_password@localhost:5432/maplibre"
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://votre-frontend.com
EOF

# Build
npm run build

# Migrations
npm run prisma:migrate:deploy
npm run seed
```

### 4. Démarrer avec PM2

```bash
# Démarrer l'application
pm2 start dist/server.js --name maplibre-api

# Sauvegarder la config PM2
pm2 save

# Démarrage automatique au boot
pm2 startup
```

### 5. Configurer Nginx (reverse proxy)

```bash
sudo apt install nginx

# Créer la config
sudo nano /etc/nginx/sites-available/maplibre-api
```

Contenu :

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/maplibre-api /etc/nginx/sites-enabled/

# Tester la config
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### 6. Configurer SSL avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.votre-domaine.com
```

## Configuration du Frontend

Mettez à jour le fichier `.env` du frontend :

```env
VITE_API_URL=https://api.votre-domaine.com/api
```

Ou pour Vercel, ajoutez dans les variables d'environnement :

```
VITE_API_URL=https://votre-backend.vercel.app/api
```

## Monitoring et logs

### PM2 (VPS)

```bash
# Voir les logs
pm2 logs maplibre-api

# Monitoring
pm2 monit

# Restart
pm2 restart maplibre-api
```

### Railway

Les logs sont disponibles dans le dashboard Railway.

### Vercel

```bash
vercel logs
```

## Sauvegarde automatique (PostgreSQL)

### Script de backup

Créez `/home/user/backup-db.sh` :

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"
mkdir -p $BACKUP_DIR

pg_dump -U maplibre_user maplibre -F c -f $BACKUP_DIR/backup_$DATE.dump

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "backup_*.dump" -mtime +7 -delete
```

### Cron job (tous les jours à 2h du matin)

```bash
crontab -e
```

Ajoutez :

```
0 2 * * * /home/user/backup-db.sh
```

## Scaling

### Horizontal scaling (plusieurs instances)

Si vous utilisez Railway/Render/Vercel, activez l'auto-scaling dans les settings.

### Connection pooling

Pour PostgreSQL avec beaucoup de connexions, utilisez PgBouncer :

```bash
sudo apt install pgbouncer
```

Configurez dans `schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

## Checklist de déploiement

- [ ] PostgreSQL configuré et accessible
- [ ] Variables d'environnement définies
- [ ] `schema.prisma` utilise "postgresql"
- [ ] Migrations appliquées (`prisma:migrate:deploy`)
- [ ] Données seedées
- [ ] Backend accessible via HTTPS
- [ ] CORS configuré avec l'URL du frontend
- [ ] Frontend configuré avec `VITE_API_URL`
- [ ] Tests API fonctionnels
- [ ] Monitoring configuré
- [ ] Backups automatiques configurés

## Troubleshooting

### "Cannot connect to database"

```bash
# Vérifier que PostgreSQL écoute
sudo netstat -plnt | grep 5432

# Vérifier les permissions
sudo -u postgres psql -c "\du"
```

### "CORS error"

Vérifiez que `FRONTEND_URL` dans `.env` correspond à l'URL de votre frontend.

### "Migration failed"

```bash
# Réinitialiser les migrations
npx prisma migrate reset --force

# Ré-appliquer
npm run prisma:migrate:deploy
```

## Support

Pour plus d'informations :
- [Prisma Docs](https://www.prisma.io/docs)
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)
