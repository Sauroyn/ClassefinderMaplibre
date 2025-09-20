import maplibre from 'maplibre-gl'

function getSearchbarWidth(): number {
    try {
        const el = document.querySelector('.searchbar') as HTMLElement | null
        if (!el) return 360
        const w = Math.round(el.getBoundingClientRect().width || 0)
        return w || 360
    } catch (e) { return 360 }
}

function getTopOverlaysBottom(): number {
    try {
        const els = [document.querySelector('.searchbar'), document.querySelector('.route-planner')]
        let bottom = 0
        for (const e of els) {
            const el = e as HTMLElement | null
            if (!el) continue
            if (el.offsetParent === null) continue
            const r = el.getBoundingClientRect()
            if (r.bottom > bottom) bottom = r.bottom
        }
        return bottom
    } catch (e) { return 0 }
}

export function getSmartPadding(map: maplibre.Map): { left: number, right: number, top: number, bottom: number } {
    try {
        const container = map.getContainer() as HTMLElement
        const mapWidth = container.clientWidth || 800
        const mapHeight = container.clientHeight || 600
        // on narrow screens, searchbar moves to top — reduce left padding and add top offset
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 720
        const searchW = getSearchbarWidth()
        let right = Math.max(60, Math.floor(mapWidth * 0.05))
        let left = Math.min(Math.round(searchW + 20), Math.floor(mapWidth * 0.45))
        let top = Math.max(60, Math.floor(mapHeight * 0.05))
        const bottom = Math.max(60, Math.floor(mapHeight * 0.05))

        if (isMobile) {
            // on mobile we want horizontal padding to be symmetric so the fitted geometry stays centered
            const horiz = Math.max(24, Math.floor(mapWidth * 0.12))
            // add a small extra left offset to push geometry slightly left of center
            left = horiz + 25
            // make right symmetric as well
            // note: right was already computed but on mobile we force symmetry
            // compute top overlays height (searchbar, route-planner) and add a slightly larger margin
            const overlaysBottom = getTopOverlaysBottom()
            if (overlaysBottom && overlaysBottom > 0) {
                top = Math.max(top, Math.ceil(overlaysBottom + 60))
            }
            // also ensure right is at least horiz
            // (we want equal left/right on mobile)
            // right may remain larger for safety, but prefer symmetry
            // eslint-disable-next-line no-param-reassign
            // (assign to local var)
            // ensure returned right is at least horiz
            // we'll set right after this block
            if (right < horiz) right = horiz
        }

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
