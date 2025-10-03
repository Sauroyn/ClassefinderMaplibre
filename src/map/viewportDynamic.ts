import type maplibre from 'maplibre-gl'

export type Padding = { top: number; right: number; bottom: number; left: number }

function getOverlayRects(): Array<DOMRect> {
    const rects: Array<DOMRect> = []
    try {
        const selectors = [
            '.searchbar',
            '.route-planner',
            '.navigation-banner',
            '[data-rsbs-root] .react-modal-sheet-container',
            '[data-overlay]'
        ]
        const nodes = document.querySelectorAll(selectors.join(','))
        nodes.forEach((n) => {
            const el = n as HTMLElement
            if (!el || el.offsetParent === null) return
            const r = el.getBoundingClientRect()
            // ignore zero-sized or out of viewport
            if (r.width <= 1 || r.height <= 1) return
            rects.push(r)
        })
    } catch { }
    return rects
}

export function getDynamicPadding(map: maplibre.Map, extra?: number | Partial<Padding>): Padding {
    const container = map.getContainer() as HTMLElement
    const cw = container.clientWidth || 800
    const ch = container.clientHeight || 600
    const base: Padding = { top: Math.round(ch * 0.06), right: Math.round(cw * 0.06), bottom: Math.round(ch * 0.06), left: Math.round(cw * 0.06) }

    try {
        const rects = getOverlayRects()
        let topMax = 0, bottomMax = 0, leftMax = 0, rightMax = 0
        rects.forEach((r) => {
            // if an element touches/overlaps edges, expand padding on that edge
            if (r.top <= 0 + 8) topMax = Math.max(topMax, r.bottom)
            if (Math.abs(window.innerHeight - r.bottom) <= 8) bottomMax = Math.max(bottomMax, r.height)
            if (r.left <= 0 + 8) leftMax = Math.max(leftMax, r.right)
            if (Math.abs(window.innerWidth - r.right) <= 8) rightMax = Math.max(rightMax, r.width)
        })
        base.top = Math.max(base.top, Math.ceil(topMax + 24))
        base.bottom = Math.max(base.bottom, Math.ceil(bottomMax + 24))
        base.left = Math.max(base.left, Math.ceil(leftMax + 24))
        base.right = Math.max(base.right, Math.ceil(rightMax + 24))
    } catch { }

    if (typeof extra === 'number') {
        return { top: base.top + extra, right: base.right + extra, bottom: base.bottom + extra, left: base.left + extra }
    }
    if (extra && typeof extra === 'object') {
        return {
            top: base.top + (extra.top ?? 0),
            right: base.right + (extra.right ?? 0),
            bottom: base.bottom + (extra.bottom ?? 0),
            left: base.left + (extra.left ?? 0)
        }
    }
    return base
}

export function focusPoint(map: maplibre.Map, lngLat: [number, number], options: { zoom?: number; animate?: boolean; extraPadding?: number | Partial<Padding> } = {}) {
    const padding = getDynamicPadding(map, options.extraPadding)
    try {
        const z = options.zoom ?? Math.min(19, Math.max(16, map.getZoom()))
        if (options.animate !== false) map.easeTo({ center: lngLat, zoom: z, padding, duration: 600 })
        else map.jumpTo({ center: lngLat, zoom: z, padding })
    } catch { }
}

export function focusBounds(map: maplibre.Map, bounds: [[number, number], [number, number]], options: { animate?: boolean; extraPadding?: number | Partial<Padding> } = {}) {
    const padding = getDynamicPadding(map, options.extraPadding)
    try {
        map.fitBounds(bounds, { padding, duration: options.animate === false ? 0 : 700 })
    } catch { }
}
