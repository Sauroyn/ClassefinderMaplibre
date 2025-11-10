import { polygonCentroid } from './centroids'

export function generateCentroids(data: any) {
    const centroids: any = { type: 'FeatureCollection', features: [] }
    if (!data || !data.features) return centroids
    for (const f of data.features) {
        if (!f.geometry) continue
        let centroid: [number, number] | null = null
        if (f.geometry.type === 'Polygon') centroid = polygonCentroid(f.geometry.coordinates[0])
        else if (f.geometry.type === 'MultiPolygon') {
            let best: { area: number, centroid: [number, number] } | null = null
            for (const poly of f.geometry.coordinates) {
                const ring = poly[0]
                let a = 0
                for (let i = 0, len = ring.length - 1; i < len; i++) {
                    const x0 = ring[i][0], y0 = ring[i][1]
                    const x1 = ring[i + 1][0], y1 = ring[i + 1][1]
                    a += (x0 * y1 - x1 * y0)
                }
                a = Math.abs(a) / 2
                const c = polygonCentroid(ring)
                if (!best || a > best.area) best = { area: a, centroid: c }
            }
            if (best) centroid = best.centroid
        }
        if (!centroid) continue
        centroids.features.push({ type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'Point', coordinates: centroid } })
    }
    return centroids
}
