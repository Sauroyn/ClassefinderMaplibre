# Refactoring des contrôles mobiles

## 📅 Date : 11 novembre 2025

## 🎯 Objectif
Refonte complète de la logique de positionnement des boutons en vue mobile (dark mode, localisation, sélecteur d'étage) pour garantir qu'ils se situent **toujours sous la barre de recherche**, même lorsqu'elle est étendue.

## 🔧 Changements effectués

### 1. Nouveau composant : `MobileControlsBar.tsx`
**Fichier** : `src/components/MobileControlsBar.tsx`

Un composant dédié qui regroupe tous les contrôles mobiles :
- **Sélecteur d'étage** avec support du swipe et de la molette
- **Bouton de géolocalisation**
- **Bouton dark mode**

**Caractéristiques** :
- ✅ Uniquement visible sur mobile (≤ 720px)
- ✅ Se positionne automatiquement sous la SearchBar
- ✅ Réactif aux changements de taille de la SearchBar (étendue/fermée)
- ✅ Prend en compte le Route Planner et la Navigation Banner
- ✅ Support du Visual Viewport (clavier mobile)
- ✅ Layout flexible avec gap entre les éléments
- ✅ Masqué automatiquement en mode navigation

**Observateurs installés** :
- `MutationObserver` : Détecte les changements DOM
- `ResizeObserver` : Détecte les changements de taille de la SearchBar
- `window.resize` et `orientationchange` : Ajustement lors de rotation
- `visualViewport` events : Gestion du clavier mobile

### 2. Simplification de `LevelSelector.tsx`
**Avant** : Logique complexe avec calculs de position mobile/desktop
**Après** : 
- Desktop uniquement (`hidden md:block`)
- Position fixe : `top-[10px] right-[10px]`
- Code simplifié de ~100 lignes

### 3. Simplification de `UserGeolocate.tsx`
**Avant** : Gestion des boutons pour mobile et desktop avec logique de visibilité
**Après** :
- Desktop uniquement (`hidden md:flex`)
- Suppression de la logique mobile
- Suppression du state `visible` (la gestion de la navigation reste pour desktop)

### 4. Intégration dans `App.tsx`
```tsx
{/* Desktop level selector */}
<LevelSelector ... />

{/* Mobile controls bar - only on mobile, not during navigation */}
{!navActive && <MobileControlsBar ... />}

{/* Search bar */}
{!navActive && !showPlanner && <SearchBar ... />}
```

## 🎨 Style et positionnement

### MobileControlsBar
```css
position: fixed;
right: 12px;
top: [calculé dynamiquement];
z-index: 10; /* z-controls */
display: flex;
gap: 8px;
```

### Calcul de position
```typescript
maxBottom = max(
  searchBar.bottom,
  routePlanner.bottom,
  navBanner.bottom
) + offsetTop + 14px (gap)
```

## ✨ Avantages de cette architecture

1. **Séparation des responsabilités**
   - Desktop : `LevelSelector` + `UserGeolocate`
   - Mobile : `MobileControlsBar`

2. **Code plus maintenable**
   - Logique centralisée dans un seul composant
   - Pas de conditions complexes dispersées

3. **Robustesse**
   - Multiple observateurs pour capter tous les changements
   - Gestion du Visual Viewport pour le clavier mobile
   - Fallbacks en cas d'erreur

4. **Performance**
   - `requestAnimationFrame` pour les mises à jour de position
   - Refs pour éviter les re-renders inutiles
   - Cleanup approprié des observateurs

5. **UX améliorée**
   - Les contrôles restent toujours visibles et accessibles
   - Positionnement cohérent quelque soit l'état de l'UI
   - Pas de chevauchement avec d'autres éléments

## 🧪 Tests suggérés

- [ ] Vérifier le positionnement avec la SearchBar fermée
- [ ] Vérifier le positionnement avec la SearchBar étendue (résultats de recherche)
- [ ] Vérifier avec le Route Planner ouvert
- [ ] Vérifier en mode navigation
- [ ] Tester la rotation de l'écran (portrait ↔ landscape)
- [ ] Tester avec le clavier mobile ouvert
- [ ] Vérifier le swipe sur le sélecteur d'étage
- [ ] Vérifier la molette de la souris sur le sélecteur
- [ ] Tester les boutons géolocalisation et dark mode

## 📱 Responsive breakpoint

Le breakpoint mobile/desktop est défini à **720px** :
- `≤ 720px` : MobileControlsBar visible
- `> 720px` : LevelSelector + UserGeolocate visibles

## 🔄 État de navigation

Lorsque `navActive === true` :
- MobileControlsBar est masqué
- Les contrôles desktop restent (avec leur propre logique de visibilité dans UserGeolocate)

---

**Note** : Cette refonte rend l'UI mobile beaucoup plus robuste et élimine les bugs de positionnement qui pouvaient survenir avec l'ancienne logique fragmentée.
