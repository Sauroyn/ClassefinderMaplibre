import maplibre from 'maplibre-gl'

export function addBuildingsSource(map: maplibre.Map, data: any) {
    if (map.getSource('buildings')) return
    // generateId ensures features without explicit id can use feature-state and interactions reliably
    map.addSource('buildings', { type: 'geojson', data, generateId: true } as any)
}

export function addCentroidsSource(map: maplibre.Map, data: any) {
    if (map.getSource('buildings-centroids')) return
    map.addSource('buildings-centroids', { type: 'geojson', data })
}
