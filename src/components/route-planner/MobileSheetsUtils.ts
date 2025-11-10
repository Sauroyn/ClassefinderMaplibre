export function isMobileViewport() {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
}

export function formatEta(seconds: number) {
    const mins = Math.round(seconds / 60)
    return `${mins} min`
}

export function formatDistance(meters: number) {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
}

export type RouteItem = {
    id: string,
    layerId: string,
    distance: number,
    time: number,
    index?: number,
    steps?: Array<{ distance: number, coords: [number[], number[]], fromId?: string, toId?: string, type?: string, direction?: string, level?: number }>,
    maneuvers?: Array<{ at: number, type: string, idx?: number }>,
    __along?: number
}
