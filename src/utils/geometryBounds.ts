/** Geometry bounds helpers to remove duplicated min/max loops. */
export type BBox = [[number, number], [number, number]]

export function getPolygonBounds(ring: number[][]): BBox | null {
    if (!Array.isArray(ring) || ring.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const c of ring) {
        const x = c[0], y = c[1]
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null
    return [[minX, minY], [maxX, maxY]]
}

export function getLargestMultiPolygonBounds(multi: number[][][][]): BBox | null {
    if (!Array.isArray(multi) || multi.length === 0) return null
    let best: { area: number; bbox: BBox } | null = null
    for (const poly of multi) {
        const ring: number[][] = poly[0]
        const bbox = getPolygonBounds(ring)
        if (!bbox) continue
        // Approx area using bbox (cheap) or compute polygon area if needed later
        const area = Math.abs((bbox[1][0] - bbox[0][0]) * (bbox[1][1] - bbox[0][1]))
        if (!best || area > best.area) best = { area, bbox }
    }
    return best ? best.bbox : null
}

export function getFeatureBounds(feature: any): BBox | null {
    if (!feature || !feature.geometry) return null
    const geom = feature.geometry
    if (geom.type === 'Polygon') {
        return getPolygonBounds(geom.coordinates[0])
    } else if (geom.type === 'MultiPolygon') {
        return getLargestMultiPolygonBounds(geom.coordinates as number[][][][])
    }
    return null
}
