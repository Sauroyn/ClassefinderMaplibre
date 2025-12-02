# Location Lock - Verrouillage Géographique

## 📍 Vue d'ensemble

Le **Location Lock** permet de restreindre l'accès aux données GeoJSON en fonction de la position géographique de l'utilisateur. Cette fonctionnalité est idéale pour des données confidentielles qui ne doivent être accessibles que depuis un périmètre défini.

## 🔧 Configuration

Ajoutez ces trois champs dans votre fichier de configuration JSON :

```json
{
  "name": "Ma Config",
  "locationLock": true,
  "perimeterCenter": [longitude, latitude],
  "perimeterRadius": 1000,
  "geojson": ["..."],
  ...
}
```

### Paramètres

| Champ | Type | Description |
|-------|------|-------------|
| `locationLock` | `boolean` | Active ou désactive le verrouillage géographique |
| `perimeterCenter` | `[number, number]` | Centre du périmètre autorisé `[longitude, latitude]` |
| `perimeterRadius` | `number` | Rayon du périmètre en **mètres** |

## 🎯 Comportement

### Si `locationLock` est `false` ou absent
✅ Le site fonctionne normalement, aucune restriction

### Si `locationLock` est `true`

#### 1️⃣ Permission refusée
- ❌ **Données GeoJSON** : Non chargées
- 🗺️ **Carte** : Fond de carte uniquement
- 🔵 **Périmètre** : Affiché en bleu (zone requise)
- 💬 **Message** : "Localisation requise"

#### 2️⃣ Hors du périmètre
- ❌ **Données GeoJSON** : Non chargées
- 🗺️ **Carte** : Fond de carte uniquement
- 🔵 **Périmètre** : Affiché en bleu (zone requise)
- 🔴 **Position utilisateur** : Marqueur rouge visible
- 💬 **Message** : "Hors zone autorisée"

#### 3️⃣ Dans le périmètre
- ✅ **Données GeoJSON** : Chargées normalement
- 🗺️ **Carte** : Fonctionnelle avec toutes les données
- ✨ **Périmètre** : Non affiché
- ✨ **Position utilisateur** : Disponible via UserGeolocate

## 📝 Exemple de configuration

```json
{
  "name": "Campus Universitaire (Accès Restreint)",
  "description": "Données confidentielles accessibles uniquement depuis le campus",
  "initialCenter": [0.15986, 48.01747],
  "initialZoom": 16,
  "geojson": ["batiment-a.geojson", "batiment-b.geojson"],
  "locationLock": true,
  "perimeterCenter": [0.15986, 48.01747],
  "perimeterRadius": 500
}
```

Cet exemple crée un périmètre de **500 mètres** autour du centre du campus. Les données ne seront accessibles que si l'utilisateur se trouve dans ce rayon.

## 🔒 Sécurité

⚠️ **Important** : Cette fonctionnalité est une **protection côté client uniquement**. 

Pour une vraie sécurité :
- Ajoutez une vérification côté serveur (backend)
- Implémentez un système d'authentification
- Utilisez des tokens géolocalisés avec expiration

Le Location Lock actuel empêche l'**affichage des données**, mais ne les protège pas contre un accès direct à l'API. Pour une protection complète, le backend devrait vérifier la position avant de servir les GeoJSON.

## 🎨 Personnalisation

Les couleurs et styles du périmètre peuvent être modifiés dans `LocationLockOverlay.tsx` :

```typescript
// Périmètre (remplissage)
'fill-color': '#3b82f6',
'fill-opacity': 0.1

// Périmètre (bordure)
'line-color': '#3b82f6',
'line-width': 2,
'line-dasharray': [2, 2]

// Marqueur utilisateur (hors zone)
'circle-color': '#ef4444',
'circle-radius': 10,
'circle-stroke-width': 3,
'circle-stroke-color': '#ffffff'
```

## 🧪 Test en développement

Pour tester sans être physiquement sur place :

1. Ouvrez les DevTools (F12)
2. Onglet **Console**
3. Simulez une position :

```javascript
navigator.geolocation.getCurrentPosition = (success) => {
  success({
    coords: {
      latitude: 48.01747,  // Centre du périmètre
      longitude: 0.15986,
      accuracy: 10
    }
  })
}
```

4. Rechargez la page

## 📊 Fichiers concernés

- **Hook** : `src/hooks/useLocationLock.ts`
- **Overlay carte** : `src/components/LocationLockOverlay.tsx`
- **Message modal** : `src/components/LocationLockMessage.tsx`
- **Intégration** : `src/App.tsx`, `src/hooks/useConfigData.ts`

## ✅ Checklist de déploiement

Avant de déployer une config avec Location Lock :

- [ ] Le périmètre est correctement centré sur la zone souhaitée
- [ ] Le rayon couvre bien la zone d'accès (testez avec une marge)
- [ ] Les coordonnées sont au format `[longitude, latitude]` (attention à l'ordre !)
- [ ] Le message utilisateur est clair et informatif
- [ ] Vous avez testé les 3 scénarios (refus, hors zone, dans zone)
- [ ] Le backend implémente une vérification côté serveur (recommandé)

---

**Note** : Cette fonctionnalité utilise l'API Geolocation du navigateur qui nécessite HTTPS en production.
