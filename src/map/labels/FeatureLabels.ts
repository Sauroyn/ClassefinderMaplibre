import maplibre from 'maplibre-gl'

/**
 * FeatureLabels - Gère l'affichage des noms/labels des features GeoJSON sur la carte
 * Version simplifiée et robuste avec support des alias
 */

export interface LabelStyle {
    textColor: string
    haloColor: string
    textSize: number
    haloWidth: number
}

export interface LabelOptions {
    /** Niveau à afficher */
    level: number
    /** Thème (light/dark) */
    theme?: 'light' | 'dark'
    /** Style personnalisé */
    customStyle?: Partial<LabelStyle>
    /** Zoom minimum pour afficher les labels (défaut: 16) */
    minZoom?: number
    /** Seuil de zoom pour basculer de building → feature (défaut: 17) */
    zoomThreshold?: number
    /** Mode centroïdes par bâtiment (un seul label par bâtiment) ou par feature */
    perBuilding?: boolean
}

export class FeatureLabels {
    private map: maplibre.Map
    private layerId = 'buildings-name'
    private sourceId = 'buildings-centroids'

    constructor(map: maplibre.Map) {
        this.map = map
    }

    /**
     * Retourne le style par défaut selon le thème
     */
    private getDefaultStyle(theme: 'light' | 'dark'): LabelStyle {
        if (theme === 'dark') {
            return {
                textColor: '#f2f2f2',
                haloColor: 'rgba(0,0,0,0.9)',
                textSize: 14,
                haloWidth: 1
            }
        } else {
            return {
                textColor: '#111111',
                haloColor: 'rgba(255,255,255,0.85)',
                textSize: 14,
                haloWidth: 1
            }
        }
    }

    /**
     * Crée le filtre pour afficher uniquement les features du niveau donné
     */
    private createLevelFilter(level: number): any {
        return [
            'any',
            ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
            ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
        ] as any
    }

    /**
     * Supprime le layer s'il existe
     */
    private removeLayerIfExists(): void {
        if (this.map.getLayer(this.layerId)) {
            try {
                this.map.removeLayer(this.layerId)
                console.log('[FeatureLabels] Layer supprimé')
            } catch (error) {
                console.warn('[FeatureLabels] Erreur lors de la suppression du layer:', error)
            }
        }
    }

    /**
     * Crée le layer de labels
     */
    private createLayer(options: LabelOptions, style: LabelStyle): void {
        const { level, minZoom = 16, zoomThreshold = 17, perBuilding = false } = options

        // Vérifier que la source existe
        if (!this.map.getSource(this.sourceId)) {
            console.error('[FeatureLabels] La source', this.sourceId, 'n\'existe pas!')
            return
        }

        // Supprimer l'ancien layer s'il existe
        this.removeLayerIfExists()

        console.log('[FeatureLabels] Création du layer - niveau:', level, 'minZoom:', minZoom, 'zoomThreshold:', zoomThreshold, 'perBuilding:', perBuilding)

        try {
            // Trouver le dernier layer des bâtiments pour insérer le layer de noms au-dessus
            let beforeId: string | undefined
            const layers = this.map.getStyle()?.layers || []
            // Chercher le dernier layer qui n'est pas un layer de route
            for (let i = layers.length - 1; i >= 0; i--) {
                const layerId = layers[i].id
                if (!layerId.startsWith('route-planner-')) {
                    beforeId = undefined // On veut être au-dessus de tout
                    break
                }
            }

            // Construire le text-field selon le mode
            let textFieldExpression: any
            if (perBuilding) {
                // Mode bâtiment : afficher seulement le nom du bâtiment
                textFieldExpression = ['coalesce', ['get', '__buildingLabel'], '']
            } else {
                // Mode feature : basculer entre nom de bâtiment et nom de feature selon le zoom
                textFieldExpression = [
                    'step',
                    ['zoom'],
                    // Zoom < zoomThreshold : afficher le nom du bâtiment
                    ['coalesce', ['get', '__buildingLabel'], ''],
                    zoomThreshold,
                    // Zoom >= zoomThreshold : afficher le nom de la feature
                    [
                        'coalesce',
                        ['get', 'name'],
                        ['get', 'nom'],
                        ['get', 'label'],
                        ['get', 'title'],
                        ['get', 'NAME'],
                        ['get', 'Name'],
                        ''
                    ]
                ]
            }

            this.map.addLayer({
                id: this.layerId,
                type: 'symbol',
                source: this.sourceId,
                minzoom: minZoom,
                layout: {
                    'text-field': textFieldExpression,
                    'text-size': style.textSize,
                    'text-anchor': 'center',
                    // Désactiver le recouvrement pour éviter que les noms se superposent
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    // Options pour améliorer la gestion des collisions
                    'text-optional': true,
                    'text-padding': 2,
                    // Dessiner dans l'ordre de la source pour une stabilité visuelle
                    'symbol-z-order': 'source',
                    'visibility': 'visible'
                },
                paint: {
                    'text-color': style.textColor,
                    'text-halo-color': style.haloColor,
                    'text-halo-width': style.haloWidth
                },
                filter: perBuilding
                    ? [
                        'all',
                        // En mode perBuilding, pas de filtre de niveau (le centroïde représente tout le bâtiment)
                        ['has', '__buildingLabel']
                    ]
                    : [
                        'all',
                        // Filtre de niveau
                        this.createLevelFilter(level),
                        // N'afficher que les features qui ont un nom
                        [
                            'any',
                            ['has', 'name'],
                            ['has', 'nom'],
                            ['has', 'label'],
                            ['has', 'title'],
                            ['has', 'NAME'],
                            ['has', 'Name']
                        ]
                    ]
            }, beforeId)
            console.log('[FeatureLabels] Layer créé avec succès', beforeId ? `avant ${beforeId}` : 'au-dessus de tout')
        } catch (error) {
            console.error('[FeatureLabels] Erreur lors de la création du layer:', error)
        }
    }

    /**
     * Met à jour ou crée le layer de labels
     */
    public update(options: LabelOptions): void {
        const { theme = 'light', customStyle } = options
        const style: LabelStyle = {
            ...this.getDefaultStyle(theme),
            ...customStyle
        }

        console.log('[FeatureLabels] update() - options:', options)

        // Toujours recréer le layer pour éviter les problèmes de synchronisation
        // mais s'assurer que la source existe (après un setStyle le style recharge asynchrone)
        const ensureCreate = () => this.createLayer(options, style)
        if (!this.map.getSource(this.sourceId)) {
            console.warn('[FeatureLabels] Source absente, attente du chargement pour créer le layer…')
            // Retenter quelques fois de façon progressive
            let tries = 0
            const retry = () => {
                try {
                    if (this.map.getSource(this.sourceId)) {
                        ensureCreate()
                        return
                    }
                } catch { }
                if (tries++ < 20) {
                    setTimeout(retry, 100)
                } else {
                    console.error('[FeatureLabels] Abandon de la création des labels: source non disponible')
                }
            }
            retry()
            // En plus, écouter une fois les événements style/sources pour accélérer la recréation
            const onSourceData = (e: any) => {
                try {
                    if (e && e.sourceId === this.sourceId && this.map.getSource(this.sourceId)) {
                        try { this.map.off('sourcedata', onSourceData) } catch { }
                        ensureCreate()
                    }
                } catch { }
            }
            try { this.map.on('sourcedata', onSourceData) } catch { }
            const onStyle = () => {
                try {
                    if (this.map.getSource(this.sourceId)) ensureCreate()
                } catch { }
            }
            try { this.map.once('styledata', onStyle) } catch { }
            return
        }
        ensureCreate()
    }

    /**
     * Supprime le layer de labels
     */
    public remove(): void {
        this.removeLayerIfExists()
    }

    /**
     * Change la visibilité du layer
     */
    public setVisibility(visible: boolean): void {
        if (!this.map.getLayer(this.layerId)) return

        try {
            this.map.setLayoutProperty(
                this.layerId,
                'visibility',
                visible ? 'visible' : 'none'
            )
        } catch (error) {
            console.warn('[FeatureLabels] Erreur lors du changement de visibilité:', error)
        }
    }

    /**
     * Récupère l'ID du layer
     */
    public getLayerId(): string {
        return this.layerId
    }
}

/**
 * Helper function pour créer et gérer facilement les labels
 */
export function createFeatureLabels(map: maplibre.Map): FeatureLabels {
    return new FeatureLabels(map)
}
