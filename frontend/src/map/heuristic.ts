// small heuristic helper
export function heuristic(a: [number, number], b: [number, number]) {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    return Math.sqrt(dx * dx + dy * dy)
}
