# Refonte du système d'affichage des noms des features GeoJSON

## Résumé des changements

Le système d'affichage des noms (labels) des features GeoJSON a été complètement refait pour améliorer la modularité, la maintenabilité et la simplicité du code.

## Nouvelle architecture

### Nouveau module : `src/map/labels/`

```
src/map/labels/
├── FeatureLabels.ts           # Classe principale de gestion des labels
├── index.ts                   # Point d'entrée du module
├── README.md                  # Documentation complète
├── examples.ts                # Exemples d'utilisation
└── FeatureLabels.test.example # Exemple de tests unitaires
```

### Fichiers modifiés

1. **`src/map/layers.ts`**
   - Fonction `addNameLayer()` marquée comme dépréciée
   - Ajout d'un warning pour guider vers le nouveau système
   - Fonction maintenue pour compatibilité arrière

2. **`src/components/MapView.tsx`**
   - Import du nouveau module `FeatureLabels`
   - Ajout de `featureLabelsRef` pour gérer l'instance
   - Remplacement des appels à `addNameLayer()` par `featureLabels.update()`
   - Gestion unifiée des labels lors des changements de niveau et de thème

## Nouvelles fonctionnalités

### Classe `FeatureLabels`

Une classe orientée objet qui encapsule toute la logique de gestion des labels :

```typescript
import { createFeatureLabels } from '@/map/labels'

const labels = createFeatureLabels(map)
labels.update(level, theme)
```

### API simplifiée

#### Méthodes principales

- **`update(level, theme, customStyle?)`** : Crée ou met à jour les labels
- **`setVisibility(visible)`** : Contrôle la visibilité
- **`remove()`** : Supprime le layer
- **`getLayerId()`** : Retourne l'ID du layer MapLibre

#### Styles personnalisables

```typescript
labels.update(0, 'light', {
  textSize: 18,
  textColor: '#ff6b35',
  haloWidth: 2
})
```

## Avantages du nouveau système

### 1. Modularité
- Code isolé dans son propre module
- Séparation claire des responsabilités
- Facile à importer et utiliser

### 2. Simplicité
- API intuitive et orientée objet
- Une seule classe pour tout gérer
- Moins de code boilerplate

### 3. Maintenabilité
- Logique centralisée
- Documentation complète
- Exemples d'utilisation fournis

### 4. Type-safety
- Interfaces TypeScript complètes
- Autocomplétion dans l'IDE
- Détection d'erreurs à la compilation

### 5. Robustesse
- Gestion d'erreurs intégrée
- Logging informatif
- Pas de création/suppression inutile de layers

### 6. Flexibilité
- Support de styles personnalisés
- Contrôle fin de la visibilité
- Extension facile pour de nouvelles fonctionnalités

## Comparaison avec l'ancien système

### Avant

```typescript
// Initialisation
addNameLayer(map, level, theme)

// Changement de niveau
if (map.getLayer('buildings-name')) {
  map.setFilter('buildings-name', filter)
}

// Changement de thème
addNameLayer(map, level, newTheme) // Recréation du layer
```

**Problèmes :**
- Logique dispersée
- Pas de gestion d'état
- Manipulation directe des layers MapLibre
- Difficulté à étendre
- Code répétitif

### Après

```typescript
// Initialisation
const labels = createFeatureLabels(map)
labels.update(level, theme)

// Changement de niveau
labels.update(newLevel, theme)

// Changement de thème
labels.update(level, newTheme)
```

**Avantages :**
- API unifiée
- Gestion d'état automatique
- Abstraction de MapLibre
- Facile à tester
- Code concis

## Migration

### Étape 1 : Import

```diff
- import { addNameLayer } from '../map/layers'
+ import { createFeatureLabels } from '../map/labels'
```

### Étape 2 : Initialisation

```diff
- addNameLayer(map, level, theme)
+ const labels = createFeatureLabels(map)
+ labels.update(level, theme)
```

### Étape 3 : Mise à jour

```diff
- map.setFilter('buildings-name', filter)
+ labels.update(newLevel, theme)
```

## Fonctionnement interne

### Cycle de vie du layer

1. **Première mise à jour** : Création du layer MapLibre
2. **Mises à jour suivantes** : Modification des propriétés existantes
3. **Pas de suppression/recréation** : Optimisation des performances

### Filtre de niveau

Les labels sont automatiquement filtrés pour n'afficher que les features du niveau actif :

```javascript
[
  'any',
  ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
  ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
]
```

### Gestion des thèmes

Les styles sont automatiquement adaptés selon le thème :

- **Thème clair** : Texte sombre, halo clair
- **Thème sombre** : Texte clair, halo sombre

## Documentation

### README complet
Le module inclut un README détaillé avec :
- Description de l'architecture
- Guide d'utilisation complet
- Référence API
- Notes techniques

### Exemples pratiques
Le fichier `examples.ts` fournit des exemples pour :
- Utilisation basique
- Styles personnalisés
- Contrôle de visibilité
- Intégration React
- Patterns avancés

### Tests unitaires
Le fichier `FeatureLabels.test.example` montre comment tester le module.

## Performance

### Optimisations

1. **Pas de recréation de layer** : Les mises à jour modifient uniquement les propriétés nécessaires
2. **Gestion du cache** : Les styles par défaut sont calculés une seule fois
3. **Filtrage efficace** : Utilisation des expressions MapLibre natives

### Impact

- Changements de niveau : ~instantané
- Changements de thème : ~instantané
- Empreinte mémoire : identique à l'ancien système

## Rétrocompatibilité

L'ancienne fonction `addNameLayer()` est maintenue mais dépréciée :
- Un warning s'affiche dans la console
- Le comportement reste identique
- Migration recommandée mais non obligatoire

## Tests

Le build a été testé avec succès :
```
npm run build
✓ Build successful
```

## Prochaines étapes suggérées

1. **Tests unitaires** : Implémenter les tests avec Jest
2. **Tests d'intégration** : Vérifier le comportement en situation réelle
3. **Documentation utilisateur** : Ajouter des exemples dans la doc principale
4. **Monitoring** : Tracker l'utilisation du nouveau système
5. **Suppression de l'ancien code** : Après migration complète

## Conclusion

Cette refonte apporte une base solide et maintenable pour la gestion des labels. Le nouveau système est plus simple, plus robuste et plus facile à faire évoluer.
