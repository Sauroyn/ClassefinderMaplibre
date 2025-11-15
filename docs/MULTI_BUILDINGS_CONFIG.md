# Configuration Multi-Bâtiments

## Format Simple (Recommandé)

Pour charger plusieurs fichiers GeoJSON, utilisez simplement un tableau :

```json
{
    "name": "Le Mans université",
    "description": "Campus complet",
    "initialCenter": [0.15986548744816018, 48.01747757301202],
    "initialZoom": 16,
    "geojson": [
        "geojson/LeMansUniv/ESGT.geojson",
        "geojson/LeMansUniv/batiment-B.geojson",
        "geojson/LeMansUniv/batiment-C.geojson"
    ],
    "graphGeojson": "geojson/LeMansUniv/GrapheESGT.geojson"
}
```

**C'est tout !** Le système va automatiquement :
- Charger tous les fichiers
- Extraire les noms de bâtiment depuis les fichiers eux-mêmes
- Détecter tous les tags disponibles dans les propriétés
- Tout afficher par défaut

## Propriétés GeoJSON Automatiques

### Nom du bâtiment
Dans votre fichier GeoJSON, ajoutez simplement une propriété `building` ou `buildingName` :

```json
{
  "type": "Feature",
  "properties": {
    "name": "Salle A101",
    "level": "0",
    "building": "ESGT"
  }
}
```

Le nom du bâtiment sera automatiquement utilisé dans la barre de recherche.

### Tags pour filtrage
**Tous les propriétés booléennes ou string** deviennent automatiquement des tags :

```json
{
  "properties": {
    "name": "Hall d'entrée",
    "level": "0",
    "exit": true,           // ← devient un tag "exit"
    "accessible": true,     // ← devient un tag "accessible"
    "type": "entrance"      // ← devient un tag "type"
  }
}
```

Pour activer le filtrage par tags, utilisez `activeTags` :

```json
{
    "geojson": ["geojson/ESGT.geojson", "geojson/bati.geojson"],
    "activeTags": ["exit", "accessible"]
}
```

Seuls les éléments avec au moins un de ces tags seront affichés.

## Format Avancé (Optionnel)

Si vous avez besoin de plus de contrôle sur chaque bâtiment :

```json
{
    "name": "Campus",
    "buildings": [
        {
            "id": "esgt",
            "label": "ESGT",
            "geojson": "geojson/LeMansUniv/ESGT.geojson",
            "defaultVisible": true,
            "defaultLevels": ["0", "1", "2"],
            "activeTags": ["exit"]
        },
        {
            "id": "bati-b",
            "label": "Bâtiment B",
            "geojson": "geojson/LeMansUniv/bati-b.geojson",
            "defaultVisible": false,
            "activeTags": ["accessible"]
        }
    ]
}
```

### Options par bâtiment

- **`id`** : Identifiant unique (auto-généré si absent)
- **`label`** : Nom affiché (extrait du GeoJSON si absent)
- **`geojson`** : Chemin vers le fichier
- **`defaultVisible`** : true/false (true par défaut)
- **`defaultLevels`** : Niveaux affichés par défaut (tous si absent)
- **`activeTags`** : Tags à filtrer pour ce bâtiment spécifique

## Exemples Complets

### Exemple 1 : Simple (le plus courant)

```json
{
    "name": "Campus Le Mans",
    "geojson": [
        "geojson/LeMansUniv/ESGT.geojson",
        "geojson/LeMansUniv/Sciences.geojson",
        "geojson/LeMansUniv/Lettres.geojson"
    ],
    "graphGeojson": "geojson/LeMansUniv/graph.geojson",
    "initialCenter": [0.159, 48.017],
    "initialZoom": 16
}
```

### Exemple 2 : Avec filtrage des sorties

```json
{
    "name": "Campus - Sorties uniquement",
    "geojson": [
        "geojson/LeMansUniv/ESGT.geojson",
        "geojson/LeMansUniv/Sciences.geojson"
    ],
    "activeTags": ["exit", "emergency_exit"],
    "initialCenter": [0.159, 48.017],
    "initialZoom": 16
}
```

### Exemple 3 : Contrôle fin par bâtiment

```json
{
    "name": "Campus - Configuration avancée",
    "buildings": [
        {
            "label": "ESGT",
            "geojson": "geojson/LeMansUniv/ESGT.geojson",
            "defaultLevels": ["0", "1"],
            "activeTags": ["exit"]
        },
        {
            "label": "Sciences",
            "geojson": "geojson/LeMansUniv/Sciences.geojson",
            "defaultVisible": false
        }
    ],
    "initialCenter": [0.159, 48.017],
    "initialZoom": 16
}
```

## Propriétés Globales

### Obligatoires
- **`name`** : Nom de la configuration

### Géométrie
- **`geojson`** : Fichier unique (string) ou multiple (array)
- **`buildings`** : Configuration avancée par bâtiment (array)
- **`graphGeojson`** : Fichier du graphe de navigation

### Vue initiale
- **`initialCenter`** : [longitude, latitude]
- **`initialZoom`** : Niveau de zoom (ex: 16)
- **`initialViewport`** : Objet avec lng, lat, zoom, pitch, bearing

### Filtrage
- **`activeTags`** : Tags globaux pour filtrer tous les bâtiments

### Style (optionnel)
- **`fillColor`** : Couleur de remplissage
- **`fillHeight`** : Hauteur d'extrusion 3D
- **`transitionZoom`** : Niveau de zoom de transition

## Migration depuis l'ancien format

### Ancien format (simple)
```json
{
    "geojson": "buildings.geojson"
}
```

### Nouveau format (multi-fichiers)
```json
{
    "geojson": [
        "buildings.geojson",
        "annexe.geojson"
    ]
}
```

**Pas de changement** si vous n'avez qu'un seul fichier ! L'ancien format continue de fonctionner.

## Notes Importantes

1. **Compatibilité** : L'ancien format avec un seul `geojson` fonctionne toujours
2. **Auto-détection** : Les noms de bâtiment et tags sont extraits automatiquement
3. **Filtres persistants** : Les filtres utilisateur sont sauvegardés dans localStorage
4. **Performance** : Tous les fichiers sont chargés en parallèle
