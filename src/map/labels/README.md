# Module FeatureLabels

Ce module gère l'affichage des noms/labels des features GeoJSON sur la carte de manière modulaire et simplifiée.

## Architecture

```
src/map/labels/
├── FeatureLabels.ts   # Classe principale de gestion des labels
├── index.ts           # Point d'entrée du module
└── README.md          # Cette documentation
```

## Utilisation

### Import

```typescript
import { createFeatureLabels } from '@/map/labels'
// ou
import { FeatureLabels } from '@/map/labels'
```

### Initialisation

```typescript
const map = new maplibre.Map({ /* config */ })
const labels = createFeatureLabels(map)
```

### Mise à jour

```typescript
// Afficher les labels pour un niveau et un thème
labels.update(level, theme)

// Avec un style personnalisé
labels.update(level, theme, {
  textSize: 16,
  textColor: '#ff0000'
})
```

### Contrôle de la visibilité

```typescript
// Masquer les labels
labels.setVisibility(false)

// Afficher les labels
labels.setVisibility(true)
```

### Nettoyage

```typescript
// Supprimer le layer de labels
labels.remove()
```

## API

### `FeatureLabels`

Classe principale pour gérer l'affichage des labels.

#### Constructeur

```typescript
new FeatureLabels(map: maplibre.Map)
```

#### Méthodes

##### `update(level: number, theme: 'light' | 'dark', customStyle?: Partial<LabelStyle>): void`

Met à jour ou crée le layer de labels.

- **level**: Le niveau à afficher (filtrage)
- **theme**: Le thème visuel ('light' ou 'dark')
- **customStyle**: Style personnalisé optionnel

##### `setVisibility(visible: boolean): void`

Change la visibilité du layer de labels.

##### `remove(): void`

Supprime le layer de labels de la carte.

##### `getLayerId(): string`

Retourne l'ID du layer MapLibre ('buildings-name').

### `LabelStyle`

Interface définissant le style des labels.

```typescript
interface LabelStyle {
  textColor: string    // Couleur du texte
  haloColor: string    // Couleur du halo (contour)
  textSize: number     // Taille du texte
  haloWidth: number    // Largeur du halo
}
```

### `createFeatureLabels(map: maplibre.Map): FeatureLabels`

Factory function pour créer une instance de `FeatureLabels`.

## Styles par défaut

### Thème clair (light)

```typescript
{
  textColor: '#111111',
  haloColor: 'rgba(255,255,255,0.85)',
  textSize: 14,
  haloWidth: 1
}
```

### Thème sombre (dark)

```typescript
{
  textColor: '#f2f2f2',
  haloColor: 'rgba(0,0,0,0.9)',
  textSize: 14,
  haloWidth: 1
}
```

## Fonctionnement interne

1. **Source de données**: Le module utilise la source MapLibre `buildings-centroids` qui contient les centroïdes des polygones avec leur propriété `name`.

2. **Filtrage par niveau**: Les labels sont filtrés pour n'afficher que ceux correspondant au niveau actif, en utilisant les propriétés `level` ou `levels` des features.

3. **Gestion du cycle de vie**: 
   - À la première initialisation, le layer est créé
   - Lors des mises à jour suivantes, seules les propriétés nécessaires sont modifiées
   - Pas de suppression/recréation inutile du layer

4. **Gestion d'erreurs**: Toutes les opérations MapLibre sont protégées par des try/catch avec des logs de warning en cas d'erreur.

## Migration depuis l'ancien système

### Avant (layers.ts)

```typescript
import { addNameLayer } from '../map/layers'

// À l'initialisation
addNameLayer(map, level, theme)

// Lors du changement de niveau
map.setFilter('buildings-name', filter)
```

### Après (FeatureLabels)

```typescript
import { createFeatureLabels } from '../map/labels'

// À l'initialisation
const labels = createFeatureLabels(map)
labels.update(level, theme)

// Lors du changement de niveau
labels.update(newLevel, theme)
```

## Avantages du nouveau système

1. **Modularité**: Code isolé dans son propre module
2. **Simplicité**: API claire et intuitive
3. **Type-safety**: Typage TypeScript complet
4. **Maintenabilité**: Logique centralisée et documentée
5. **Flexibilité**: Support de styles personnalisés
6. **Robustesse**: Gestion d'erreurs intégrée

## Notes techniques

- Le layer créé a l'ID `buildings-name`
- La source utilisée est `buildings-centroids`
- Le field de texte affiché est `['get', 'name']`
- Les labels évitent le chevauchement par défaut (`text-allow-overlap: false`)
