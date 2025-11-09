import maplibre from 'maplibre-gl'
import { normalizedFeatureId } from '../utils/featureId'

export function addBuildingsSource(map: maplibre.Map, data: any) {
    if (map.getSource('buildings')) return
    // Normalize feature IDs to ensure consistency between search and map interactions
    const normalized = { ...data }
    if (normalized.features && Array.isArray(normalized.features)) {
        normalized.features = normalized.features.map((f: any, i: number) => ({
            ...f,
            id: normalizedFeatureId(f, i)
        }))
    }
    map.addSource('buildings', { type: 'geojson', data: normalized } as any)
}

export function addCentroidsSource(map: maplibre.Map, data: any) {
    if (map.getSource('buildings-centroids')) return
    map.addSource('buildings-centroids', { type: 'geojson', data })
}
