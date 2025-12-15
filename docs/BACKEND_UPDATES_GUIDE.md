# Guide : Mettre à jour le Backend en Production SANS PERDRE LES DONNÉES

## 📋 Table des matières
1. [Principes importants](#principes-importants)
2. [Cas 1 : Ajouter une nouvelle colonne](#cas-1--ajouter-une-nouvelle-colonne)
3. [Cas 2 : Modifier une colonne](#cas-2--modifier-une-colonne)
4. [Cas 3 : Créer une nouvelle table](#cas-3--créer-une-nouvelle-table)
5. [Cas 4 : Ajouter une relation entre tables](#cas-4--ajouter-une-relation-entre-tables)
6. [Workflow complet de mise à jour](#workflow-complet-de-mise-à-jour)
7. [Rollback en cas de problème](#rollback-en-cas-de-problème)

---

## 🎯 Principes importants

### ⚠️ Règles d'or

1. **JAMAIS** supprimer une colonne directement (utiliser `@deprecated` d'abord)
2. **TOUJOURS** créer une migration Prisma avant de modifier le code
3. **TOUJOURS** tester les migrations en local d'abord
4. **TOUJOURS** sauvegarder la base de données avant une mise à jour en prod
5. Prisma gère les migrations **de manière sûre** : pas de perte de données

### Architecture des migrations

```
prisma/
  migrations/
    20251202181220_init/
      migration.sql          ← Les changements SQL réels
    20251211_add_new_field/  ← Chaque migration a son dossier
      migration.sql
```

---

## Cas 1 : Ajouter une nouvelle colonne

### Scenario
Vous voulez ajouter un champ `description` à la table `Config`.

### Étape 1 : Modifier le schéma Prisma

Modifiez `backend/prisma/schema.prisma` :

```prisma
model Config {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  data        String
  description String?  // ← NOUVEAU (optionnel)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Étape 2 : Créer la migration

**Sur votre machine locale** :

```bash
cd backend

# Créer la migration
npx prisma migrate dev --name add_description_to_config

# Prisma va :
# 1. Détecter les changements
# 2. Créer le fichier migration.sql
# 3. L'appliquer à votre base locale
# 4. Régénérer le Prisma Client
```

Vérifiez le fichier créé : `prisma/migrations/20251211_add_description_to_config/migration.sql`

```sql
-- AlterTable
ALTER TABLE "configs" ADD COLUMN "description" TEXT;
```

### Étape 3 : Tester localement

```bash
# Relancer le dev server
npm run dev

# L'API fonctionne ? Les tests passent ?
# ✅ OK, on peut déployer
```

### Étape 4 : Commit et push

```bash
git add backend/prisma/migrations/
git add backend/prisma/schema.prisma
git commit -m "feat: add description field to Config model"
git push
```

### Étape 5 : Déployer en production

**Sur votre serveur** :

```bash
cd ~/apps/ClassefinderMaplibre/backend

# Pull les changements
git pull

# Appliquer la migration (elle prend les données existantes)
npm run prisma:migrate:deploy

# Rebuild
npm run build

# Redémarrer
pm2 restart maplibre-backend

# Vérifier
curl https://classefinderbd.duckdns.org/api/configs
```

### ✅ Résultat

- ✅ Nouvelle colonne créée
- ✅ Données existantes conservées
- ✅ Nouvelle colonne `NULL` pour les lignes existantes
- ✅ API fonctionnel

---

## Cas 2 : Modifier une colonne

### Scenario
Vous voulez rendre la colonne `description` **obligatoire** et avec une valeur par défaut.

### Étape 1 : Modifier le schéma

```prisma
model Config {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  data        String
  description String   @default("No description")  // ← Changement
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Étape 2 : Créer la migration

```bash
npx prisma migrate dev --name make_description_required
```

Prisma génère automatiquement :

```sql
-- AlterTable
ALTER TABLE "configs" ALTER COLUMN "description" SET NOT NULL,
ALTER TABLE "configs" ALTER COLUMN "description" SET DEFAULT 'No description';

-- Pour les lignes qui ont NULL, la valeur par défaut est appliquée
```

### ✅ Résultat

- Les colonnes `NULL` existantes prennent la valeur par défaut
- Les nouvelles lignes doivent avoir `description`
- Aucune perte de données

---

## Cas 3 : Créer une nouvelle table

### Scenario
Vous voulez créer une table `Label` pour gérer les libellés des configs.

### Étape 1 : Modifier le schéma Prisma

```prisma
model Config {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  data        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  labels      Label[]  // ← Relation
}

// ← NOUVELLE TABLE
model Label {
  id        String   @id @default(cuid())
  name      String
  configId  String
  config    Config   @relation(fields: [configId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([configId, name])  // Une étiquette par config
}
```

### Étape 2 : Créer la migration

```bash
npx prisma migrate dev --name create_label_table
```

### Étape 3 : Générer le Prisma Client

```bash
npm run prisma:generate
```

### Étape 4 : Tester et déployer

```bash
# Commit
git add backend/prisma/
git commit -m "feat: add Label model and table"
git push

# Sur le serveur
cd ~/apps/ClassefinderMaplibre/backend
git pull
npm run prisma:migrate:deploy
npm run build
pm2 restart maplibre-backend
```

### ✅ Résultat

- Nouvelle table créée
- Relation établie
- Données existantes conservées
- Pas de cascade delete accidentel

---

## Cas 4 : Ajouter une relation entre tables

### Scenario
Vous voulez ajouter une relation entre `Config` et `GeoJSON`.

### Étape 1 : Modifier le schéma

```prisma
model Config {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  data      String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  geojsons  GeoJSON[] // ← Nouvelle relation
}

model GeoJSON {
  id        String   @id @default(cuid())
  path      String   @unique
  name      String
  folder    String
  data      String
  configId  String?  // ← Clé étrangère (optionnelle)
  config    Config?  @relation(fields: [configId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Étape 2 : Créer la migration

```bash
npx prisma migrate dev --name add_config_relation_to_geojson
```

Prisma génère :

```sql
-- AlterTable
ALTER TABLE "geojson" ADD COLUMN "configId" TEXT;

-- AddForeignKey
ALTER TABLE "geojson" ADD CONSTRAINT "geojson_configId_fkey" FOREIGN KEY ("configId") REFERENCES "configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### ✅ Résultat

- Colonne `configId` créée (NULL pour les lignes existantes)
- Relation établie
- Les GeoJSON peuvent être optionnellement liés à un Config
- Aucune perte de données

---

## Workflow complet de mise à jour

### 📋 Checklist pour chaque mise à jour

#### Phase 1 : Développement local

```bash
# 1. Créer une branche
git checkout -b feature/new-feature

# 2. Modifier le schéma Prisma
nano backend/prisma/schema.prisma

# 3. Créer la migration
cd backend
npx prisma migrate dev --name name_of_change

# 4. Vérifier le fichier migration.sql généré
cat prisma/migrations/*/migration.sql

# 5. Tester avec le dev server
npm run dev
# Tester l'API manuellement, vérifier que tout fonctionne

# 6. Commit
git add backend/prisma/
git commit -m "feat: description of change"
```

#### Phase 2 : Code et dépendances

```bash
# 7. Modifier le code backend si besoin
nano backend/src/routes/configs.ts
# Par exemple, ajouter des endpoints pour utiliser le nouveau champ

# 8. Builder et vérifier
npm run build
# ❌ S'il y a des erreurs TypeScript, les corriger

# 9. Commit du code
git commit -m "feat: update routes to handle new field"
```

#### Phase 3 : Commit et push

```bash
# 10. Push
git push origin feature/new-feature

# 11. Merge sur main (ou locationlock)
git checkout locationlock
git merge feature/new-feature
git push origin locationlock
```

#### Phase 4 : Production

```bash
# Sur le serveur
cd ~/apps/ClassefinderMaplibre/backend

# 12. Pull
git pull

# 13. Appliquer les migrations
npm run prisma:migrate:deploy

# 14. Builder
npm run build

# 15. Redémarrer
pm2 restart maplibre-backend

# 16. Vérifier les logs
pm2 logs maplibre-backend --lines 50

# 17. Tester l'API
curl https://classefinderbd.duckdns.org/api/configs
```

---

## Rollback en cas de problème

### 🚨 Si quelque chose s'est mal passé

#### Scenario 1 : Erreur SQL dans la migration

```bash
# 1. Vérifier les logs Prisma
npm run prisma:migrate:deploy 2>&1 | tee migration.log

# 2. Si la migration a échoué, "resolver" le problème
npx prisma migrate resolve --rolled-back 20251211_add_description_to_config

# 3. Corriger le fichier migration.sql
nano prisma/migrations/20251211_add_description_to_config/migration.sql

# 4. Réessayer
npm run prisma:migrate:deploy
```

#### Scenario 2 : Données corruptées

```bash
# 1. Sauvegarder la base actuelle (urgence)
pg_dump -U maplibre_user -d maplibre_prod > backup_before_rollback.sql

# 2. Supprimer la base (si vraiment nécessaire)
sudo -u postgres psql
DROP DATABASE maplibre_prod;
CREATE DATABASE maplibre_prod;
GRANT ALL PRIVILEGES ON DATABASE maplibre_prod TO maplibre_user;
\q

# 3. Réappliquer les migrations
npm run prisma:migrate:deploy

# 4. Restaurer les données du backup (si vous en avez)
psql -U maplibre_user -d maplibre_prod < backup_before_rollback.sql
```

#### Scenario 3 : Code incompatible avec la nouvelle DB

```bash
# 1. Git log pour voir les derniers changements
git log --oneline -n 5

# 2. Revert le commit problématique
git revert <commit-hash>

# 3. Builder et redémarrer
npm run build
pm2 restart maplibre-backend
```

---

## 🔒 Bonnes pratiques de migration

### ✅ À FAIRE

- ✅ Créer des migrations **petites et concentrées** (1 changement par migration)
- ✅ Tester les migrations **en local d'abord**
- ✅ Utiliser des noms de migration **explicites** : `add_description_to_config`, pas `update`
- ✅ Sauvegarder la base de données **avant** chaque migration prod
- ✅ Vérifier que l'API fonctionne **après** chaque migration prod
- ✅ Commiter les migrations **dans Git**

### ❌ À ÉVITER

- ❌ Modifier la base manuellement (toujours via Prisma)
- ❌ Supprimer des colonnes immédiatement (les marquer `@deprecated` d'abord)
- ❌ Créer des migrations géantes avec 10 changements
- ❌ Déployer une migration sans la tester localement
- ❌ Faire `git push` sans faire `npm run build` localement

---

## 📚 Commandes Prisma utiles

```bash
# Afficher le schéma
npx prisma db push

# Valider le schéma
npx prisma validate

# Ouvrir l'interface Prisma Studio
npx prisma studio

# Voir les migrations existantes
prisma migrate status

# Voir les détails d'une migration
cat prisma/migrations/*/migration.sql

# Créer une migration vide (pour du SQL custom)
npx prisma migrate dev --name custom_sql --create-only

# Redéfinir la base (⚠️ ATTENTION : supprime TOUT)
npx prisma migrate reset
```

---

## 🔄 Script de mise à jour rapide

Créez ce script pour accélérer les mises à jour :

```bash
#!/bin/bash
# ~/update-backend.sh

set -e  # Stop on error

echo "🔄 Mise à jour du backend..."

cd ~/apps/ClassefinderMaplibre/backend

# 1. Pull
echo "📥 Git pull..."
git pull

# 2. Install
echo "📦 npm install..."
npm install

# 3. Generate Prisma Client
echo "🔧 Prisma generate..."
npm run prisma:generate

# 4. Apply migrations
echo "💾 Applying migrations..."
npm run prisma:migrate:deploy

# 5. Build
echo "🏗️  Build..."
npm run build

# 6. Restart
echo "🚀 Restarting PM2..."
pm2 restart maplibre-backend

# 7. Verify
echo "✅ Verifying..."
sleep 2
pm2 logs maplibre-backend --lines 20

echo "✅ Backend update complete!"
```

**Utilisation** :

```bash
chmod +x ~/update-backend.sh
~/update-backend.sh
```

---

## 📊 Exemple complet : Ajouter une colonne et un endpoint

### 1. Modifier le schéma

```prisma
model Config {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  data        String
  tags        String   @default("")  // ← NOUVEAU
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2. Créer la migration

```bash
npx prisma migrate dev --name add_tags_to_config
```

### 3. Ajouter l'endpoint

```typescript
// backend/src/routes/configs.ts

// GET /api/configs/:slug/tags
router.get('/:slug/tags', async (req, res) => {
  const { slug } = req.params;
  
  const config = await prisma.config.findUnique({
    where: { slug },
    select: { tags: true }
  });

  if (!config) {
    return res.status(404).json({ error: 'Config not found' });
  }

  res.json({ tags: config.tags.split(',').filter(t => t) });
});

// PUT /api/configs/:slug/tags
router.put('/:slug/tags', async (req, res) => {
  const { slug } = req.params;
  const { tags } = req.body;

  const config = await prisma.config.update({
    where: { slug },
    data: { tags: tags.join(',') }
  });

  res.json(config);
});
```

### 4. Builder et tester

```bash
npm run build
npm run dev

# Tester
curl http://localhost:3001/api/configs/my-config/tags
curl -X PUT http://localhost:3001/api/configs/my-config/tags \
  -H "Content-Type: application/json" \
  -d '{"tags": ["map", "geojson"]}'
```

### 5. Commit et deploy

```bash
git add .
git commit -m "feat: add tags field and endpoints"
git push

# Sur le serveur
cd ~/apps/ClassefinderMaplibre/backend
git pull
npm run prisma:migrate:deploy
npm run build
pm2 restart maplibre-backend
```

---

## ✅ Checklist de mise à jour complète

- [ ] Schéma Prisma modifié
- [ ] Migration créée localement
- [ ] Code testé localement (`npm run dev`)
- [ ] Build réussit sans erreurs (`npm run build`)
- [ ] Commit pushé
- [ ] Pull sur le serveur
- [ ] Migration appliquée (`npm run prisma:migrate:deploy`)
- [ ] Build sur le serveur réussit
- [ ] PM2 redémarré
- [ ] API répond correctement
- [ ] Les anciennes données sont toujours là
- [ ] Les nouveaux champs/endpoints fonctionnent

---

## 🆘 Dépannage des migrations

### Erreur : "Database is locked"

```bash
# PostgreSQL ne devrait pas avoir ce problème
# Si c'est le cas, redémarrer PostgreSQL
sudo systemctl restart postgresql
```

### Erreur : "Column already exists"

```bash
# La migration a été appliquée deux fois
# Résoudre et continuer
npx prisma migrate resolve --applied migration_name
npm run prisma:migrate:deploy
```

### Erreur : "Foreign key constraint"

```bash
# Vérifier que toutes les références existent
npx prisma db push --force-reset

# ⚠️ Attention : cela réinitialise la base !
```

---

## 📞 Besoin d'aide ?

Consultez :
- `BACKEND_DEPLOYMENT_COMPLETE.md` - Guide de déploiement complet
- `prisma/schema.prisma` - Schéma courant
- `prisma/migrations/` - Historique des migrations
- Logs Prisma : `~/.pm2/logs/maplibre-backend*.log`
