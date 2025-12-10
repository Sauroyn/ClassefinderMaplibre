# 🎯 Configuration initiale - 5 minutes

Suivi des 5 premières minutes après avoir cloné le projet.

## Étape 1 : Vérifier les prérequis (1 minute)

```bash
# Vérifiez que vous avez Node.js 18+
node --version    # Doit être v18 ou plus
npm --version     # Doit être 9+

# Si pas Node.js : https://nodejs.org/
```

## Étape 2 : Configurer Frontend (1 minute)

À la **racine** du projet :

```bash
# Créez le fichier .env.local
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001/api
EOF

# Vérifiez
cat .env.local
```

## Étape 3 : Configurer Backend (1 minute)

Dans le **dossier `backend/`** :

```bash
cd backend

# Créez le fichier .env
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
FRONTEND_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
EOF

# Vérifiez
cat .env

cd ..
```

## Étape 4 : Installer dépendances (1-2 minutes)

```bash
# Frontend
npm install

# Backend
cd backend && npm install && cd ..
```

## Étape 5 : Créer la base de données (1 minute)

```bash
cd backend

# Ceci crée prisma/dev.db
npm run prisma:migrate:dev
# Vous verrez : "Enter name of migration ?"
# Tapez : init
# Puis attendez...

cd ..
```

**Félicitations !** La BD est créée. 🎉

---

## ✅ Vérification

Vous devriez voir :

```bash
# Vérifier les fichiers
ls -la .env.local          # Doit exister
ls -la backend/.env        # Doit exister
ls -la backend/prisma/dev.db  # Doit exister

# Si tout existe → vous êtes prêt ! ✅
```

---

## 🚀 Prochaine étape

Allez à [QUICK_START.md](./QUICK_START.md#lancer-en-développement) pour lancer l'app.

```bash
# Terminal 1 : Frontend
npm run dev
# → http://localhost:5173

# Terminal 2 : Backend
cd backend && npm run dev
# → http://localhost:3001
```

---

## 🆘 Si ça ne marche pas

### Erreur : "node: command not found"
→ Installez Node.js depuis https://nodejs.org/

### Erreur : "EACCES" permissions
```bash
npm config set prefix '/usr/local'
```

### Erreur : "port already in use"
```bash
# Backend sur port 3001 ?
lsof -i :3001  # Tuer le processus si besoin
```

### Autres erreurs
Voir [DEPLOYMENT_GUIDE.md#débogage-et-dépannage](./DEPLOYMENT_GUIDE.md#débogage-et-dépannage)

---

**Vous êtes configuré ! Allez à [START_HERE.md](./START_HERE.md) pour choisir votre prochain guide.** 🚀
