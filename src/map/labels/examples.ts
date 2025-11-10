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
    labels.update(0, 'light')

    // Changer de niveau
    labels.update(1, 'light')

    // Changer de thème
    labels.update(1, 'dark')
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

    labels.update(0, 'light', customStyle)
}

// ============================================
// 3. Gestion de la visibilité
// ============================================

function visibilityControl(map: maplibre.Map) {
    const labels = createFeatureLabels(map)
    labels.update(0, 'light')

    // Masquer temporairement les labels
    labels.setVisibility(false)

    // Les réafficher
    setTimeout(() => {
        labels.setVisibility(true)
    }, 2000)
}

// ============================================
// 4. Intégration dans un composant React
// ============================================

import { useRef, useEffect } from 'react'

function MapComponent({ level, theme }: { level: number, theme: 'light' | 'dark' }) {
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

    // Mise à jour quand le niveau ou le thème change
    useEffect(() => {
        if (!labelsRef.current) return

        labelsRef.current.update(level, theme)
    }, [level, theme])

    return null // JSX du composant
}

// ============================================
// 5. Utilisation avancée avec contrôle dynamique
// ============================================

class DynamicLabelsController {
    private labels: FeatureLabels
    private currentLevel: number = 0
    private currentTheme: 'light' | 'dark' = 'light'
    private visible: boolean = true

    constructor(map: maplibre.Map) {
        this.labels = createFeatureLabels(map)
        this.labels.update(this.currentLevel, this.currentTheme)
    }

    setLevel(level: number) {
        this.currentLevel = level
        this.refresh()
    }

    setTheme(theme: 'light' | 'dark') {
        this.currentTheme = theme
        this.refresh()
    }

    toggleVisibility() {
        this.visible = !this.visible
        this.labels.setVisibility(this.visible)
    }

    private refresh() {
        if (this.visible) {
            this.labels.update(this.currentLevel, this.currentTheme)
        }
    }

    destroy() {
        this.labels.remove()
    }
}

// ============================================
// 6. Pattern avec événements
// ============================================

function eventDrivenUsage(map: maplibre.Map) {
    const labels = createFeatureLabels(map)
    labels.update(0, 'light')

    // Écouter les changements de niveau
    window.addEventListener('map:level-change', ((e: CustomEvent) => {
        const newLevel = e.detail.level
        labels.update(newLevel, 'light')
    }) as EventListener)

    // Écouter les changements de thème
    window.addEventListener('map:theme-change', ((e: CustomEvent) => {
        const newTheme = e.detail.theme
        labels.update(0, newTheme)
    }) as EventListener)
}

// ============================================
// 7. Comparaison avec l'ancien système
// ============================================

// ============================================
// 7. Comparaison avec l'ancien système
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
 * 
 * Exemple :
 * const labels = createFeatureLabels(map)
 * labels.update(level, theme)
 */

export {
    basicUsage,
    customStyleUsage,
    visibilityControl,
    MapComponent,
    DynamicLabelsController,
    eventDrivenUsage
}
