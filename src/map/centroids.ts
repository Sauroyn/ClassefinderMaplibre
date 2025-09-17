export function polygonCentroid(coords: number[][]): [number, number] {
    let a = 0, cx = 0, cy = 0
    for (let i = 0, len = coords.length - 1; i < len; i++) {
        const x0 = coords[i][0], y0 = coords[i][1]
        const x1 = coords[i + 1][0], y1 = coords[i + 1][1]
        const cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    }
    if (a === 0) {
        let sx = 0, sy = 0
        for (const c of coords) { sx += c[0]; sy += c[1] }
        return [sx / coords.length, sy / coords.length]
    }
    a = a / 2
    cx = cx / (6 * a)
    cy = cy / (6 * a)
    return [cx, cy]
}
