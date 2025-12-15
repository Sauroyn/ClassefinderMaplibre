import maplibre from 'maplibre-gl'
import { fitBoundsSmart } from './viewport'

export function addInteractions(map: maplibre.Map, refs: any, opts?: {
    resolveColor?: (id: number) => string | null | undefined,
    deriveHoverColor?: (base: string) => string,
    deriveHighlightColor?: (base: string) => string,
    deriveSelectedColor?: (base: string) => string,
}) {
    const resolveBaseColor = (id: number | null): string | undefined => {
        if (id == null || !opts?.resolveColor) return undefined
        try { return opts.resolveColor(id) || undefined } catch { return undefined }
    }

    function setHover(id: number | null) {
        if (refs.hovered === id) return
        if (refs.hovered != null) try { map.setFeatureState({ source: 'buildings', id: refs.hovered }, { hover: false, hoverColor: null }) } catch (e) { }
        if (id != null) {
            const base = resolveBaseColor(id)
            const hoverColor = base ? (opts?.deriveHoverColor ? opts.deriveHoverColor(base) : base) : undefined
            try { map.setFeatureState({ source: 'buildings', id }, { hover: true, hoverColor }) } catch (e) { }
        }
        refs.hovered = id
    }
    function setSelected(id: number | null) {
        if (refs.selectedPrev != null) try { map.setFeatureState({ source: 'buildings', id: refs.selectedPrev }, { selected: false, selectedColor: null, highlight: false, highlightColor: null }) } catch (e) { }
        if (id != null) {
            const base = resolveBaseColor(id)
            const selectedColor = base ? (opts?.deriveSelectedColor ? opts.deriveSelectedColor(base) : base) : undefined
            const highlightColor = base ? (opts?.deriveHighlightColor ? opts.deriveHighlightColor(base) : selectedColor) : undefined
            try { map.setFeatureState({ source: 'buildings', id }, { selected: true, selectedColor, highlight: true, highlightColor }) } catch (e) { }
        }
        refs.selectedPrev = id
    }

    const hoverHandler = (e: any) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = typeof feat.id === 'number' ? feat.id : parseInt(String(feat.id), 10)
        setHover(id)
    }
    const clickHandler = (e: any) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = typeof feat.id === 'number' ? feat.id : parseInt(String(feat.id), 10)
        refs.selected = id
        setSelected(id)
        setHover(null)
        const geom = feat.geometry
        if (geom) {
            if (geom.type === 'Polygon') {
                const ring = geom.coordinates[0]
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                for (const c of ring) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                if (isFinite(minX)) {
                    fitBoundsSmart(map, [[minX, minY], [maxX, maxY]])
                    try { window.dispatchEvent(new CustomEvent('map:feature-click', { detail: feat })) } catch (e) { }
                    return
                }
            } else if (geom.type === 'MultiPolygon') {
                // choose largest polygon by area
                let best: { area: number, bounds: [number, number, number, number] } | null = null
                for (const poly of geom.coordinates) {
                    const ring = poly[0]
                    let a = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    for (let i = 0; i < ring.length - 1; i++) { const x0 = ring[i][0], y0 = ring[i][1], x1 = ring[i + 1][0], y1 = ring[i + 1][1]; a += (x0 * y1 - x1 * y0); if (x0 < minX) minX = x0; if (y0 < minY) minY = y0; if (x0 > maxX) maxX = x0; if (y0 > maxY) maxY = y0 }
                    a = Math.abs(a) / 2
                    if (!best || a > best.area) best = { area: a, bounds: [minX, minY, maxX, maxY] }
                }
                if (best) {
                    fitBoundsSmart(map, [[best.bounds[0], best.bounds[1]], [best.bounds[2], best.bounds[3]]])
                    try { window.dispatchEvent(new CustomEvent('map:feature-click', { detail: feat })) } catch (e) { }
                    return
                }
            }
        }
        const center = (e.lngLat && [e.lngLat.lng, e.lngLat.lat]) as [number, number] | undefined
        // only flyTo if the center point is outside current view to avoid jitter
        if (center) {
            try {
                const p = map.project(center as any)
                const w = map.getCanvas().width, h = map.getCanvas().height
                // keep 10px margin
                if (p.x < 10 || p.x > w - 10 || p.y < 10 || p.y > h - 10) {
                    map.flyTo({ center, zoom: 16 })
                }
            } catch (e) { try { map.flyTo({ center, zoom: 16 }) } catch (e) { } }
        }
        // dispatch a global event so UI components can react to feature clicks
        try { window.dispatchEvent(new CustomEvent('map:feature-click', { detail: feat })) } catch (e) { }
    }

    map.on('mousemove', 'buildings-extrusion', hoverHandler)
    map.on('mousemove', 'buildings-fill', hoverHandler)
    map.on('click', 'buildings-extrusion', clickHandler)
    map.on('click', 'buildings-fill', clickHandler)
    map.on('click', (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['buildings-fill', 'buildings-extrusion'] })
        if (!features || features.length === 0) {
            setSelected(null)
            refs.selected = null
            // Clear highlight from search when clicking outside
            try { window.dispatchEvent(new CustomEvent('map:highlight-clear')) } catch { }
        }
    })
    map.on('mouseleave', 'buildings-extrusion', () => setHover(null))
    map.on('mouseleave', 'buildings-fill', () => setHover(null))
    map.on('mouseenter', 'buildings-extrusion', () => map.getCanvas().style.cursor = 'pointer')
    map.on('mouseenter', 'buildings-fill', () => map.getCanvas().style.cursor = 'pointer')
}
