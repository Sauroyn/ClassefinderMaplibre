import maplibre from 'maplibre-gl'

export function addFillLayers(map: maplibre.Map, level: number, cfg?: { fillColor?: string, fillHeight?: number, transitionZoom?: number }, theme: 'light' | 'dark' = 'light') {
    // determine default color expression: either a literal color from cfg or feature property 'color'
    const colorKey = theme === 'dark' ? 'darkColor' : 'color'
    const defaultColorExpr: any = cfg && cfg.fillColor
        ? (theme === 'dark' ? cfg.fillColor /* will be pre-derived in MapView */ : cfg.fillColor)
        : ['case', ['has', colorKey], ['get', colorKey], ['get', 'color']]
    // determine base height: either cfg.fillHeight (uniform) or per-feature 'height'
    const baseHeightExpr: any = (cfg && typeof cfg.fillHeight === 'number') ? cfg.fillHeight : ['get', 'height']
    // transition zoom at which extrusion collapses to 0 (defaults to 16)
    const tz = (cfg && typeof cfg.transitionZoom === 'number') ? cfg.transitionZoom : 16
    // create an interpolated height expression: at zoom (tz - 0.5) use baseHeight, at tz use 0
    const heightExpr: any = ['interpolate', ['linear'], ['zoom'], tz - 0.5, baseHeightExpr, tz, 0]

    if (!map.getLayer('buildings-extrusion')) {
        map.addLayer({
            id: 'buildings-extrusion', type: 'fill-extrusion', source: 'buildings',
            paint: {
                'fill-extrusion-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ffcc00', ['boolean', ['feature-state', 'selected'], false], '#ffcc00', defaultColorExpr],
                'fill-extrusion-height': heightExpr,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], tz - 0.5, 0.9, tz, 0]
            },
            filter: ['==', ['get', 'level'], level]
        })
    }
    if (!map.getLayer('buildings-fill')) {
        map.addLayer({
            id: 'buildings-fill', type: 'fill', source: 'buildings',
            paint: { 'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ffcc00', ['boolean', ['feature-state', 'selected'], false], '#ffcc00', defaultColorExpr], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], tz - 0.5, 0, tz, 0.9] },
            layout: { visibility: 'visible' },
            filter: ['==', ['get', 'level'], level]
        })
    }
}

export function addNameLayer(map: maplibre.Map, level: number, theme: 'light' | 'dark' = 'light') {
    if (map.getLayer('buildings-name')) return
    const textColor = theme === 'dark' ? '#f2f2f2' : '#111111'
    const haloColor = theme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.85)'
    map.addLayer({ id: 'buildings-name', type: 'symbol', source: 'buildings-centroids', layout: { 'text-field': ['get', 'name'], 'text-size': 14, 'text-anchor': 'center' }, paint: { 'text-color': textColor, 'text-halo-color': haloColor, 'text-halo-width': 1 }, filter: ['==', ['get', 'level'], level] })
}
