# Guide Complet : Déployer le Backend de zéro (Avec toutes les galères rencontrées !)

## 📋 Table des matières
1. [Prérequis](#prérequis)
2. [Étape 1 : Préparer le serveur](#étape-1--préparer-le-serveur)
3. [Étape 2 : Configurer PostgreSQL](#étape-2--configurer-postgresql)
4. [Étape 3 : Cloner et préparer le code](#étape-3--cloner-et-préparer-le-code)
5. [Étape 4 : Les galères et solutions](#étape-4--les-galères-et-solutions)
6. [Étape 5 : Configurer PM2](#étape-5--configurer-pm2)
7. [Étape 6 : Configurer Nginx](#étape-6--configurer-nginx)
8. [Étape 7 : Configurer HTTPS](#étape-7--configurer-https)
9. [Étape 8 : Configurer le firewall](#étape-8--configurer-le-firewall)
10. [Étape 9 : Connecter Vercel](#étape-9--connecter-vercel)

---

## Prérequis

- Un serveur Linux (Ubuntu 22.04 LTS recommandé)
- Accès SSH au serveur
- Node.js 18+ installé
- npm installé
- PostgreSQL installé
- Un domaine (optionnel mais recommandé)

---

## Étape 1 : Préparer le serveur

### Installation de Node.js et npm

```bash
# Ajouter le repository NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js et npm
sudo apt update
sudo apt install -y nodejs

# Vérifier les versions
node --version  # v20.x.x
npm --version   # 11.x.x
```

---

## Étape 2 : Configurer PostgreSQL

### Installation

```bash
# Installer PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Vérifier qu'il tourne
sudo systemctl status postgresql

# Créer la base de données et l'utilisateur
sudo -u postgres psql

# Dans psql, exécutez :
CREATE DATABASE maplibre_prod;
CREATE USER maplibre_user WITH PASSWORD 'votre_mot_de_passe_fort';
ALTER ROLE maplibre_user SET client_encoding TO 'utf8';
ALTER ROLE maplibre_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE maplibre_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE maplibre_prod TO maplibre_user;
\q

# Tester la connexion
psql -U maplibre_user -d maplibre_prod -c "SELECT 1;"
```

### Configuration de PostgreSQL pour l'accès externe (si nécessaire)

```bash
# Éditer la config (optionnel)
sudo nano /etc/postgresql/14/main/postgresql.conf

# Chercher "listen_addresses" et remplacer par :
# listen_addresses = 'localhost'

# Puis éditer pg_hba.conf pour l'authentification
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

---

## Étape 3 : Cloner et préparer le code

### Cloner le repository

```bash
# Créer le dossier d'apps
mkdir -p ~/apps
cd ~/apps

# Cloner le repository
git clone https://github.com/Sauroyn/ClassefinderMaplibre.git
cd ClassefinderMaplibre/backend

# Checkout la branche de production
git checkout locationlock
```

### Créer le fichier `.env`

```bash
nano .env
```

**Contenu du `.env` :**

```env
# Database
DATABASE_URL="postgresql://maplibre_user:votre_mot_de_passe_fort@localhost:5432/maplibre_prod?schema=public"

# Server
PORT=3001
NODE_ENV=production

# Frontend (remplacer par votre domaine ou IP)
FRONTEND_URL=https://classefinderbd.duckdns.org
```

### Installer les dépendances

```bash
npm install --production=false
```

---

## Étape 4 : Les galères et solutions

### 🚨 Galère #1 : Erreurs TypeScript au build

**Problème :**
```
error TS7053: Element implicitly has an 'any' type because expression of type '0' 
can't be used to index type '{}'.
```

**Cause :** Le code TypeScript strict rejetait les types `any`.

**Solution :**
```typescript
// ❌ Avant (génère l'erreur)
const path = req.params[0];

// ✅ Après (castage correct)
const path = (req.params as any)[0] as string;
```

---

### 🚨 Galère #2 : Dépendances peer incompatibles

**Problème :**
```
npm warn ERESOLVE overriding peer dependency
npm warn peer react@"^16.8.0 || 17.x" from @reach/portal@0.13.2
```

**Cause :** `react-spring-bottom-sheet` dépend d'une vieille version de React.

**Solution :** Ajouter les `overrides` dans `frontend/package.json` :
```json
"overrides": {
  "@reach/portal": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "@xstate/react": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

---

### 🚨 Galère #3 : Migration SQLite → PostgreSQL

**Problème :**
```
error: Error validating datasource `db`: the URL must start with the protocol `file:`.
ERROR: type "datetime" does not exist
```

**Cause :** Les migrations SQLite n'étaient pas compatibles avec PostgreSQL.

**Solutions :**

1. **Changer le provider Prisma** (`backend/prisma/schema.prisma`) :
```prisma
datasource db {
  provider = "postgresql"  // ← Changé de "sqlite"
  url      = env("DATABASE_URL")
}
```

2. **Mettre à jour le migration_lock.toml** :
```toml
provider = "postgresql"  # ← Au lieu de "sqlite"
```

3. **Convertir la migration SQLite → PostgreSQL** (`backend/prisma/migrations/20251202181220_init/migration.sql`) :
```sql
-- ❌ Avant (SQLite)
CREATE TABLE "configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
);

-- ✅ Après (PostgreSQL)
CREATE TABLE "configs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "configs_pkey" PRIMARY KEY ("id")
);
```

4. **Résoudre les migrations échouées** :
```bash
npx prisma migrate resolve --rolled-back "20251202181220_init"
npm run prisma:migrate:deploy
```

---

### 🚨 Galère #4 : Seed échoue (répertoires non trouvés)

**Problème :**
```
Error: ENOENT: no such file or directory, scandir '/home/ubuntu/apps/ClassefinderMaplibre/public/configs'
```

**Cause :** Le script seed cherchait les fichiers dans le mauvais répertoire.

**Solution :** Rendre le seed script résilient :
```typescript
let publicDir = path.join(__dirname, '../../../public');

// Si pas trouvé, chercher dans frontend/public
if (!existsSync(publicDir)) {
  publicDir = path.join(__dirname, '../../../frontend/public');
}

// Si toujours pas trouvé, skip gracefully
if (!existsSync(publicDir)) {
  console.log('⚠️  Public directory not found. Skipping automatic seed.');
  return;
}
```

---

### 🚨 Galère #5 : Firewall bloque tout (Oracle Cloud)

**Problème :**
```
curl http://158.178.207.215/api/configs
# Timeout, aucune réponse
```

**Cause :** Oracle Cloud a un firewall réseau **ET** iptables. Les règles UFW étaient inefficaces car rejetées par iptables avant.

**Solution :**

1. **Afficher les règles iptables** :
```bash
sudo iptables -L INPUT -n -v --line-numbers
```

Vous verrez une ligne comme :
```
5253  286K REJECT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            reject-with icmp-host-prohibited
```

2. **Insérer les règles AVANT le REJECT** :
```bash
# Les règles doivent être insérer à la ligne 5 (avant le REJECT)
sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 3001 -j ACCEPT
```

3. **Sauvegarder les règles** :
```bash
sudo netfilter-persistent save
```

4. **UFW pour les règles supplémentaires** :
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
```

---

### 🚨 Galère #6 : DuckDNS + Let's Encrypt ne fonctionne pas

**Problème :**
```
DNS problem: query timed out looking up A for classefinderbd.duckdns.org
```

**Cause :** Let's Encrypt n'arrive pas à vérifier le domaine DuckDNS (problème de propagation DNS).

**Solution :** Utiliser un certificat auto-signé temporairement :
```bash
# Créer le certificat
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/private.key \
  -out /etc/nginx/ssl/certificate.crt \
  -subj "/CN=classefinderbd.duckdns.org"
```

Plus tard, quand le DNS sera stable, upgrader vers Let's Encrypt.

---

## Étape 5 : Configurer PM2

### Installation et démarrage

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Démarrer l'application
cd ~/apps/ClassefinderMaplibre/backend
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
pm2 start dist/server.js --name maplibre-backend

# Configurer le démarrage automatique
pm2 startup
# ⚠️ Copier-coller la commande que PM2 affiche
pm2 save

# Vérifier que ça tourne
pm2 status
pm2 logs maplibre-backend
```

### Commandes utiles PM2

```bash
# Voir les logs
pm2 logs maplibre-backend --lines 50

# Redémarrer
pm2 restart maplibre-backend

# Arrêter
pm2 stop maplibre-backend

# Relancer
pm2 start maplibre-backend

# Supprimer
pm2 delete maplibre-backend
```

---

## Étape 6 : Configurer Nginx

### Installation

```bash
sudo apt install -y nginx
```

### Configuration

```bash
# Éditer la configuration
sudo nano /etc/nginx/sites-available/maplibre-backend
```

**Contenu (pour HTTP → HTTPS redirect)** :

```nginx
# Redirection HTTP -> HTTPS
server {
    listen 80;
    server_name classefinderbd.duckdns.org;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name classefinderbd.duckdns.org;

    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Activation

```bash
# Créer le lien symbolique
sudo ln -sf /etc/nginx/sites-available/maplibre-backend /etc/nginx/sites-enabled/

# Supprimer le site par défaut
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Vérifier
sudo systemctl status nginx
```

---

## Étape 7 : Configurer HTTPS

### Option 1 : Certificat auto-signé (Rapide, sans validation DNS)

```bash
# Créer le dossier SSL
sudo mkdir -p /etc/nginx/ssl

# Générer le certificat
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/private.key \
  -out /etc/nginx/ssl/certificate.crt \
  -subj "/CN=classefinderbd.duckdns.org"

# Vérifier
ls -la /etc/nginx/ssl/
```

### Option 2 : Let's Encrypt (Quand le DNS sera stable)

```bash
# Arrêter Nginx
sudo systemctl stop nginx

# Obtenir le certificat
sudo certbot certonly --standalone -d classefinderbd.duckdns.org \
  --email votre-email@example.com \
  --agree-tos \
  --non-interactive

# Redémarrer
sudo systemctl start nginx

# Mettre à jour Nginx pour utiliser Let's Encrypt
sudo nano /etc/nginx/sites-available/maplibre-backend
# Remplacer les chemins SSL par :
# ssl_certificate /etc/letsencrypt/live/classefinderbd.duckdns.org/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/classefinderbd.duckdns.org/privkey.pem;

sudo nginx -t
sudo systemctl reload nginx
```

---

## Étape 8 : Configurer le firewall

### UFW (Uncomplicated Firewall)

```bash
# Autoriser SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### iptables (Oracle Cloud - IMPORTANT !)

```bash
# Vérifier les règles
sudo iptables -L INPUT -n -v --line-numbers

# Insérer les règles AVANT le REJECT (généralement à la ligne 5)
sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 3001 -j ACCEPT

# Sauvegarder
sudo netfilter-persistent save

# Vérifier les ports ouverts
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :3001
```

---

## Étape 9 : Connecter Vercel

### Ajouter la variable d'environnement

1. Allez sur https://vercel.com
2. Sélectionnez votre projet
3. **Settings** → **Environment Variables**
4. Ajoutez :
   - **Name:** `VITE_API_URL`
   - **Value:** `https://classefinderbd.duckdns.org`
   - **Environment:** Sélectionnez Production, Preview, Development
5. **Save**

### Redéployer le frontend

1. Allez dans **Deployments**
2. Cliquez sur les 3 points du dernier déploiement
3. Cliquez sur **Redeploy**

---

## ✅ Checklist finale

- [ ] Node.js 20.x installé
- [ ] PostgreSQL 14+ configuré avec la base `maplibre_prod`
- [ ] Code cloné et `.env` configuré
- [ ] `npm install` exécuté
- [ ] `npm run build` fonctionne sans erreurs
- [ ] `npm run prisma:migrate:deploy` applique les migrations
- [ ] PM2 démarre le backend avec `pm2 start dist/server.js`
- [ ] PM2 configuré pour démarrer au boot
- [ ] Nginx configuré et fonctionne
- [ ] Certificat SSL généré (auto-signé ou Let's Encrypt)
- [ ] Firewall (UFW + iptables) configuré
- [ ] `curl https://classefinderbd.duckdns.org/api/configs` fonctionne
- [ ] Variable `VITE_API_URL` ajoutée sur Vercel
- [ ] Frontend redéployé et fonctionne

---

## 🆘 Dépannage rapide

### L'API ne répond pas

```bash
# 1. Vérifier que PM2 tourne
pm2 status
pm2 logs maplibre-backend

# 2. Vérifier que le port 3001 écoute
sudo netstat -tlnp | grep 3001

# 3. Redémarrer
pm2 restart maplibre-backend
```

### Nginx affiche 404

```bash
# 1. Tester la config
sudo nginx -t

# 2. Vérifier les logs
sudo tail -f /var/log/nginx/error.log

# 3. Redémarrer
sudo systemctl restart nginx
```

### Pas d'accès depuis l'extérieur

```bash
# 1. Vérifier les ports ouverts
sudo netstat -tlnp

# 2. Vérifier iptables
sudo iptables -L INPUT -n

# 3. Vérifier UFW
sudo ufw status

# 4. Tester en local
curl http://localhost/api/configs
curl http://localhost:3001/api/configs
```

---

## 📚 Fichiers importants

| Fichier | Localisation | Description |
|---------|-------------|-------------|
| `.env` | `~/apps/ClassefinderMaplibre/backend/.env` | Variables d'environnement (DATABASE_URL, PORT, etc.) |
| `schema.prisma` | `~/apps/ClassefinderMaplibre/backend/prisma/schema.prisma` | Schéma de la base de données |
| Migrations | `~/apps/ClassefinderMaplibre/backend/prisma/migrations/` | Historique des modifications DB |
| Nginx config | `/etc/nginx/sites-available/maplibre-backend` | Configuration du reverse proxy |
| SSL certificats | `/etc/nginx/ssl/` | Certificats SSL (auto-signé) |
| PM2 config | `~/.pm2/dump.pm2` | Sauvegarde de la config PM2 |

---

## 🚀 Prochaines étapes

Une fois que tout fonctionne, consultez le fichier `BACKEND_UPDATES.md` pour apprendre à :
- Ajouter des migrations sans perdre les données
- Mettre à jour le code en production
- Gérer les versions du backend
