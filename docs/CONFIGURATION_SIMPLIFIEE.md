# Système de Configuration Simplifié ✨

## Ce qui a changé

Le système de configuration a été **grandement simplifié**. Vous n'avez plus besoin de déclarer chaque bâtiment avec tous ses détails !

### Avant (compliqué 😓)

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

### Maintenant (simple 🎉)

```json
{
  "name": "Le Mans Université",
  "geojson": [
    "geojson/LeMansUniv/ESGT.geojson"
  ]
}
```

## Format Simple : Liste de Fichiers

Vous pouvez maintenant simplement lister vos fichiers GeoJSON :

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

**Tout le reste est automatique !**

## Ce qui est extrait automatiquement

### 1. Nom du bâtiment
Le système lit automatiquement la propriété `building` dans vos fichiers GeoJSON :

```json
{
  "properties": {
    "name": "Salle 101",
    "building": "Bâtiment ESGT",  // ← Utilisé comme nom du bâtiment
    "level": "1"
  }
}
```

Si aucune propriété `building` n'est trouvée, le nom du fichier est utilisé.

### 2. Étages disponibles
Extraits depuis `properties.level` de chaque feature.

### 3. Tags disponibles
Toutes les propriétés (sauf `name`, `level`, `building`, `color`, `height`) deviennent des tags :

```json
{
  "properties": {
    "name": "Hall",
    "level": "0",
    "exit": true,          // ← Tag
    "accessible": true,    // ← Tag
    "type": "entrance"     // ← Tag
  }
}
```

## Filtrage par Tags (Optionnel)

Si vous voulez afficher UNIQUEMENT les éléments avec certaines propriétés :

```json
{
  "name": "Mon Campus",
  "geojson": ["buildings.geojson"],
  "activeTags": ["exit", "accessible"]
}
```

Seules les features ayant au moins un de ces tags seront affichées.

## Affichage du Nom du Bâtiment

Dans la barre de recherche, le nom du bâtiment s'affiche maintenant sous le nom de chaque salle :

```
🔍 Salle 101
   Bâtiment ESGT
   Étage 1
```

## Documentation Complète

- **[CONFIG_EXEMPLES.md](./CONFIG_EXEMPLES.md)** - Exemples rapides
- **[CONFIG_GUIDE.md](./CONFIG_GUIDE.md)** - Guide complet avec toutes les options

## Migration

Vos anciennes configurations continuent de fonctionner ! Le système supporte :
- ✅ Format simple : `"geojson": "file.geojson"`
- ✅ Format liste : `"geojson": ["file1.geojson", "file2.geojson"]`
- ✅ Format avancé : `"buildings": [...]`

Mais le format liste est maintenant **recommandé** pour sa simplicité !
