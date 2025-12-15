import maplibre from 'maplibre-gl'
import { createTagIconExpression } from './tagIcons'

export function addFillLayers(map: maplibre.Map, level: number, cfg?: { fillColor?: string, fillHeight?: number, transitionZoom?: number }, theme: 'light' | 'dark' = 'light') {
    // determine default color expression: prioritize per-feature color, then config fallback
    const colorKey = theme === 'dark' ? 'darkColor' : 'color'
    const configFallback = cfg?.fillColor || '#3b82f6'
    const defaultColorExpr: any = [
        'case',
        ['has', colorKey], ['get', colorKey],
        ['has', 'color'], ['get', 'color'],
        configFallback
    ]
    // determine base height: either cfg.fillHeight (uniform) or per-feature 'height'
    const baseHeightExpr: any = (cfg && typeof cfg.fillHeight === 'number') ? cfg.fillHeight : ['coalesce', ['get', 'height'], 3]
    // transition zoom at which extrusion collapses to 0 (defaults to 16)
    const tz = (cfg && typeof cfg.transitionZoom === 'number') ? cfg.transitionZoom : 16
    // create an interpolated height expression: at zoom (tz - 0.5) use baseHeight, at tz use 0
    const heightExpr: any = ['interpolate', ['linear'], ['zoom'], tz - 0.5, baseHeightExpr, tz, 0]

    if (!map.getLayer('buildings-extrusion')) {
        map.addLayer({
            id: 'buildings-extrusion', type: 'fill-extrusion', source: 'buildings',
            paint: {
                'fill-extrusion-color': [
                    'case',
                    ['boolean', ['feature-state', 'highlight'], false], ['coalesce', ['feature-state', 'highlightColor'], '#ff6b35'],
                    ['boolean', ['feature-state', 'hover'], false], ['coalesce', ['feature-state', 'hoverColor'], '#ffcc00'],
                    ['boolean', ['feature-state', 'selected'], false], ['coalesce', ['feature-state', 'selectedColor'], '#ffcc00'],
                    defaultColorExpr
                ],
                'fill-extrusion-height': heightExpr,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], tz - 0.5, 0.9, tz, 0]
            },
            filter: [
                'any',
                ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
            ]
        })
    }
    if (!map.getLayer('buildings-fill')) {
        map.addLayer({
            id: 'buildings-fill', type: 'fill', source: 'buildings',
            paint: {
                'fill-color': [
                    'case',
                    ['boolean', ['feature-state', 'highlight'], false], ['coalesce', ['feature-state', 'highlightColor'], '#ff6b35'],
                    ['boolean', ['feature-state', 'hover'], false], ['coalesce', ['feature-state', 'hoverColor'], '#ffcc00'],
                    ['boolean', ['feature-state', 'selected'], false], ['coalesce', ['feature-state', 'selectedColor'], '#ffcc00'],
                    defaultColorExpr
                ],
                'fill-opacity': ['interpolate', ['linear'], ['zoom'], tz - 0.5, 0, tz, 0.9]
            },
            layout: { visibility: 'visible' },
            filter: [
                'any',
                ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
            ]
        })
    }
}

/** * Add point layers with intelligent icons based on tags
 * Points with tags property will display appropriate icons
 */
export function addPointLayers(map: maplibre.Map, level: number, minZoom: number = 17) {
    // Symbol layer for points with tags (icons)
    if (!map.getLayer('points-icons')) {
        map.addLayer({
            id: 'points-icons',
            type: 'symbol',
            source: 'buildings',
            layout: {
                'icon-image': createTagIconExpression(),
                'icon-size': 0.8,
                'icon-allow-overlap': false,
                'icon-ignore-placement': false,
                'icon-anchor': 'center'
            },
            paint: {
                'icon-opacity': ['interpolate', ['linear'], ['zoom'], minZoom - 0.5, 0, minZoom, 1]
            },
            filter: [
                'all',
                ['==', ['geometry-type'], 'Point'],
                ['has', 'tags'],  // Only show points that have tags
                [
                    'any',
                    ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                    ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
                ]
            ]
        })
    } else {
        // Update filter for level change
        map.setFilter('points-icons', [
            'all',
            ['==', ['geometry-type'], 'Point'],
            ['has', 'tags'],
            [
                'any',
                ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
            ]
        ] as any)
    }

    // Text labels for point tags (shown at higher zoom levels)
    const labelMinZoom = minZoom + 1
    if (!map.getLayer('points-labels')) {
        map.addLayer({
            id: 'points-labels',
            type: 'symbol',
            source: 'buildings',
            layout: {
                'text-field': ['get', 'tags'],
                'text-size': 11,
                'text-anchor': 'top',
                'text-offset': [0, 1],
                'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': '#1f2937',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
                'text-opacity': ['interpolate', ['linear'], ['zoom'], labelMinZoom - 0.5, 0, labelMinZoom, 1]
            },
            filter: [
                'all',
                ['==', ['geometry-type'], 'Point'],
                ['has', 'tags'],
                [
                    'any',
                    ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                    ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
                ]
            ]
        })
    } else {
        // Update filter for level change
        map.setFilter('points-labels', [
            'all',
            ['==', ['geometry-type'], 'Point'],
            ['has', 'tags'],
            [
                'any',
                ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
            ]
        ] as any)
    }
}

/** * @deprecated Utiliser FeatureLabels à la place (src/map/labels/FeatureLabels.ts)
 * Cette fonction est maintenue pour compatibilité mais sera supprimée dans une future version
 */
export function addNameLayer(map: maplibre.Map, level: number, theme: 'light' | 'dark' = 'light') {
    console.warn('[addNameLayer] Cette fonction est dépréciée. Utilisez FeatureLabels à la place.')

    const textColor = theme === 'dark' ? '#f2f2f2' : '#111111'
    const haloColor = theme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.85)'

    // If layer exists, update colors for theme change
    if (map.getLayer('buildings-name')) {
        map.setPaintProperty('buildings-name', 'text-color', textColor)
        map.setPaintProperty('buildings-name', 'text-halo-color', haloColor)
        // Also ensure the filter matches the requested level after a theme/style swap
        try {
            map.setFilter('buildings-name', [
                'any',
                ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
            ] as any)
        } catch { }
        return
    }

    // Otherwise create the layer
    map.addLayer({
        id: 'buildings-name', type: 'symbol', source: 'buildings-centroids', layout: { 'text-field': ['get', 'name'], 'text-size': 14, 'text-anchor': 'center' }, paint: { 'text-color': textColor, 'text-halo-color': haloColor, 'text-halo-width': 1 }, filter: [
            'any',
            ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
            ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
        ] as any
    })
}
