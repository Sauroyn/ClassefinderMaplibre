# Exemples Rapides de Configuration

## Format le Plus Simple

### Un seul fichier
```json
{
  "name": "Mon Campus",
  "geojson": "buildings.geojson"
}
```

### Plusieurs fichiers
```json
{
  "name": "Le Mans Université",
  "geojson": [
    "geojson/LeMansUniv/ESGT.geojson",
    "geojson/LeMansUniv/IUT.geojson"
  ]
}
```

**Tout le reste est automatique !**
- Le nom du bâtiment est lu depuis `properties.building` dans le GeoJSON
- Les étages sont lus depuis `properties.level`
- Les tags sont toutes les autres propriétés (`exit`, `accessible`, etc.)

---

## Avec Options Basiques

```json
{
  "name": "Le Mans Université",
  "description": "Créé par un étudiant de l'ESGT",
  "geojson": ["geojson/LeMansUniv/ESGT.geojson"],
  "graphGeojson": "geojson/LeMansUniv/GrapheESGT.geojson",
  "initialCenter": [0.1599, 48.0175],
  "initialZoom": 16
}
```

---

## Avec Filtrage par Tags

Si vous voulez afficher UNIQUEMENT les éléments ayant certaines propriétés :

```json
{
  "name": "Mon Campus",
  "geojson": ["buildings.geojson"],
  "activeTags": ["exit", "accessible"]
}
```

Seules les features avec `"exit": true` ou `"accessible": true` seront affichées.

---

## Format Avancé (Contrôle Total)

```json
{
  "name": "Campus Complet",
  "buildings": [
    {
      "id": "sciences",
      "label": "Bâtiment Sciences",
      "geojson": "geojson/sciences.geojson",
      "activeTags": ["exit"]
    },
    {
      "id": "admin",
      "label": "Administration",
      "geojson": "geojson/admin.geojson",
      "activeTags": ["accessible"]
    }
  ]
}
```

---

## Dans vos Fichiers GeoJSON

### Propriétés Importantes

```json
{
  "type": "Feature",
  "properties": {
    "name": "Salle 101",           // ← Nom (requis pour recherche)
    "level": "1",                   // ← Étage
    "building": "Bâtiment ESGT",    // ← Nom du bâtiment (auto-détecté)
    
    // Tout le reste devient des tags :
    "exit": true,
    "accessible": true,
    "type": "classroom"
  }
}
```

La propriété `building` est utilisée automatiquement comme nom du bâtiment dans l'interface !

---

## Résumé : Ce Qui Est Automatique

✅ **Nom du bâtiment** → lu depuis `properties.building` dans le GeoJSON, ou nom du fichier  
✅ **Étages disponibles** → lus depuis `properties.level`  
✅ **Tags disponibles** → toutes les propriétés sauf `name`, `level`, `building`, `color`, `height`  

Vous n'avez besoin de rien configurer manuellement !
