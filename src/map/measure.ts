// Distance helpers
export function haversine(a: [number, number], b: [number, number]) {
    const toRad = (v: number) => v * Math.PI / 180
    const R = 6371000
    const dLat = toRad(b[1] - a[1])
    const dLon = toRad(b[0] - a[0])
    const lat1 = toRad(a[1])
    const lat2 = toRad(b[1])
    const sinDlat = Math.sin(dLat / 2)
    const sinDlon = Math.sin(dLon / 2)
    const c = 2 * Math.atan2(
        Math.sqrt(sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon),
        Math.sqrt(1 - (sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon))
    )
    return R * c
}
