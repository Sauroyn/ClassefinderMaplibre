# Configuration des Labels

Ce document explique comment configurer l'affichage des labels (noms) sur la carte.

## Options de Configuration JSON

### Zoom de la Carte

- **`minZoom`** *(number, optionnel)* : Zoom minimum autorisé. L'utilisateur ne pourra pas dézoomer en dessous de cette valeur.
  - Exemple : `"minZoom": 14`
  - Par défaut : pas de limite

- **`maxZoom`** *(number, optionnel)* : Zoom maximum autorisé. L'utilisateur ne pourra pas zoomer au-dessus de cette valeur.
  - Exemple : `"maxZoom": 20`
  - Par défaut : pas de limite

### Labels

- **`labelMinZoom`** *(number, optionnel)* : Zoom minimum pour afficher les labels. En dessous de ce niveau, aucun label n'est affiché.
  - Exemple : `"labelMinZoom": 16`
  - Par défaut : `16`

- **`labelZoomThreshold`** *(number, optionnel)* : Seuil de zoom pour basculer entre :
  - **Zoom < seuil** : Affiche le nom du **bâtiment** (un seul label au centre du bâtiment)
  - **Zoom ≥ seuil** : Affiche le nom des **features individuelles** (salles, couloirs, etc.)
  - Exemple : `"labelZoomThreshold": 17`
  - Par défaut : `17`

## Comportement des Labels

### Mode Bâtiment (zoom < labelZoomThreshold)

Lorsque l'utilisateur est dézoomé (zoom < `labelZoomThreshold`), le système affiche **un seul label par bâtiment** :

- Le label est positionné au **centre géométrique** de toutes les features du bâtiment
- Le texte affiché est le nom du bâtiment (provenant de la propriété `building` du GeoJSON ou du nom du fichier)
- Cela évite d'avoir des dizaines de labels qui se superposent

### Mode Feature (zoom ≥ labelZoomThreshold)

Lorsque l'utilisateur est zoomé (zoom ≥ `labelZoomThreshold`), le système affiche les **noms individuels des features** :

- Chaque salle, couloir, etc. affiche son propre nom
- Les labels sont positionnés au centre de chaque feature
- Le système gère automatiquement les collisions pour éviter que les labels se chevauchent

## Exemples de Configuration

### Configuration Multi-Bâtiments (Le Mans Université)

```json
{
  "name": "Le Mans université",
  "initialCenter": [0.15986548744816018, 48.01747757301202],
  "initialZoom": 16,
  "minZoom": 14,
  "geojson": [
    "geojson/LeMansUniv/ESGT.geojson",
    "geojson/LeMansUniv/IRA.geojson"
  ],
  "labelZoomThreshold": 17,
  "labelMinZoom": 16
}
```

Avec cette configuration :
- L'utilisateur ne peut pas dézoomer en dessous du niveau 14
- Les labels n'apparaissent qu'à partir du niveau 16
- Entre zoom 16 et 17 : affiche "ESGT" et "IRA" (noms des bâtiments)
- À partir du zoom 17 : affiche les noms individuels des salles

### Configuration Simple (Paris)

```json
{
  "name": "Paris",
  "initialCenter": [2.3522, 48.8566],
  "initialZoom": 15,
  "minZoom": 13,
  "geojson": "Paris.geojson",
  "labelZoomThreshold": 17,
  "labelMinZoom": 15
}
```

Avec cette configuration :
- Zoom minimum : 13
- Labels visibles à partir du zoom 15
- Bascule vers les noms individuels au zoom 17

## Recommandations

1. **minZoom** : Mettre 2-3 niveaux en dessous de `initialZoom` pour permettre une vue d'ensemble
2. **labelMinZoom** : Généralement 1-2 niveaux en dessous de `labelZoomThreshold` pour voir les noms de bâtiments en premier
3. **labelZoomThreshold** : Ajuster selon la densité des features :
   - Bâtiments denses avec beaucoup de petites salles : augmenter (17-18)
   - Bâtiments avec peu de grandes salles : diminuer (15-16)

## Propriétés GeoJSON Utilisées

Les labels utilisent les propriétés suivantes dans l'ordre de priorité :

**Pour les noms de features** :
1. `name`
2. `nom`
3. `label`
4. `title`
5. `NAME`
6. `Name`

**Pour les noms de bâtiments** :
- Propriété `building` dans le GeoJSON
- Ou nom du fichier si la propriété n'existe pas

## Notes Techniques

- Les centroïdes sont calculés automatiquement pour chaque feature
- En mode bâtiment, un seul centroïde est calculé au centre de toutes les features du bâtiment
- Le système gère automatiquement les collisions de labels (MapLibre)
- Les labels s'adaptent automatiquement au thème (clair/sombre)
