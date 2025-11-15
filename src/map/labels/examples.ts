/**
 * Exemple d'utilisation du module FeatureLabels
 * 
 * Ce fichier montre comment utiliser le nouveau système de gestion
 * des labels de features GeoJSON.
 */

import maplibre from 'maplibre-gl'
import { createFeatureLabels, FeatureLabels, type LabelStyle } from './FeatureLabels'

// ============================================
// 1. Utilisation basique
// ============================================

function basicUsage(map: maplibre.Map) {
    // Créer le gestionnaire de labels
    const labels = createFeatureLabels(map)

    // Afficher les labels pour le niveau 0 avec le thème clair
    labels.update({ level: 0, theme: 'light' })

    // Changer de niveau
    labels.update({ level: 1, theme: 'light' })

    // Changer de thème
    labels.update({ level: 1, theme: 'dark' })
}

// ============================================
// 2. Utilisation avec style personnalisé
// ============================================

function customStyleUsage(map: maplibre.Map) {
    const labels = createFeatureLabels(map)

    // Style personnalisé pour des labels plus gros et colorés
    const customStyle: Partial<LabelStyle> = {
        textSize: 18,
        textColor: '#ff6b35',
        haloWidth: 2
    }

    labels.update({ level: 0, theme: 'light', customStyle })
}

// ============================================
// 3. Utilisation avec configuration de zoom
// ============================================

function zoomConfigUsage(map: maplibre.Map) {
    const labels = createFeatureLabels(map)

    // Configuration personnalisée des zooms
    labels.update({
        level: 0,
        theme: 'light',
        minZoom: 15,              // Labels visibles à partir du zoom 15
        zoomThreshold: 17,        // Bascule building→feature au zoom 17
        perBuilding: true         // Un seul label par bâtiment
    })
}

// ============================================
// 4. Gestion de la visibilité
// ============================================

function visibilityControl(map: maplibre.Map) {
    const labels = createFeatureLabels(map)
    labels.update({ level: 0, theme: 'light' })

    // Masquer temporairement les labels
    labels.setVisibility(false)

    // Les réafficher
    setTimeout(() => {
        labels.setVisibility(true)
    }, 2000)
}

// ============================================
// 5. Intégration dans un composant React
// ============================================

import { useRef, useEffect } from 'react'

function MapComponent({ level, theme, config }: {
    level: number
    theme: 'light' | 'dark'
    config?: { minZoom?: number; zoomThreshold?: number; perBuilding?: boolean }
}) {
    const mapRef = useRef<maplibre.Map | null>(null)
    const labelsRef = useRef<FeatureLabels | null>(null)

    // Initialisation
    useEffect(() => {
        if (!mapRef.current) return

        // Créer le gestionnaire une seule fois
        labelsRef.current = createFeatureLabels(mapRef.current)

        return () => {
            // Nettoyage
            labelsRef.current?.remove()
        }
    }, [])

    // Mise à jour quand le niveau, le thème ou la config change
    useEffect(() => {
        if (!labelsRef.current) return

        labelsRef.current.update({
            level,
            theme,
            minZoom: config?.minZoom ?? 16,
            zoomThreshold: config?.zoomThreshold ?? 17,
            perBuilding: config?.perBuilding ?? true
        })
    }, [level, theme, config])

    return null // JSX du composant
}

// ============================================
// 6. Utilisation avancée avec contrôle dynamique
// ============================================

class DynamicLabelsController {
    private labels: FeatureLabels
    private currentLevel: number = 0
    private currentTheme: 'light' | 'dark' = 'light'
    private visible: boolean = true
    private config: { minZoom: number; zoomThreshold: number; perBuilding: boolean }

    constructor(map: maplibre.Map, config?: { minZoom?: number; zoomThreshold?: number; perBuilding?: boolean }) {
        this.labels = createFeatureLabels(map)
        this.config = {
            minZoom: config?.minZoom ?? 16,
            zoomThreshold: config?.zoomThreshold ?? 17,
            perBuilding: config?.perBuilding ?? true
        }
        this.refresh()
    }

    setLevel(level: number) {
        this.currentLevel = level
        this.refresh()
    }

    setTheme(theme: 'light' | 'dark') {
        this.currentTheme = theme
        this.refresh()
    }

    setConfig(config: { minZoom?: number; zoomThreshold?: number; perBuilding?: boolean }) {
        this.config = { ...this.config, ...config }
        this.refresh()
    }

    toggleVisibility() {
        this.visible = !this.visible
        this.labels.setVisibility(this.visible)
    }

    private refresh() {
        if (this.visible) {
            this.labels.update({
                level: this.currentLevel,
                theme: this.currentTheme,
                ...this.config
            })
        }
    }

    destroy() {
        this.labels.remove()
    }
}

// ============================================
// 7. Pattern avec événements
// ============================================

function eventDrivenUsage(map: maplibre.Map) {
    const labels = createFeatureLabels(map)
    labels.update({ level: 0, theme: 'light', perBuilding: true })

    // Écouter les changements de niveau
    window.addEventListener('map:level-change', ((e: CustomEvent) => {
        const newLevel = e.detail.level
        labels.update({ level: newLevel, theme: 'light', perBuilding: true })
    }) as EventListener)

    // Écouter les changements de thème
    window.addEventListener('map:theme-change', ((e: CustomEvent) => {
        const newTheme = e.detail.theme
        labels.update({ level: 0, theme: newTheme, perBuilding: true })
    }) as EventListener)
}

// ============================================
// 8. Comparaison avec l'ancien système
// ============================================

/**
 * AVANT (ancien système avec addNameLayer)
 * 
 * Problèmes :
 * - Pas de gestion d'état
 * - Logique dispersée
 * - Difficulté à étendre
 * - Pas de contrôle de visibilité facile
 * 
 * Exemple :
 * addNameLayer(map, level, theme)
 */

/**
 * APRÈS (nouveau système avec FeatureLabels)
 * 
 * Avantages :
 * - API claire et orientée objet
 * - Gestion d'état intégrée
 * - Contrôle complet (visibilité, style, etc.)
 * - Facile à tester et maintenir
 * - Documentation complète
 * - Configuration de zoom flexible
 * - Mode par bâtiment ou par feature
 * 
 * Exemple :
 * const labels = createFeatureLabels(map)
 * labels.update({ level, theme, minZoom: 15, zoomThreshold: 17, perBuilding: true })
 */

export {
    basicUsage,
    customStyleUsage,
    zoomConfigUsage,
    visibilityControl,
    MapComponent,
    DynamicLabelsController,
    eventDrivenUsage
}
