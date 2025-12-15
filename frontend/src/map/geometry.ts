/**
 * Check if a line segment intersects with a GeoJSON polygon or multipolygon
 */
export function lineIntersectsFeature(
    lineStart: [number, number],
    lineEnd: [number, number],
    feature: any
): boolean {
    if (!feature || !feature.geometry) return false

    const geom = feature.geometry

    if (geom.type === 'Polygon') {
        return lineIntersectsPolygon(lineStart, lineEnd, geom.coordinates)
    }

    if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
            if (lineIntersectsPolygon(lineStart, lineEnd, poly)) {
                return true
            }
        }
    }

    return false
}

/**
 * Check if a line segment intersects with a polygon
 */
function lineIntersectsPolygon(
    lineStart: [number, number],
    lineEnd: [number, number],
    polygonCoords: number[][][]
): boolean {
    // Check each ring (exterior + holes)
    for (const ring of polygonCoords) {
        // Check if line intersects any edge of the ring
        for (let i = 0; i < ring.length - 1; i++) {
            const p1: [number, number] = [ring[i][0], ring[i][1]]
            const p2: [number, number] = [ring[i + 1][0], ring[i + 1][1]]

            if (lineSegmentsIntersect(lineStart, lineEnd, p1, p2)) {
                return true
            }
        }
    }

    return false
}

/**
 * Check if two line segments intersect
 * Using standard line intersection algorithm
 */
function lineSegmentsIntersect(
    a1: [number, number],
    a2: [number, number],
    b1: [number, number],
    b2: [number, number]
): boolean {
    const [x1, y1] = a1
    const [x2, y2] = a2
    const [x3, y3] = b1
    const [x4, y4] = b2

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

    // Parallel lines
    if (Math.abs(denom) < 1e-10) return false

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    // Check if intersection is within both line segments
    return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/**
 * Check if a point is inside a polygon
 */
export function pointInPolygon(point: [number, number], polygonCoords: number[][][]): boolean {
    const [x, y] = point
    const ring = polygonCoords[0] // Use exterior ring

    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1]
        const xj = ring[j][0], yj = ring[j][1]

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi)

        if (intersect) inside = !inside
    }

    return inside
}

/**
 * Check if a point is inside a GeoJSON feature
 */
export function pointInFeature(point: [number, number], feature: any): boolean {
    if (!feature || !feature.geometry) return false

    const geom = feature.geometry

    if (geom.type === 'Polygon') {
        return pointInPolygon(point, geom.coordinates)
    }

    if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
            if (pointInPolygon(point, poly)) {
                return true
            }
        }
    }

    return false
}
