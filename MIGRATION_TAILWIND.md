# Guide de Migration Tailwind CSS + GravityUI Icons

## ✅ Terminé

### Infrastructure
- ✅ Tailwind CSS v3.4.17 installé
- ✅ PostCSS configuré
- ✅ @gravity-ui/icons v2.16.0 installé
- ✅ `tailwind.config.js` avec couleurs et z-index personnalisés
- ✅ `src/index.css` migré vers Tailwind

### Composants Migrés
- ✅ `src/components/SettingsButton.tsx` - Utilise `Gear` icon
- ✅ `src/components/UserGeolocate.tsx` - Utilise `LocationArrow`, `Sun`, `Moon` icons

## 📋 Composants à Migrer

### Composants Principaux
- ⏳ `src/components/LevelSelector.tsx`
- ⏳ `src/components/SearchBar.tsx`
- ⏳ `src/components/MapView.tsx`
- ⏳ `src/components/RoutePlanner.tsx`
- ⏳ `src/components/ConfigSelector.tsx`
- ⏳ `src/components/EventSelector.tsx`
- ⏳ `src/components/ResultActions.tsx`
- ⏳ `src/components/events/EventBar.tsx`

### Route Planner Components
- ⏳ `src/components/route-planner/BottomSheetBase.tsx`
- ⏳ `src/components/route-planner/ConfirmStartModal.tsx`
- ⏳ `src/components/route-planner/DesktopRouteDetails.tsx`
- ⏳ `src/components/route-planner/DesktopRouteStats.tsx`
- ⏳ `src/components/route-planner/DesktopRouteSteps.tsx`
- ⏳ `src/components/route-planner/Inputs.tsx`
- ⏳ `src/components/route-planner/MobileRouteDetailsSheet.tsx`
- ⏳ `src/components/route-planner/MobileRoutesSheet.tsx`
- ⏳ `src/components/route-planner/MobileSheets.tsx`
- ⏳ `src/components/route-planner/NavigationBanner.tsx`
- ⏳ `src/components/route-planner/NavigationBottomSheet.tsx`
- ⏳ `src/components/route-planner/NavigationSheetHeader.tsx`
- ⏳ `src/components/route-planner/NavigationStepsList.tsx`

### Search Components
- ⏳ `src/components/search/SearchList.tsx`
- ⏳ `src/components/search/SearchSelected.tsx`
- ⏳ `src/components/search/GroupedResultsMenu.tsx`

### Settings Components
- ⏳ `src/components/settings/SettingsModal.tsx`
- ⏳ `src/components/settings/SettingsLayout.tsx`
- ⏳ `src/components/settings/GeneralSettings.tsx`
- ⏳ `src/components/settings/CalendarSettings.tsx`
- ⏳ `src/components/settings/AliasSettings.tsx`
- ⏳ `src/components/settings/SearchableSelect.tsx`

## 🎨 Icônes GravityUI Disponibles

### Icônes Couramment Utilisées
- `Gear` - Paramètres
- `LocationArrow` - Géolocalisation
- `Sun` / `Moon` - Thème clair/sombre
- `GeoPin` - Épingle de localisation
- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` - Flèches directionnelles
- `Xmark` - Fermer/Annuler
- `MagnifierGlass` - Recherche
- `Plus` - Ajouter
- `Minus` - Supprimer/Réduire
- `Check` - Valider
- `TrashBin` - Supprimer
- `Pencil` - Éditer
- `Calendar` - Calendrier/Événements
- `Clock` - Heure
- `Route` - Itinéraire
- `MapPin` - Point sur la carte

## 🔄 Patterns de Migration

### Pattern 1: Bouton Simple
**Avant:**
```tsx
<button style={{
  position: 'fixed',
  right: 12,
  bottom: 12,
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: '1px solid #ddd',
  background: 'white',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
}}>
  ⚙
</button>
```

**Après:**
```tsx
import { Gear } from '@gravity-ui/icons'

<button className="fixed right-3 bottom-3 w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center">
  <Gear className="w-5 h-5" />
</button>
```

### Pattern 2: Container avec Theme
**Avant:**
```tsx
<div style={{
  background: 'var(--bg-color, white)',
  color: 'var(--text-color, black)',
  padding: '16px',
  borderRadius: '8px'
}}>
```

**Après:**
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg">
```

### Pattern 3: Positionnement Fixe
**Avant:**
```tsx
style={{ position: 'fixed', top: 10, left: 10, zIndex: 30 }}
```

**Après:**
```tsx
className="fixed top-[10px] left-[10px] z-search"
```

### Pattern 4: Flexbox
**Avant:**
```tsx
style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
```

**Après:**
```tsx
className="flex items-center justify-between gap-2"
```

## 💡 Classes Utiles Tailwind

### Couleurs de Fond
- `bg-white` / `dark:bg-gray-800`
- `bg-gray-50` / `dark:bg-gray-900`
- `bg-gray-100` / `dark:bg-gray-800`

### Couleurs de Texte
- `text-gray-900` / `dark:text-gray-100`
- `text-gray-600` / `dark:text-gray-400`

### Bordures
- `border border-gray-300 dark:border-gray-600`
- `border-2 border-blue-500`

### Ombres
- `shadow-sm` - petite ombre
- `shadow-md` - ombre moyenne
- `shadow-lg` - grande ombre
- `shadow-xl` - très grande ombre

### Z-Index Personnalisés (voir tailwind.config.js)
- `z-map` (0)
- `z-controls` (10)
- `z-overlay` (20)
- `z-selector` (28)
- `z-search` (30)
- `z-modal` (50)
- `z-sheet` (2147483000)

### Responsive
- `md:` - >= 768px (tablette)
- `lg:` - >= 1024px (desktop)
- `max-md:` - < 768px (mobile)

## 🎯 Prochaines Étapes

1. **Configurer les couleurs personnalisées** dans `tailwind.config.js`
2. Migrer tous les composants `src/components/*.tsx`
3. Migrer tous les composants `src/components/route-planner/*.tsx`
4. Migrer tous les composants `src/components/search/*.tsx`
5. Migrer tous les composants `src/components/settings/*.tsx`
6. Supprimer `src/App.css` et autres fichiers CSS obsolètes
7. Build final et tests

## 🐛 Debug Tips

- Erreur "Unknown at rule @tailwind" dans l'éditeur : Normal, le linter ne connaît pas ces directives
- Classes Tailwind qui ne s'appliquent pas : Vérifier que le chemin est dans `content` du tailwind.config.js
- Dark mode ne fonctionne pas : Vérifier que la classe `dark` est sur `<html>` ou configuré `darkMode: 'class'`
