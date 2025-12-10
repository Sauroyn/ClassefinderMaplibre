# 🔄 Comment ça fonctionne - Backend MapLibre

## 🎯 Vue d'ensemble simplifiée

```
┌─────────────────────────────────────────────────┐
│  1. L'utilisateur ouvre l'application          │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  2. Le frontend (React) se charge               │
│     - Demande la liste des configs à l'API     │
│     - Affiche le sélecteur                      │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  3. L'utilisateur sélectionne une config       │
│     (ex: "Le Mans univ")                        │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  4. Le frontend demande la config à l'API      │
│     GET /api/configs/le-mans-univ               │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  5. Le backend (Express) traite la requête     │
│     - Prisma interroge la base de données      │
│     - Récupère la config                        │
│     - Renvoie le JSON                           │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  6. Le frontend reçoit la config               │
│     - Extrait la liste des fichiers GeoJSON    │
│     - Demande chaque fichier à l'API           │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  7. Le backend renvoie les GeoJSON             │
│     GET /api/geojson/by-path/LeMansUniv/...    │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  8. Le frontend affiche la carte               │
│     - MapLibre charge les données              │
│     - Affiche les bâtiments                     │
└─────────────────────────────────────────────────┘
```

---

## 📊 Flux de données détaillé

### Étape 1 : Chargement de l'application

**Frontend** (`src/components/ConfigSelector.tsx`)
```typescript
// Au montage du composant
useEffect(() => {
  const loadConfigs = async () => {
    const configs = await configsAPI.list()
    setFiles(configs.map(c => c.slug).sort())
  }
  loadConfigs()
}, [])
```

**API Request**
```http
GET http://localhost:3001/api/configs
```

**Backend** (`backend/src/routes/configs.ts`)
```typescript
router.get('/', async (req, res, next) => {
  const configs = await prisma.config.findMany({
    select: { id, name, slug, createdAt, updatedAt }
  })
  res.json(configs)
})
```

**Database Query** (Prisma)
```sql
SELECT id, name, slug, createdAt, updatedAt 
FROM configs 
ORDER BY name ASC
```

**Response**
```json
[
  {
    "id": "clxxx",
    "name": "Le Mans univ",
    "slug": "le-mans-univ",
    "createdAt": "2025-12-02T10:00:00Z",
    "updatedAt": "2025-12-02T10:00:00Z"
  }
]
```

---

### Étape 2 : Sélection d'une config

**Frontend** (`src/hooks/useConfigData.ts`)
```typescript
// Quand l'utilisateur sélectionne une config
const configData = await configsAPI.get('le-mans-univ')
parsedConfig = configData.data
```

**API Request**
```http
GET http://localhost:3001/api/configs/le-mans-univ
```

**Backend** (`backend/src/routes/configs.ts`)
```typescript
router.get('/:slug', async (req, res, next) => {
  const config = await prisma.config.findUnique({
    where: { slug: req.params.slug }
  })
  res.json({
    ...config,
    data: JSON.parse(config.data) // Parse le JSON
  })
})
```

**Response**
```json
{
  "id": "clxxx",
  "name": "Le Mans univ",
  "slug": "le-mans-univ",
  "data": {
    "buildings": [
      {
        "id": "esgt",
        "label": "ESGT",
        "geojson": "LeMansUniv/ESGT.geojson"
      }
    ]
  }
}
```

---

### Étape 3 : Chargement des GeoJSON

**Frontend** (`src/hooks/useConfigData.ts`)
```typescript
// Pour chaque bâtiment dans la config
const geojsonData = await geojsonAPI.getByPath('LeMansUniv/ESGT.geojson')
const fc = ensureFeatureCollection(geojsonData.data)
```

**API Request**
```http
GET http://localhost:3001/api/geojson/by-path/LeMansUniv/ESGT.geojson
```

**Backend** (`backend/src/routes/geojson.ts`)
```typescript
router.get('/by-path/*', async (req, res, next) => {
  const path = req.params[0]
  const geojson = await prisma.geoJSON.findUnique({
    where: { path }
  })
  res.json({
    ...geojson,
    data: JSON.parse(geojson.data) // Parse le GeoJSON
  })
})
```

**Response**
```json
{
  "id": "clyyy",
  "path": "LeMansUniv/ESGT.geojson",
  "name": "ESGT",
  "folder": "LeMansUniv",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [...] },
        "properties": { "name": "Bureau", "level": "0" }
      }
    ]
  }
}
```

---

## 🗄️ Comment les données sont stockées

### Dans la base de données (SQLite)

**Table `configs`**
```
┌─────────┬──────────────┬───────────────┬────────────────┬─────────────┐
│   id    │    name      │     slug      │      data      │  createdAt  │
├─────────┼──────────────┼───────────────┼────────────────┼─────────────┤
│ clxxx   │ Le Mans univ │ le-mans-univ  │ {"buildings... │ 2025-12-02  │
│ clyyy   │ Paris        │ paris         │ {"buildings... │ 2025-12-02  │
└─────────┴──────────────┴───────────────┴────────────────┴─────────────┘
```

**Table `geojson`**
```
┌─────────┬──────────────────────────┬──────┬─────────────┬─────────────────┐
│   id    │         path             │ name │   folder    │      data       │
├─────────┼──────────────────────────┼──────┼─────────────┼─────────────────┤
│ clzzz   │ LeMansUniv/ESGT.geojson  │ ESGT │ LeMansUniv  │ {"type":"Feat.. │
│ claaa   │ LeMansUniv/IRA.geojson   │ IRA  │ LeMansUniv  │ {"type":"Feat.. │
└─────────┴──────────────────────────┴──────┴─────────────┴─────────────────┘
```

### Depuis les fichiers source

**Le script `seed` lit :**

1. `public/configs/Le Mans univ.json`
   ```json
   {
     "buildings": [...]
   }
   ```
   
   → Insère dans table `configs`

2. `public/geojson/LeMansUniv/ESGT.geojson`
   ```json
   {
     "type": "FeatureCollection",
     "features": [...]
   }
   ```
   
   → Insère dans table `geojson`

---

## 🔄 Cycle de vie d'une requête

### Frontend → Backend → Database → Backend → Frontend

```
Frontend
  ↓ (1) HTTP Request
Backend (Express)
  ↓ (2) Route handler
Backend (Prisma ORM)
  ↓ (3) SQL Query
Database (SQLite/PostgreSQL)
  ↓ (4) Result
Backend (Prisma ORM)
  ↓ (5) Parse + Format
Backend (Express)
  ↓ (6) JSON Response
Frontend
  ↓ (7) Display
```

### Exemple concret

```typescript
// (1) Frontend envoie la requête
const config = await configsAPI.get('le-mans-univ')

// (2) Backend reçoit sur la route
router.get('/:slug', async (req, res) => {
  
  // (3) Prisma génère et exécute la requête SQL
  const config = await prisma.config.findUnique({
    where: { slug: req.params.slug }
  })
  // → SELECT * FROM configs WHERE slug = 'le-mans-univ'
  
  // (4) Database retourne les données
  // { id: "clxxx", name: "Le Mans univ", data: '{"buildings":...}' }
  
  // (5) Backend parse et formate
  const parsed = JSON.parse(config.data)
  
  // (6) Backend renvoie au frontend
  res.json({ ...config, data: parsed })
})

// (7) Frontend reçoit et utilise
console.log(config.data.buildings) // Accès direct à l'objet
```

---

## 🛠️ Comment modifier les données

### Ajouter une nouvelle config

**Option 1 : Via fichier + seed**
```bash
# 1. Créer public/configs/nouvelle-config.json
# 2. Importer
cd backend
npm run seed
```

**Option 2 : Via API**
```bash
curl -X POST http://localhost:3001/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nouvelle config",
    "slug": "nouvelle-config",
    "data": {
      "buildings": [...]
    }
  }'
```

### Modifier une config existante

**Via API**
```bash
curl -X PUT http://localhost:3001/api/configs/le-mans-univ \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "buildings": [...]
    }
  }'
```

### Supprimer une config

**Via API**
```bash
curl -X DELETE http://localhost:3001/api/configs/le-mans-univ
```

---

## 🔍 Comment déboguer

### 1. Vérifier que le backend tourne

```bash
curl http://localhost:3001/health
# ✅ {"status":"ok","timestamp":"..."}
```

### 2. Vérifier les données

```bash
cd backend
npm run prisma:studio
# Ouvre http://localhost:5555
# Voir toutes les tables et données
```

### 3. Vérifier une requête API

```bash
# Lister les configs
curl http://localhost:3001/api/configs

# Récupérer une config
curl http://localhost:3001/api/configs/le-mans-univ

# Vérifier les GeoJSON
curl http://localhost:3001/api/geojson
```

### 4. Voir les logs backend

```bash
cd backend
npm run dev
# Les logs s'affichent en temps réel
```

### 5. Console développeur frontend

**F12 → Network → Filtrer "fetch"**
- Voir toutes les requêtes API
- Vérifier les réponses
- Vérifier les erreurs CORS

---

## 🚀 Performances

### Cache

Les données sont en base de données, donc :
- ✅ Rapide (index SQLite/PostgreSQL)
- ✅ Pas de lecture fichier à chaque requête
- ✅ Scalable (PostgreSQL)

### Optimisations possibles

1. **Redis cache**
   ```typescript
   // Avant
   const config = await prisma.config.findUnique(...)
   
   // Après
   let config = await redis.get('config:le-mans-univ')
   if (!config) {
     config = await prisma.config.findUnique(...)
     await redis.set('config:le-mans-univ', config, 'EX', 3600)
   }
   ```

2. **Compression**
   ```typescript
   // Dans server.ts
   app.use(compression())
   ```

3. **Index supplémentaires**
   ```prisma
   model GeoJSON {
     ...
     @@index([folder])
     @@index([name])  // Nouveau
   }
   ```

---

## 💡 Résumé

1. **Frontend** demande les données via API REST
2. **Backend** reçoit, traite avec Prisma
3. **Database** stocke et retourne les données
4. **Backend** formate et renvoie JSON
5. **Frontend** affiche sur la carte

**Simple, robuste, scalable !** ✨

---

Pour plus de détails, voir :
- `LIVRABLE.md` - Vue d'ensemble
- `backend/docs/README.md` - Documentation API
- `docs/BACKEND_ARCHITECTURE.md` - Architecture complète
