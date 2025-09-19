import maplibre from 'maplibre-gl'

function getSearchbarWidth(): number {
    try {
        const el = document.querySelector('.searchbar') as HTMLElement | null
        if (!el) return 360
        const w = Math.round(el.getBoundingClientRect().width || 0)
        return w || 360
    } catch (e) { return 360 }
}

export function getSmartPadding(map: maplibre.Map): { left: number, right: number, top: number, bottom: number } {
    try {
        const container = map.getContainer() as HTMLElement
        const mapWidth = container.clientWidth || 800
        const mapHeight = container.clientHeight || 600
        const searchW = getSearchbarWidth()
        // limit left padding to a reasonable fraction of map width
        const left = Math.min(Math.round(searchW + 20), Math.floor(mapWidth * 0.45))
        const right = Math.max(60, Math.floor(mapWidth * 0.05))
        const top = Math.max(60, Math.floor(mapHeight * 0.05))
        const bottom = Math.max(60, Math.floor(mapHeight * 0.05))
        return { left, right, top, bottom }
    } catch (e) {
        return { left: 380, right: 60, top: 60, bottom: 60 }
    }
}

export function fitBoundsSmart(map: maplibre.Map, bounds: [[number, number], [number, number]], opts: any = {}) {
    const padding = getSmartPadding(map)
    try {
        map.fitBounds(bounds, Object.assign({ padding, duration: 800 }, opts))
    } catch (e) {
        try { map.fitBounds(bounds, Object.assign({ padding: 60, duration: 800 }, opts)) } catch (e) { }
    }
}
