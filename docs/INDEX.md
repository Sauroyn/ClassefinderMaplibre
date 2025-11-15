# Documentation MapLibre GeoJSON

Ce dossier contient toute la documentation du projet.

## 📚 Guides de Configuration

### Démarrage Rapide
- **[CONFIG_EXEMPLES.md](CONFIG_EXEMPLES.md)** - Exemples rapides et simples de configuration
- **[CONFIGURATION_SIMPLIFIEE.md](CONFIGURATION_SIMPLIFIEE.md)** - Explication du nouveau système simplifié

### Guides Complets
- **[CONFIG_GUIDE.md](CONFIG_GUIDE.md)** - Guide complet avec toutes les options disponibles
- **[MULTI_BUILDINGS_CONFIG.md](MULTI_BUILDINGS_CONFIG.md)** - Configuration multi-bâtiments avancée

## 🏗️ Architecture & Technique

### Structure du Code
- **[LABELS_ARCHITECTURE.md](LABELS_ARCHITECTURE.md)** - Architecture du système de labels
- **[LABELS_INDEX.md](LABELS_INDEX.md)** - Index des composants de labels
- **[LABELS_QUICKSTART.md](LABELS_QUICKSTART.md)** - Guide rapide d'utilisation des labels
- **[ROUTE_PLANNER_STRUCTURE.md](ROUTE_PLANNER_STRUCTURE.md)** - Structure du planificateur d'itinéraire

### Refactoring & Optimisation
- **[LABELS_REFACTORING.md](LABELS_REFACTORING.md)** - Historique du refactoring des labels
- **[REFACTORING_RAPPORT.md](REFACTORING_RAPPORT.md)** - Rapport de refactoring global
- **[OPTIMIZATION_PLAN.md](OPTIMIZATION_PLAN.md)** - Plan d'optimisation
- **[OPTIMIZATION_REPORT_2025-11-10.md](OPTIMIZATION_REPORT_2025-11-10.md)** - Rapport d'optimisation

## 🔄 Migration & Changements

- **[MIGRATION_TAILWIND.md](MIGRATION_TAILWIND.md)** - Migration vers Tailwind CSS
- **[RAPPORT_MIGRATION.md](RAPPORT_MIGRATION.md)** - Rapport général de migration
- **[MOBILE_CONTROLS_REFACTOR.md](MOBILE_CONTROLS_REFACTOR.md)** - Refonte des contrôles mobiles
- **[PHASE_4_COMPLETE.md](PHASE_4_COMPLETE.md)** - Phase 4 terminée

## 📖 Fichier Principal

- **[README.md](README.md)** - Documentation principale du projet

---

## 🎯 Par Où Commencer ?

1. **Nouveau sur le projet ?** → Lisez [README.md](README.md)
2. **Créer une config ?** → Consultez [CONFIG_EXEMPLES.md](CONFIG_EXEMPLES.md)
3. **Configuration avancée ?** → Voir [CONFIG_GUIDE.md](CONFIG_GUIDE.md)
4. **Développeur ?** → Consultez les fichiers d'architecture

## 🚀 Fonctionnalités Clés

### Système de Labels Intelligent
Le système de labels s'adapte automatiquement au zoom :
- **Zoom < 16** : Pas de labels (trop loin)
- **Zoom 16-17** : Affiche le nom du bâtiment (ex: "ESGT", "Bâtiment A")
- **Zoom ≥ 17** : Affiche le nom de chaque salle/feature

### Multi-Bâtiments Simplifié
Il suffit de lister vos fichiers GeoJSON :
```json
{
  "name": "Mon Campus",
  "geojson": [
    "batiment-a.geojson",
    "batiment-b.geojson"
  ]
}
```

Tout le reste est automatique !
