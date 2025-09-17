import maplibre from 'maplibre-gl'

export function addBuildingsSource(map: maplibre.Map, data: any) {
    if (map.getSource('buildings')) return
    map.addSource('buildings', { type: 'geojson', data })
}

export function addCentroidsSource(map: maplibre.Map, data: any) {
    if (map.getSource('buildings-centroids')) return
    map.addSource('buildings-centroids', { type: 'geojson', data })
}
