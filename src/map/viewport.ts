import maplibre from 'maplibre-gl'
import { getDynamicPadding } from './viewportDynamic'

// Backward-compatible shim using the new dynamic padding everywhere
export function getSmartPadding(map: maplibre.Map): { left: number, right: number, top: number, bottom: number } {
    try { return getDynamicPadding(map) } catch { return { left: 60, right: 60, top: 60, bottom: 60 } }
}

export function fitBoundsSmart(map: maplibre.Map, bounds: [[number, number], [number, number]], opts: any = {}) {
    const padding = getDynamicPadding(map)
    try { map.fitBounds(bounds, { padding, duration: 800, ...opts }) }
    catch {
        try { map.fitBounds(bounds, { padding: 60, duration: 800, ...opts }) } catch { }
    }
}
