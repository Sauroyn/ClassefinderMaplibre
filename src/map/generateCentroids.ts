import { polygonCentroid } from './centroids'
import { getAlias } from '../utils/aliases'
import { normalizedFeatureId } from '../utils/featureId'

export function generateCentroids(data: any) {
    const centroids: any = { type: 'FeatureCollection', features: [] }
    if (!data || !data.features) return centroids
    for (let i = 0; i < data.features.length; i++) {
        const f = data.features[i]
        if (!f.geometry) continue
        let centroid: [number, number] | null = null
        if (f.geometry.type === 'Polygon') centroid = polygonCentroid(f.geometry.coordinates[0])
        else if (f.geometry.type === 'MultiPolygon') {
            let best: { area: number, centroid: [number, number] } | null = null
            for (const poly of f.geometry.coordinates) {
                const ring = poly[0]
                let a = 0
                for (let j = 0, len = ring.length - 1; j < len; j++) {
                    const x0 = ring[j][0], y0 = ring[j][1]
                    const x1 = ring[j + 1][0], y1 = ring[j + 1][1]
                    a += (x0 * y1 - x1 * y0)
                }
                a = Math.abs(a) / 2
                const c = polygonCentroid(ring)
                if (!best || a > best.area) best = { area: a, centroid: c }
            }
            if (best) centroid = best.centroid
        }
        if (!centroid) continue

        // Enrichir les properties avec l'alias si disponible
        const featureId = normalizedFeatureId(f, i)
        const alias = getAlias(featureId)
        const enrichedProperties = { ...f.properties }

        if (alias) {
            // Remplacer le nom par l'alias
            enrichedProperties.name = alias.aliasName
            // Conserver le nom original dans une propriété séparée
            enrichedProperties._originalName = f.properties?.name || ''
        }

        centroids.features.push({
            type: 'Feature',
            id: f.id,
            properties: enrichedProperties,
            geometry: { type: 'Point', coordinates: centroid }
        })
    }
    return centroids
}
