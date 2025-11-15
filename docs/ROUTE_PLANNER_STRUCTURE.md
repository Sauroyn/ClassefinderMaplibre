# Structure des composants Route Planner

## Architecture refactorisée

### ✅ Composants Desktop (sans navigation)
- `DesktopRouteDetails.tsx` - Conteneur principal pour l'affichage des détails
- `DesktopRouteStats.tsx` - Affichage des statistiques (durée, distance, arrivée)
- `DesktopRouteSteps.tsx` - Liste détaillée des étapes avec instructions

### 🔄 Composants communs (Desktop + Mobile)
- `Suggestions.tsx` - Suggestions de recherche (Ma position + lieux)
- `Inputs.tsx` - Champs de saisie départ/arrivée
- `RoutesList.tsx` - Liste des itinéraires disponibles
- `RouteOption.tsx` - Carte d'un itinéraire individuel
- `SettingsPopover.tsx` - Paramètres de l'itinéraire
- `utils.ts` - Utilitaires (parseGeoJSON, etc.)
- `getStartProximity.ts` - Calcul distance utilisateur <-> départ

### 📱 Composants Mobile (avec navigation)
- `MobileSheets.tsx` - BottomSheets pour mobile (routes + détails)
- `ConfirmStartModal.tsx` - Modal de confirmation si loin du départ
- `NavigationBanner.tsx` - Bannière de navigation (infos principales)
- `NavigationBottomSheet.tsx` - Panneau bas pendant la navigation
- `NavigationController.ts` - Logique de contrôle de la navigation

### 🗺️ Composants Map/Route
Dans `/src/map/route/`:
- `draw.ts` - Dessin des itinéraires sur la carte
- `markers.ts` - Marqueurs de navigation
- `prepare.ts` - Préparation des données de route
- `viewport.ts` - Gestion du viewport (fit bounds, etc.)

## À continuer

### Prochaines étapes de refactorisation :

1. **Séparer la navigation mobile** :
   - Créer `NavigationView.tsx` - Vue principale quand navigation active
   - Créer `NavigationMarker.tsx` - Marqueur avec direction
   - Créer `NavigationRecenter.tsx` - Bouton pour recentrer

2. **Séparer MobileSheets.tsx** en :
   - `MobileRoutesSheet.tsx` - Liste des itinéraires
   - `MobileRouteDetailsSheet.tsx` - Détails avec bouton démarrer
   - `BottomSheetBase.tsx` - Composant de base réutilisable

3. **Améliorer Map/Route** :
   - Extraire la logique de marqueurs de `draw.ts` vers `markers.tsx`
   - Créer `colors.ts` pour centraliser les couleurs des routes
   - Créer `progress.ts` pour la gestion de la progression

4. **Simplifier RoutePlanner.tsx** :
   - Extraire la logique de compute dans un hook personnalisé
   - Créer `useRouteComputation.ts`
   - Créer `useMapFeatureClick.ts`

## Avantages de cette structure

✅ **Séparation claire** Desktop vs Mobile
✅ **Composants plus petits** et plus faciles à maintenir
✅ **Réutilisabilité** accrue
✅ **Testabilité** améliorée
✅ **Lisibilité** du code
✅ **Chargement lazy** possible par plateforme
