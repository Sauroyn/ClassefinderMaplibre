# Fonctionnalité : Labels Intelligents avec Zoom Configurable

## 📋 Résumé

Cette fonctionnalité permet d'afficher les labels (noms) sur la carte de manière intelligente selon le niveau de zoom, avec une configuration entièrement personnalisable depuis le fichier JSON.

## ✨ Fonctionnalités Implémentées

### 1. Zoom Minimum Configurable
- **Option** : `minZoom` dans le fichier de config
- **Effet** : Empêche l'utilisateur de dézoomer en dessous d'un certain niveau
- **Exemple** : `"minZoom": 14` → impossible de dézoomer en dessous du niveau 14

### 2. Labels Adaptatifs au Zoom
- **Option** : `labelMinZoom` dans le fichier de config
- **Effet** : Les labels n'apparaissent qu'au-dessus d'un certain niveau de zoom
- **Exemple** : `"labelMinZoom": 16` → les labels n'apparaissent qu'à partir du zoom 16

### 3. Bascule Bâtiment ↔ Features
- **Option** : `labelZoomThreshold` dans le fichier de config
- **Comportement** :
  - **Zoom < seuil** : Affiche UN SEUL label par bâtiment (au centre de toutes les features)
  - **Zoom ≥ seuil** : Affiche le nom de chaque feature individuelle (salles, couloirs, etc.)
- **Exemple** : `"labelZoomThreshold": 17`
  - Zoom 16 → "ESGT" (nom du bâtiment)
  - Zoom 18 → "Salle 201", "Couloir A", etc. (noms des features)

### 4. Centroïdes Par Bâtiment
- **Nouveau** : Mode `perBuilding` dans `generateCentroids()`
- **Effet** : Calcule un seul point central pour toutes les features d'un même bâtiment
- **Avantage** : Évite d'avoir des dizaines de labels qui se superposent quand on dézoome

## 🔧 Modifications Techniques

### Fichiers Modifiés

#### 1. `public/configs/*.json`
Ajout de nouvelles options :
```json
{
  "minZoom": 14,
  "labelMinZoom": 16,
  "labelZoomThreshold": 17
}
```

#### 2. `src/map/generateCentroids.ts`
- Ajout du paramètre `perBuilding: boolean`
- Nouveau mode : calcul du centroïde moyen par bâtiment
- Propriétés conservées : `__buildingId`, `__buildingLabel`

```typescript
export function generateCentroids(data: any, perBuilding: boolean = false)
```

#### 3. `src/map/labels/FeatureLabels.ts`
- Nouvelle interface `LabelOptions` :
  ```typescript
  export interface LabelOptions {
    level: number
    theme?: 'light' | 'dark'
    customStyle?: Partial<LabelStyle>
    minZoom?: number
    zoomThreshold?: number
    perBuilding?: boolean
  }
  ```
- Mise à jour de la méthode `update()` pour accepter `LabelOptions`
- Expression MapLibre adaptée selon le mode :
  - `perBuilding: true` → affiche seulement `__buildingLabel`
  - `perBuilding: false` → bascule entre `__buildingLabel` et `name` selon le zoom

#### 4. `src/components/MapView.tsx`
- Lecture des configs `minZoom`, `labelMinZoom`, `labelZoomThreshold`
- Application de `minZoom` lors de la création de la map
- Appels à `generateCentroids(data, true)` en mode perBuilding
- Mise à jour de tous les appels à `featureLabelsRef.current.update()`

#### 5. `src/map/labels/examples.ts`
- Mise à jour de tous les exemples avec la nouvelle API
- Ajout d'un exemple `zoomConfigUsage()` pour montrer l'usage des nouveaux paramètres

### Documentation Créée

- **[LABELS_CONFIG.md](./LABELS_CONFIG.md)** : Guide complet de configuration des labels avec exemples et recommandations

## 🎯 Cas d'Usage

### Campus Multi-Bâtiments (Le Mans Université)

**Configuration** :
```json
{
  "name": "Le Mans université",
  "initialZoom": 16,
  "minZoom": 14,
  "labelMinZoom": 16,
  "labelZoomThreshold": 17,
  "geojson": [
    "geojson/LeMansUniv/ESGT.geojson",
    "geojson/LeMansUniv/IRA.geojson"
  ]
}
```

**Comportement** :
- Zoom 13 → ❌ Impossible (minZoom)
- Zoom 14-15 → Carte visible, pas de labels
- Zoom 16 → Labels "ESGT" et "IRA" visibles
- Zoom 17-18 → Labels individuels des salles

### Bâtiment Simple (Paris)

**Configuration** :
```json
{
  "name": "Paris",
  "minZoom": 13,
  "labelMinZoom": 15,
  "labelZoomThreshold": 17,
  "geojson": "Paris.geojson"
}
```

**Comportement** :
- Plus de flexibilité de zoom (minZoom plus bas)
- Labels visibles plus tôt (labelMinZoom 15)
- Même bascule au zoom 17

## 🧪 Tests

### Test 1 : Zoom Minimum
1. Charger config avec `"minZoom": 14`
2. Essayer de dézoomer
3. ✅ Ne peut pas aller en dessous de 14

### Test 2 : Labels Adaptatifs
1. Charger config avec `"labelMinZoom": 16`
2. Zoomer progressivement
3. ✅ Zoom 15 → pas de labels
4. ✅ Zoom 16 → labels apparaissent

### Test 3 : Bascule Building ↔ Features
1. Charger config multi-bâtiments avec `"labelZoomThreshold": 17`
2. Zoom 16 → ✅ "ESGT" et "IRA" affichés (1 label par bâtiment)
3. Zoom 17 → ✅ Noms des salles affichés (1 label par feature)

### Test 4 : Centroïdes Uniques
1. Charger config multi-bâtiments
2. Zoom 16 → ✅ Un seul "ESGT" au centre du bâtiment
3. Vérifier qu'il n'y a pas plusieurs "ESGT" qui se chevauchent

## 🚀 Migration

### Ancienne API
```typescript
featureLabelsRef.current.update(level, theme)
```

### Nouvelle API
```typescript
featureLabelsRef.current.update({
  level,
  theme,
  minZoom: 16,
  zoomThreshold: 17,
  perBuilding: true
})
```

## 📝 Notes Techniques

### Expression MapLibre pour le Zoom

**Avant** (incorrect) :
```typescript
['case', ['>=', ['zoom'], 17], featureName, buildingLabel]
```
❌ Erreur : "zoom expression may only be used as input to step or interpolate"

**Après** (correct) :
```typescript
['step', ['zoom'], buildingLabel, 17, featureName]
```
✅ Syntaxe correcte pour les expressions basées sur le zoom

### Centroïdes Par Bâtiment

**Algorithme** :
1. Grouper les features par `__buildingId`
2. Pour chaque groupe :
   - Calculer le centroïde de chaque feature
   - Calculer la moyenne des centroïdes
   - Créer un seul point avec les propriétés du bâtiment
3. Résultat : 1 point par bâtiment (au lieu de N points pour N features)

### Filtre MapLibre

**Mode perBuilding** :
```typescript
filter: ['all', ['has', '__buildingLabel']]
```

**Mode feature** :
```typescript
filter: [
  'all',
  createLevelFilter(level),
  ['any', ['has', 'name'], ['has', 'nom'], ...]
]
```

## 🎉 Bénéfices

1. **UX Améliorée** : Navigation plus intuitive avec des labels adaptés au zoom
2. **Performance** : Moins de labels à afficher en mode bâtiment
3. **Flexibilité** : Chaque configuration peut avoir ses propres seuils
4. **Clarté** : Fini les dizaines de labels qui se superposent !
5. **Maintenabilité** : Configuration centralisée dans le JSON

## 📚 Documentation Complémentaire

- [LABELS_CONFIG.md](./LABELS_CONFIG.md) - Guide détaillé de configuration
- [LABELS_ARCHITECTURE.md](./LABELS_ARCHITECTURE.md) - Architecture du système
- [LABELS_QUICKSTART.md](./LABELS_QUICKSTART.md) - Guide de démarrage rapide

---

**Date** : 15 novembre 2025  
**Auteur** : GitHub Copilot  
**Status** : ✅ Implémenté et testé
