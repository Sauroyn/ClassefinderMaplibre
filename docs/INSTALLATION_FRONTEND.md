# 🎨 Frontend - Guide d'Installation et Configuration

Ce guide est **uniquement pour le frontend**. Le backend doit être installé et fonctionnel avant (voir [INSTALLATION_BACKEND.md](./INSTALLATION_BACKEND.md)).

---

## 📋 Prérequis

- ✅ **Backend installé et démarré** (voir [INSTALLATION_BACKEND.md](./INSTALLATION_BACKEND.md))
- ✅ Backend accessible sur http://localhost:3001
- Node.js 18+ installé
- npm ou yarn

---

## 🚀 Installation du Frontend

### Étape 1 : Retour au dossier racine

Si vous étiez dans `backend/`, retournez à la racine :

```bash
cd ..
```

Vous devez être dans le dossier principal du projet :
```
maplibreglgeojson/
├── backend/
├── src/
├── public/
└── package.json
```

---

### Étape 2 : Installer les dépendances

```bash
npm install
```

**Attendu :**
```
audited 353 packages in 2s
```

---

### Étape 3 : Configurer l'URL du backend

**Créer le fichier `.env` à la racine du projet :**

```bash
echo "VITE_API_URL=http://localhost:3001/api" > .env
```

**Ou créer manuellement** le fichier `.env` avec :
```env
VITE_API_URL=http://localhost:3001/api
```

**⚠️ Important :** 
- Si le backend tourne sur un autre port, mettez à jour cette URL
- Si vous déployez, changez pour l'URL de production

---

### Étape 4 : Démarrer le frontend

```bash
npm run dev
```

**Attendu :**
```
VITE v7.1.5  ready in 435 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## ✅ Vérifier que ça fonctionne

### 1. Ouvrir le navigateur

Aller sur **http://localhost:5173**

### 2. Ouvrir la console développeur

**F12** ou **Clic droit → Inspecter → Console**

### 3. Vérifier qu'il n'y a pas d'erreurs CORS

**Bon signe :**
```
✅ Aucune erreur rouge
✅ Les requêtes vers localhost:3001 fonctionnent
```

**Mauvais signe (erreur CORS) :**
```
❌ Access to fetch at 'http://localhost:3001/api/configs' from origin 'http://localhost:5173' 
   has been blocked by CORS policy
```

**Solution :** Vérifier que le backend `.env` a bien :
```env
FRONTEND_URL=http://localhost:5173
```

### 4. Tester le sélecteur de config

1. Le sélecteur de config doit afficher vos configs
2. Sélectionner une config (ex: "Le Mans univ")
3. La carte doit se charger et afficher les bâtiments

---

## 🐛 Problèmes fréquents

### Erreur CORS dans la console

**Symptôme :**
```
Access to fetch at 'http://localhost:3001/api/configs' has been blocked by CORS
```

**Cause :** Le backend n'accepte pas les requêtes du frontend.

**Solution :**
1. Vérifier `backend/.env` :
   ```env
   FRONTEND_URL=http://localhost:5173
   ```
2. Redémarrer le backend :
   ```bash
   cd backend
   npm run dev
   ```

---

### Erreur : "Failed to fetch"

**Symptôme :**
```
TypeError: Failed to fetch
```

**Cause :** Le backend ne tourne pas.

**Solution :**
```bash
# Vérifier que le backend tourne
curl http://localhost:3001/health

# Si erreur, démarrer le backend
cd backend
npm run dev
```

---

### Le sélecteur de config est vide

**Symptôme :** Le menu déroulant n'affiche aucune config.

**Causes possibles :**

1. **Backend pas démarré**
   ```bash
   curl http://localhost:3001/api/configs
   ```

2. **Base de données vide**
   ```bash
   cd backend
   npm run seed
   ```

3. **URL API incorrecte**
   Vérifier `.env` à la racine :
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

---

### Erreur : "chrome is not defined"

**Symptôme :**
```
Uncaught ReferenceError: chrome is not defined
```

**Cause :** Code résiduel ou extension navigateur.

**Solution :**
1. Vider le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
2. Essayer en navigation privée
3. Vérifier qu'il n'y a pas d'extension qui interfère

**Note :** Cette erreur n'affecte normalement pas le fonctionnement de l'app.

---

### Le frontend charge les anciens fichiers statiques

**Symptôme :** Les données ne viennent pas de l'API.

**Solution :**
1. Vider le cache (Ctrl+Shift+R)
2. Vérifier que `VITE_API_URL` est défini dans `.env`
3. Redémarrer le serveur Vite :
   ```bash
   npm run dev
   ```

---

## 🔧 Configuration

### Changer le port du frontend

Par défaut, Vite utilise le port 5173. Pour changer :

```bash
# Dans package.json, modifier le script dev
"dev": "vite --port 3000"
```

Ou créer `vite.config.ts` :
```typescript
export default {
  server: {
    port: 3000
  }
}
```

### Changer l'URL de l'API

**Développement :**
```env
# .env
VITE_API_URL=http://localhost:3001/api
```

**Production :**
```env
# .env.production
VITE_API_URL=https://api.votre-domaine.com/api
```

---

## 📦 Commandes utiles

```bash
# Développement
npm run dev              # Serveur dev
npm run build            # Build production
npm run preview          # Preview du build

# Maintenance
npm install              # Réinstaller dépendances
rm -rf node_modules      # Nettoyer
npm install              # Réinstaller
```

---

## 🌐 Déploiement

### Pour Vercel

1. Créer compte sur [vercel.com](https://vercel.com)
2. Connecter le repo GitHub
3. Ajouter variable d'environnement :
   ```
   VITE_API_URL=https://votre-backend.railway.app/api
   ```
4. Déployer

### Pour Netlify

1. Créer compte sur [netlify.com](https://netlify.com)
2. Connecter le repo
3. Configurer :
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Ajouter variable :
   ```
   VITE_API_URL=https://votre-backend.railway.app/api
   ```

---

## ✅ Checklist frontend

- [ ] Backend installé et démarré sur http://localhost:3001
- [ ] `cd` vers la racine du projet
- [ ] `npm install`
- [ ] `echo "VITE_API_URL=http://localhost:3001/api" > .env`
- [ ] `npm run dev`
- [ ] Ouvrir http://localhost:5173
- [ ] Pas d'erreurs CORS dans la console
- [ ] Sélecteur de config fonctionne
- [ ] Carte se charge correctement

**Frontend prêt !** 🎉

---

## 📊 Architecture finale

```
┌─────────────────────────────┐
│   Frontend (Port 5173)      │
│   - React + Vite            │
│   - MapLibre GL             │
└─────────────┬───────────────┘
              │ HTTP
              ↓
┌─────────────────────────────┐
│   Backend (Port 3001)       │
│   - Express API             │
│   - Prisma ORM              │
└─────────────┬───────────────┘
              │ SQL
              ↓
┌─────────────────────────────┐
│   SQLite Database           │
│   - configs                 │
│   - geojson                 │
└─────────────────────────────┘
```

---

## 🔗 Liens utiles

- **Backend :** [INSTALLATION_BACKEND.md](./INSTALLATION_BACKEND.md)
- **Architecture :** [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
- **API Docs :** [backend/docs/README.md](./backend/docs/README.md)
- **Déploiement :** [backend/docs/DEPLOYMENT.md](./backend/docs/DEPLOYMENT.md)

---

**Tout fonctionne ?** Bravo ! 🎉 Vous pouvez maintenant développer votre application.
