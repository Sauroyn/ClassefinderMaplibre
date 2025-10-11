export type Coord = [number, number]

export function haversineDistance(from: Coord, to: Coord): number {
    const R = 6371000
    const dLat = (to[1] - from[1]) * Math.PI / 180
    const dLon = (to[0] - from[0]) * Math.PI / 180
    const lat1 = from[1] * Math.PI / 180
    const lat2 = to[1] * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

export function projectPointOnSegmentWithT(point: Coord, segStart: Coord, segEnd: Coord): { point: Coord; t: number } {
    const A = point[0] - segStart[0]
    const B = point[1] - segStart[1]
    const C = segEnd[0] - segStart[0]
    const D = segEnd[1] - segStart[1]
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    if (lenSq === 0) return { point: segStart, t: 0 }
    let param = dot / lenSq
    if (param < 0) return { point: segStart, t: 0 }
    if (param > 1) return { point: segEnd, t: 1 }
    return { point: [segStart[0] + param * C, segStart[1] + param * D], t: param }
}

export function projectOntoRouteDetailed(user: Coord, route: Coord[]) {
    if (route.length < 2) return { point: user as Coord, progress: 0, segIndex: 0, t: 0 }
    let closest = route[0]
    let minD = Infinity
    let total = 0
    let reached = 0
    let bestI = 0
    let bestT = 0
    for (let i = 0; i < route.length - 1; i++) total += haversineDistance(route[i], route[i + 1])
    let acc = 0
    for (let i = 0; i < route.length - 1; i++) {
        const a = route[i], b = route[i + 1]
        const { point, t } = projectPointOnSegmentWithT(user, a, b)
        const d = haversineDistance(user, point)
        if (d < minD) {
            minD = d
            closest = point
            reached = acc + haversineDistance(a, point)
            bestI = i
            bestT = t
        }
        acc += haversineDistance(a, b)
    }
    const progress = total > 0 ? Math.min(1, reached / total) : 0
    return { point: closest as Coord, progress, segIndex: bestI, t: bestT }
}

export function projectOntoRoute(user: Coord, route: Coord[]) { const d = projectOntoRouteDetailed(user, route); return { point: d.point, progress: d.progress } }

export function getPointAheadOnPolyline(coords: Coord[], segIndex: number, t: number, distanceMeters: number): Coord | null {
    let i = segIndex
    let localT = t
    let remaining = distanceMeters
    const advance = (a: Coord, b: Coord, fromT: number, dist: number) => {
        const segLen = haversineDistance(a, b)
        const remLen = segLen * (1 - fromT)
        if (remLen <= 1e-6) return { point: b as Coord, used: 0 }
        const use = Math.min(remLen, dist)
        const dt = use / segLen
        const newT = Math.min(1, fromT + dt)
        const p: Coord = [a[0] + (b[0] - a[0]) * newT, a[1] + (b[1] - a[1]) * newT]
        return { point: p, used: use }
    }
    let a = coords[i]
    let b = coords[i + 1]
    if (!a || !b) return null
    const start: Coord = [a[0] + (b[0] - a[0]) * localT, a[1] + (b[1] - a[1]) * localT]
    let current = start
    let left = remaining
    while (left > 0 && i < coords.length - 1) {
        a = coords[i]; b = coords[i + 1]
        const { point, used } = advance(a, b, localT, left)
        current = point; left -= used
        if (localT + used / Math.max(1e-6, haversineDistance(a, b)) >= 1 - 1e-9) { i += 1; localT = 0 } else break
    }
    return current
}

export function getPointBehindOnPolyline(coords: Coord[], segIndex: number, t: number, distanceMeters: number): Coord | null {
    let i = segIndex
    let localT = t
    let remaining = distanceMeters
    const retreat = (a: Coord, b: Coord, toT: number, dist: number) => {
        const segLen = haversineDistance(a, b)
        const used = Math.min(segLen * toT, dist)
        const newT = Math.max(0, toT - used / Math.max(1e-6, segLen))
        const p: Coord = [a[0] + (b[0] - a[0]) * newT, a[1] + (b[1] - a[1]) * newT]
        return { point: p, used }
    }
    let a = coords[i]
    let b = coords[i + 1]
    if (!a || !b) return null
    const start: Coord = [a[0] + (b[0] - a[0]) * localT, a[1] + (b[1] - a[1]) * localT]
    let current = start
    let left = remaining
    while (left > 0 && i >= 0) {
        a = coords[i]; b = coords[i + 1]
        const { point, used } = retreat(a, b, localT, left)
        current = point; left -= used
        if (localT - used / Math.max(1e-6, haversineDistance(a, b)) <= 1e-9) { i -= 1; if (i < 0) break; localT = 1 } else break
    }
    return current
}
