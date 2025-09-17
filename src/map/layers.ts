import maplibre from 'maplibre-gl'

export function addFillLayers(map: maplibre.Map, level: number) {
    if (!map.getLayer('buildings-extrusion')) {
        map.addLayer({
            id: 'buildings-extrusion', type: 'fill-extrusion', source: 'buildings',
            paint: {
                'fill-extrusion-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ffcc00', ['boolean', ['feature-state', 'selected'], false], '#ffcc00', ['get', 'color']],
                'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15.9, ['get', 'height'], 16, 0],
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 15.9, 0.9, 16, 0]
            },
            filter: ['==', ['get', 'level'], level]
        })
    }
    if (!map.getLayer('buildings-fill')) {
        map.addLayer({
            id: 'buildings-fill', type: 'fill', source: 'buildings',
            paint: { 'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ffcc00', ['boolean', ['feature-state', 'selected'], false], '#ffcc00', ['get', 'color']], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 15.9, 0, 16, 0.9] },
            layout: { visibility: 'visible' },
            filter: ['==', ['get', 'level'], level]
        })
    }
}

export function addNameLayer(map: maplibre.Map, level: number) {
    if (map.getLayer('buildings-name')) return
    map.addLayer({ id: 'buildings-name', type: 'symbol', source: 'buildings-centroids', layout: { 'text-field': ['get', 'name'], 'text-size': 14, 'text-anchor': 'center' }, paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1 }, filter: ['==', ['get', 'level'], level] })
}
