# Guide de Configuration - MapLibre GeoJSON

## Format Simple (Recommandé)

### Configuration Minimale

```json
{
  "name": "Mon Campus",
  "geojson": "buildings.geojson"
}
```

### Configuration avec Plusieurs Bâtiments

```json
{
  "name": "Mon Campus",
  "geojson": [
    "geojson/batiment-a.geojson",
    "geojson/batiment-b.geojson",
    "geojson/batiment-c.geojson"
  ]
}
```

**C'est tout !** Les informations suivantes sont automatiquement extraites des fichiers GeoJSON :
- Nom du bâtiment (propriété `building`, `name`, ou nom de fichier)
- Étages disponibles (propriété `level`)
- Tags disponibles (toutes les autres propriétés comme `exit`, `accessible`, `type`, etc.)

---

## Options Supplémentaires (Facultatives)

### Viewport Initial

```json
{
  "name": "Mon Campus",
  "geojson": ["buildings.geojson"],
  "initialViewport": {
    "lng": 2.3522,
    "lat": 48.8566,
    "zoom": 16,
    "pitch": 45,
    "bearing": 0
  }
}
```

Ou format alternatif :
```json
{
  "initialCenter": [2.3522, 48.8566],
  "initialZoom": 16
}
```

### Graphe de Navigation

```json
{
  "name": "Mon Campus",
  "geojson": ["buildings.geojson"],
  "graphGeojson": "graph.geojson"
}
```

### Apparence

```json
{
  "name": "Mon Campus",
  "geojson": ["buildings.geojson"],
  "fillColor": "#3b82f6",
  "fillHeight": 10,
  "transitionZoom": 17
}
```

---

## Format Avancé (Pour Contrôle Fin)

Si vous avez besoin de contrôler précisément chaque bâtiment :

```json
{
  "name": "Mon Campus",
  "buildings": [
    {
      "id": "batiment-a",
      "label": "Bâtiment A - Sciences",
      "geojson": "geojson/batiment-a.geojson",
      "defaultVisible": true,
      "defaultLevels": ["0", "1", "2"],
      "activeTags": ["exit", "accessible"]
    },
    {
      "id": "batiment-b",
      "label": "Bâtiment B - Administration",
      "geojson": "geojson/batiment-b.geojson",
      "defaultVisible": true,
      "defaultLevels": null,
      "activeTags": ["exit"]
    }
  ]
}
```

### Options par bâtiment :

- **`id`** : Identifiant unique (auto-généré si absent)
- **`label`** : Nom affiché (auto-extrait du GeoJSON si absent)
- **`geojson`** : Chemin vers le fichier GeoJSON (requis)
- **`defaultVisible`** : Visible par défaut ? (défaut : `true`)
- **`defaultLevels`** : Étages visibles par défaut (`null` = tous, ou liste `["0", "1"]`)
- **`activeTags`** : Filtrer pour n'afficher que les éléments avec ces propriétés (ex: `["exit", "accessible"]`)

---

## Structure des Fichiers GeoJSON

### Propriétés Recommandées

Chaque feature devrait avoir :

```json
{
  "type": "Feature",
  "properties": {
    "name": "Salle 101",
    "level": "1",
    "building": "Bâtiment A",
    
    // Propriétés optionnelles (deviennent des tags) :
    "type": "room",
    "exit": true,
    "accessible": true,
    "capacity": 30
  },
  "geometry": { ... }
}
```

### Propriétés Spéciales

- **`name`** : Nom de la salle/zone (requis pour recherche)
- **`level`** : Étage (numérique ou texte : "0", "1", "-1", "RDC", etc.)
- **`building`** : Nom du bâtiment (utilisé comme label si pas défini dans config)
- **Toutes les autres propriétés** sont considérées comme des tags et peuvent être utilisées pour filtrer

### Exemples de Tags Utiles

```json
{
  "properties": {
    "name": "Hall d'entrée",
    "level": "0",
    "type": "entrance",
    "exit": true,
    "accessible": true,
    "automated": true,
    "emergency_exit": false
  }
}
```

Avec `activeTags: ["exit"]`, seules les features avec `"exit": true` ou `"exit": "yes"` seront affichées.

---

## Exemples Complets

### Exemple 1 : Campus Simple

```json
{
  "name": "Campus de Versailles",
  "description": "Plan du campus principal",
  "geojson": "geojson/campus.geojson",
  "graphGeojson": "geojson/graph.geojson",
  "initialCenter": [2.1354, 48.8014],
  "initialZoom": 17
}
```

### Exemple 2 : Multi-Bâtiments Simple

```json
{
  "name": "Le Mans Université",
  "description": "Créé par un étudiant de l'ESGT",
  "geojson": [
    "geojson/LeMansUniv/ESGT.geojson",
    "geojson/LeMansUniv/IUT.geojson",
    "geojson/LeMansUniv/Sciences.geojson"
  ],
  "graphGeojson": "geojson/LeMansUniv/GrapheESGT.geojson",
  "initialCenter": [0.1599, 48.0175],
  "initialZoom": 16
}
```

### Exemple 3 : Multi-Bâtiments avec Contrôle

```json
{
  "name": "Campus Parisien",
  "buildings": [
    {
      "id": "bat-a",
      "label": "Bâtiment A - Sciences",
      "geojson": "geojson/paris/batiment-a.geojson",
      "activeTags": ["exit", "accessible"]
    },
    {
      "id": "bat-b",
      "label": "Bâtiment B - Administration",
      "geojson": "geojson/paris/batiment-b.geojson",
      "activeTags": ["exit"]
    }
  ],
  "initialViewport": {
    "lng": 2.3522,
    "lat": 48.8566,
    "zoom": 16
  }
}
```

---

## Migration depuis l'Ancien Format

### Avant (complexe)
```json
{
  "buildings": [
    {
      "id": "esgt",
      "label": "ESGT",
      "geojson": "geojson/LeMansUniv/ESGT.geojson",
      "defaultVisible": true,
      "defaultLevels": null,
      "defaultTags": [],
      "activeTags": []
    }
  ]
}
```

### Après (simple)
```json
{
  "name": "Le Mans Université",
  "geojson": "geojson/LeMansUniv/ESGT.geojson"
}
```

Ou pour plusieurs bâtiments :
```json
{
  "name": "Le Mans Université",
  "geojson": [
    "geojson/LeMansUniv/ESGT.geojson",
    "geojson/LeMansUniv/IUT.geojson"
  ]
}
```

---

## Résumé

### ✅ Format Recommandé
```json
{
  "name": "Mon Campus",
  "geojson": ["fichier1.geojson", "fichier2.geojson"]
}
```

### ⚙️ Informations Automatiques
- Nom du bâtiment → extrait de `properties.building` ou nom de fichier
- Étages → extraits de `properties.level`
- Tags → extraits de toutes les propriétés

### 🎨 Personnalisation (optionnelle)
- Utilisez le format `buildings: [...]` si vous voulez contrôler `activeTags`, labels, etc.
