import { fitBoundsSmart } from '../viewport'

export function fitToCombined(map: any, combinedCoords: number[][]) {
    if (!combinedCoords || !combinedCoords.length) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const c of combinedCoords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
    if (isFinite(minX)) fitBoundsSmart(map, [[minX, minY], [maxX, maxY]])
}
