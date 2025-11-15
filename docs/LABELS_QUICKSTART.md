# Module FeatureLabels - Guide rapide

## Import

```typescript
import { createFeatureLabels } from '@/map/labels'
```

## Utilisation de base

```typescript
// Créer une instance
const labels = createFeatureLabels(map)

// Afficher les labels
labels.update(level, theme)

// Changer de niveau
labels.update(1, 'light')

// Changer de thème
labels.update(1, 'dark')
```

## Style personnalisé

```typescript
labels.update(0, 'light', {
  textSize: 18,
  textColor: '#ff0000',
  haloWidth: 2
})
```

## Contrôle de visibilité

```typescript
// Masquer
labels.setVisibility(false)

// Afficher
labels.setVisibility(true)
```

## Nettoyage

```typescript
// Supprimer le layer
labels.remove()
```

## Intégration React

```typescript
function MyMap({ level, theme }) {
  const labelsRef = useRef<FeatureLabels | null>(null)
  
  useEffect(() => {
    if (!mapRef.current) return
    labelsRef.current = createFeatureLabels(mapRef.current)
    return () => labelsRef.current?.remove()
  }, [])
  
  useEffect(() => {
    labelsRef.current?.update(level, theme)
  }, [level, theme])
}
```

## Documentation complète

- 📖 [README.md](./src/map/labels/README.md) - Documentation détaillée
- 💡 [examples.ts](./src/map/labels/examples.ts) - Exemples d'utilisation
- 📝 [LABELS_REFACTORING.md](./LABELS_REFACTORING.md) - Notes de refactoring
