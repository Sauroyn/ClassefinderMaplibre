import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import maplibre from 'maplibre-gl'
import UserGeolocate from './UserGeolocate'
import { addBuildingsSource, addCentroidsSource } from '../map/sources'
import { addFillLayers, addNameLayer } from '../map/layers'
import { generateCentroids } from '../map/generateCentroids'
import { addInteractions } from '../map/interactions'
import { USER_CONNECTOR_COLOR, USER_CONNECTOR_OPACITY, USER_CONNECTOR_WIDTH } from '../map/route/markers'
import { fitBoundsSmart } from '../map/viewport'

type Props = { data: any | null, level: number, theme?: 'light' | 'dark', onThemeChange?: (t: 'light' | 'dark') => void }

const CONFIG_STORAGE_KEY = 'site_config_file'

export default forwardRef(function MapView({ data, level, theme = 'light', onThemeChange }: Props, ref) {
    const container = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibre.Map | null>(null)
    const latestDataRef = useRef<any | null>(null)
    const initialized = useRef(false)
    const initialCamera = useRef<any>(null)
    const parsedConfigRef = useRef<any | null>(null)
    useEffect(() => {
        if (!container.current) return

        (async () => {
            // defaults (Paris)
            let center: [number, number] = [2.3522, 48.8566]
            let zoom = 12
            try {
                const sel = (typeof window !== 'undefined') ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
                if (sel) {
                    try {
                        const base = (import.meta.env && (import.meta.env.BASE_URL || '/'))
                        const r = await fetch(base + 'configs/' + sel)
                        if (r.ok) {
                            const parsed = await r.json()
                            if (Array.isArray(parsed.initialCenter) && parsed.initialCenter.length === 2) center = [parsed.initialCenter[0], parsed.initialCenter[1]]
                            if (typeof parsed.initialZoom === 'number') zoom = parsed.initialZoom
                            parsedConfigRef.current = {
                                fillColor: parsed.fillColor || parsed.color || undefined,
                                fillHeight: (typeof parsed.fillHeight === 'number') ? parsed.fillHeight : undefined,
                                transitionZoom: (typeof parsed.transitionZoom === 'number') ? parsed.transitionZoom : undefined
                            }
                        }
                    } catch (e) { /* ignore fetch/parse errors */ }
                }
            } catch (e) { /* ignore localStorage errors */ }

            const lightStyle = 'https://api.maptiler.com/maps/basic-v2/style.json?key=BiyHHi8FTQZ233ADqskZ'
            const darkStyle = 'https://api.maptiler.com/maps/dataviz-dark/style.json?key=BiyHHi8FTQZ233ADqskZ'
            const map = new maplibre.Map({ container: container.current!, style: theme === 'dark' ? darkStyle : lightStyle, center, zoom })
            mapRef.current = map

            const saveInit = () => { const c = map.getCenter(); initialCamera.current = { center: [c.lng, c.lat], zoom: map.getZoom() } }

            const loadRouteIcons = async () => {
                const tryLoad = (url: string, name: string) => new Promise<boolean>(async (resolve) => {
                    try {
                        const img = new Image()
                        img.crossOrigin = 'anonymous'
                        img.src = url
                        try {
                            if ((img as any).decode) await (img as any).decode()
                        } catch (e) {
                            // decode failed
                            resolve(false)
                            return
                        }
                        try {
                            if (!(map as any).hasImage || !(map as any).hasImage(name)) (map as any).addImage(name, img as any)
                            resolve(true)
                        } catch (e) {
                            resolve(false)
                        }
                    } catch (e) {
                        resolve(false)
                    }
                })

                const rawStartCandidates = ['/start-icon.svg', '/marker-start.svg', '/start.svg', '/marker-start-icon.svg', '/icons/marker-start.svg']
                const rawEndCandidates = ['/end-icon.svg', '/marker-end.svg', '/end.svg', '/marker-end-icon.svg', '/icons/marker-end.svg']
                const prefix = (import.meta.env && (import.meta.env.BASE_URL || '/'))
                const startCandidates = rawStartCandidates.map(u => u.startsWith('/') ? (prefix + u.slice(1)) : u)
                const endCandidates = rawEndCandidates.map(u => u.startsWith('/') ? (prefix + u.slice(1)) : u)

                let ok = false
                for (const c of startCandidates) {
                    if (await tryLoad(c, 'marker-start')) { ok = true; break }
                }
                if (!ok) console.warn('[MapView] no start marker icon found in public/ (tried common names)')

                ok = false
                for (const c of endCandidates) {
                    if (await tryLoad(c, 'marker-end')) { ok = true; break }
                }
                if (!ok) console.warn('[MapView] no end marker icon found in public/ (tried common names)')

                const ensureImage = (name: string, color: string) => {
                    try {
                        if ((map as any).hasImage && (map as any).hasImage(name)) return
                    } catch (e) { }
                    try {
                        const size = 48
                        const canvas = document.createElement('canvas')
                        canvas.width = size; canvas.height = size
                        const ctx = canvas.getContext('2d')!
                        ctx.clearRect(0, 0, size, size)
                        ctx.beginPath()
                        ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2)
                        ctx.fillStyle = color
                        ctx.fill()
                        ctx.beginPath()
                        ctx.arc(size / 2, size / 2, size * 0.12, 0, Math.PI * 2)
                        ctx.fillStyle = '#ffffff'
                        ctx.fill()
                        const img = ctx.getImageData(0, 0, size, size)
                        if ((map as any).addImage) (map as any).addImage(name, img)
                    } catch (e) { }
                }
                ensureImage('marker-start', '#2ecc71')
                ensureImage('marker-end', '#e74c3c')
            }

            if (map.loaded()) { saveInit(); loadRouteIcons() } else map.on('load', () => { saveInit(); loadRouteIcons() })
            return () => { map.remove(); mapRef.current = null }
        })()
    }, [])

    // initialize sources/layers when data becomes available
    useEffect(() => {
        const map = mapRef.current
        latestDataRef.current = data
        if (!map || !data || initialized.current) return
        const init = () => {
            try {
                // Before adding source, if theme is dark, derive a dark color property from the light one
                let themedData = data
                try {
                    if (data && data.type === 'FeatureCollection') {
                        const deriveDark = (hex: string): string => {
                            // convert to HSL and shift towards darker/desaturated tone
                            const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex || '')
                            if (!m) return hex
                            const h = hex.replace('#', '')
                            const parse = (c: string) => c.length === 1 ? parseInt(c + c, 16) : parseInt(c, 16)
                            const r = parse(h.substring(0, h.length === 3 ? 1 : 2))
                            const g = parse(h.substring(h.length === 3 ? 1 : 2, h.length === 3 ? 2 : 4))
                            const b = parse(h.substring(h.length === 3 ? 2 : 4, h.length === 3 ? 3 : 6))
                            const rn = r / 255, gn = g / 255, bn = b / 255
                            const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
                            let hdeg = 0, s = 0, l = (max + min) / 2
                            if (max !== min) {
                                const d = max - min
                                s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
                                switch (max) {
                                    case rn: hdeg = (gn - bn) / d + (gn < bn ? 6 : 0); break
                                    case gn: hdeg = (bn - rn) / d + 2; break
                                    case bn: hdeg = (rn - gn) / d + 4; break
                                }
                                hdeg = hdeg * 60
                            }
                            // Dark mode adjustment: reduce lightness, reduce saturation slightly
                            const l2 = Math.max(0, l * 0.55)
                            const s2 = Math.max(0, s * 0.85)
                            // HSL -> RGB
                            const C = (1 - Math.abs(2 * l2 - 1)) * s2
                            const X = C * (1 - Math.abs(((hdeg / 60) % 2) - 1))
                            const m2 = l2 - C / 2
                            let r1 = 0, g1 = 0, b1 = 0
                            if (hdeg < 60) { r1 = C; g1 = X; b1 = 0 }
                            else if (hdeg < 120) { r1 = X; g1 = C; b1 = 0 }
                            else if (hdeg < 180) { r1 = 0; g1 = C; b1 = X }
                            else if (hdeg < 240) { r1 = 0; g1 = X; b1 = C }
                            else if (hdeg < 300) { r1 = X; g1 = 0; b1 = C }
                            else { r1 = C; g1 = 0; b1 = X }
                            const R = Math.round((r1 + m2) * 255)
                            const G = Math.round((g1 + m2) * 255)
                            const B = Math.round((b1 + m2) * 255)
                            const toHex = (n: number) => n.toString(16).padStart(2, '0')
                            return `#${toHex(R)}${toHex(G)}${toHex(B)}`
                        }
                        const next = {
                            ...data,
                            features: data.features.map((f: any) => {
                                try {
                                    const p = { ...(f.properties || {}) }
                                    if (p.color && typeof p.color === 'string') p.darkColor = deriveDark(p.color)
                                    return { ...f, properties: p }
                                } catch { return f }
                            })
                        }
                        themedData = next
                    }
                } catch { }
                addBuildingsSource(map, themedData)
                // derive cfg color for dark if needed
                const cfg0 = parsedConfigRef.current || undefined
                const cfg = (() => {
                    if (!cfg0) return cfg0
                    if (!cfg0.fillColor || theme !== 'dark') return cfg0
                    const deriveDark = (hex: string): string => {
                        const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex || '')
                        if (!m) return hex
                        const h = hex.replace('#', '')
                        const parse = (c: string) => c.length === 1 ? parseInt(c + c, 16) : parseInt(c, 16)
                        const r = parse(h.substring(0, h.length === 3 ? 1 : 2))
                        const g = parse(h.substring(h.length === 3 ? 1 : 2, h.length === 3 ? 2 : 4))
                        const b = parse(h.substring(h.length === 3 ? 2 : 4, h.length === 3 ? 3 : 6))
                        const rn = r / 255, gn = g / 255, bn = b / 255
                        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
                        let hdeg = 0, s = 0, l = (max + min) / 2
                        if (max !== min) {
                            const d = max - min
                            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
                            switch (max) {
                                case rn: hdeg = (gn - bn) / d + (gn < bn ? 6 : 0); break
                                case gn: hdeg = (bn - rn) / d + 2; break
                                case bn: hdeg = (rn - gn) / d + 4; break
                            }
                            hdeg = hdeg * 60
                        }
                        const l2 = Math.max(0, l * 0.55)
                        const s2 = Math.max(0, s * 0.85)
                        const C = (1 - Math.abs(2 * l2 - 1)) * s2
                        const X = C * (1 - Math.abs(((hdeg / 60) % 2) - 1))
                        const m2 = l2 - C / 2
                        let r1 = 0, g1 = 0, b1 = 0
                        if (hdeg < 60) { r1 = C; g1 = X; b1 = 0 }
                        else if (hdeg < 120) { r1 = X; g1 = C; b1 = 0 }
                        else if (hdeg < 180) { r1 = 0; g1 = C; b1 = X }
                        else if (hdeg < 240) { r1 = 0; g1 = X; b1 = C }
                        else if (hdeg < 300) { r1 = X; g1 = 0; b1 = C }
                        else { r1 = C; g1 = 0; b1 = X }
                        const R = Math.round((r1 + m2) * 255)
                        const G = Math.round((g1 + m2) * 255)
                        const B = Math.round((b1 + m2) * 255)
                        const toHex = (n: number) => n.toString(16).padStart(2, '0')
                        return `#${toHex(R)}${toHex(G)}${toHex(B)}`
                    }
                    return { ...cfg0, fillColor: deriveDark(cfg0.fillColor) }
                })()
                addFillLayers(map, level, cfg, theme)
                const centroids = generateCentroids(data)
                addCentroidsSource(map, centroids)
                addNameLayer(map, level, theme)
                addInteractions(map, { hovered: null, selected: null, selectedPrev: null })
                initialized.current = true
            } catch (e) { console.warn('init map sources failed', e) }
        }
        if (map.loaded()) init()
        else map.on('load', init)
    }, [data, level])
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        try { (map as any).__currentLevel = level } catch (e) { }
        const filter = ['==', ['get', 'level'], level]
        try {
            if (map.getLayer('buildings-extrusion')) map.setFilter('buildings-extrusion', filter as any)
            if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filter as any)
            if (map.getLayer('buildings-name')) map.setFilter('buildings-name', filter as any)
            // apply filter to any route-planner layers (IDs like "route-planner-0-line")
            const applyRouteFilterToAll = () => {
                try {
                    const style = map.getStyle && map.getStyle()
                    const layers = (style && style.layers) || []
                    const routeFilter = [
                        'any',
                        ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                        ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]],
                        ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
                    ]
                    for (const lyr of layers) {
                        if (lyr && typeof lyr.id === 'string' && lyr.id.startsWith('route-planner-')) {
                            try { map.setFilter(lyr.id, routeFilter as any) } catch (e) { }
                        }
                    }
                } catch (e) { }
            }
            applyRouteFilterToAll()
            // show/hide DOM markers for start/end based on current level
            try {
                const m = (map as any).__routePlannerMarkers
                if (m) {
                    const applyVisibility = (marker: any, itemLevel: any, itemLevels: any) => {
                        try {
                            if (!marker || !marker.getElement) return
                            const el = marker.getElement()
                            // fallback to dataset on element if meta not provided
                            let lvl = itemLevel
                            let lvls = itemLevels
                            try {
                                if ((lvl === null || lvl === undefined) && el.dataset && el.dataset.level) lvl = Number(el.dataset.level)
                                if ((!lvls || !Array.isArray(lvls)) && el.dataset && el.dataset.levels) lvls = String(el.dataset.levels).split(',').map(v => { const n = Number(v); return Number.isNaN(n) ? v : n })
                            } catch (e) { }
                            if (lvl !== null && lvl !== undefined) {
                                el.style.display = (lvl === level) ? 'block' : 'none'
                            } else if (lvls && Array.isArray(lvls)) {
                                el.style.display = (lvls.indexOf(level) !== -1) ? 'block' : 'none'
                            } else {
                                // if no level info, show by default
                                el.style.display = 'block'
                            }
                        } catch (e) { }
                    }
                    try { applyVisibility(m.start, (m.startLevel ?? null), m.startLevels) } catch (e) { }
                    try { applyVisibility(m.end, (m.endLevel ?? null), m.endLevels) } catch (e) { }
                }
            } catch (e) { }
            // ensure that if the route layer/source is added later (by compute), we re-apply the filter
            const onData = () => { applyRouteFilterToAll() }
            map.on('sourcedata', onData)
            // remove listener on cleanup
            return () => { try { map.off('sourcedata', onData) } catch (e) { } }
        } catch (e) { }
    }, [level])
    useImperativeHandle(ref, () => ({
        getMap: () => mapRef.current,
        selectFeatureById: (id: number | string) => {
            const map = mapRef.current
            if (!map) return
            try {
                if (!map.getSource || !map.getSource('buildings')) return
            } catch (e) { return }
            const features = map.querySourceFeatures('buildings', { sourceLayer: undefined, filter: ['==', ['id'], id] })
            const feat = features && features[0]
            if (feat && feat.geometry) {
                if (feat.geometry.type === 'Polygon') {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    const coords = feat.geometry.coordinates[0]
                    for (const c of coords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                    if (isFinite(minX)) { fitBoundsSmart(map, [[minX, minY], [maxX, maxY]]); return }
                } else if (feat.geometry.type === 'MultiPolygon') {
                    let best: { area: number, bounds: [number, number, number, number] } | null = null
                    for (const poly of feat.geometry.coordinates) {
                        const ring = poly[0]
                        let a = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                        for (let i = 0; i < ring.length - 1; i++) { const x0 = ring[i][0], y0 = ring[i][1], x1 = ring[i + 1][0], y1 = ring[i + 1][1]; a += (x0 * y1 - x1 * y0); if (x0 < minX) minX = x0; if (y0 < minY) minY = y0; if (x0 > maxX) maxX = x0; if (y0 > maxY) maxY = y0 }
                        a = Math.abs(a) / 2
                        if (!best || a > best.area) best = { area: a, bounds: [minX, minY, maxX, maxY] }
                    }
                    if (best) { fitBoundsSmart(map, [[best.bounds[0], best.bounds[1]], [best.bounds[2], best.bounds[3]]]); return }
                }
            }
            // if feature wasn't found in the source, try to find it in latestDataRef (search results when data not yet added)
            try {
                const d = latestDataRef.current
                if (d && d.features && d.features.length) {
                    const found = d.features.find((f: any) => (f.id ?? f.properties?.id ?? f.properties?.name) === id || (f.properties && f.properties.name) === id)
                    if (found && found.geometry) {
                        const geom = found.geometry
                        if (geom.type === 'Polygon') {
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                            const coords = geom.coordinates[0]
                            for (const c of coords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                            if (isFinite(minX)) { fitBoundsSmart(map, [[minX, minY], [maxX, maxY]]); return }
                        } else if (geom.type === 'MultiPolygon') {
                            let best: { area: number, bounds: [number, number, number, number] } | null = null
                            for (const poly of geom.coordinates) {
                                const ring = poly[0]
                                let a = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                                for (let i = 0; i < ring.length - 1; i++) { const x0 = ring[i][0], y0 = ring[i][1], x1 = ring[i + 1][0], y1 = ring[i + 1][1]; a += (x0 * y1 - x1 * y0); if (x0 < minX) minX = x0; if (y0 < minY) minY = y0; if (x0 > maxX) maxX = x0; if (y0 > maxY) maxY = y0 }
                                a = Math.abs(a) / 2
                                if (!best || a > best.area) best = { area: a, bounds: [minX, minY, maxX, maxY] }
                            }
                            if (best) { fitBoundsSmart(map, [[best.bounds[0], best.bounds[1]], [best.bounds[2], best.bounds[3]]]); return }
                        }
                    }
                }
            } catch (e) { }
            // else: do nothing (avoid unnecessary zooming)
            // ensure feature-state selection is applied
            try {
                const all = map.querySourceFeatures('buildings') || []
                for (const f of all) try { map.setFeatureState({ source: 'buildings', id: f.id }, { selected: false, hover: false }) } catch (e) { }
                try { map.setFeatureState({ source: 'buildings', id }, { selected: true }) } catch (e) { }
            } catch (e) { }
        }
        ,
        getCamera: () => {
            const map = mapRef.current
            if (!map) return null
            const c = map.getCenter()
            return { center: [c.lng, c.lat] as [number, number], zoom: map.getZoom() }
        },
        restoreCamera: (cam: any) => {
            const map = mapRef.current
            if (!map || !cam) return
            if (Array.isArray(cam.center) && cam.center.length === 2) map.flyTo({ center: cam.center as [number, number], zoom: cam.zoom })
        },
        restoreInitialCamera: () => {
            const map = mapRef.current
            if (!map || !initialCamera.current) return
            map.flyTo({ center: initialCamera.current.center as [number, number], zoom: initialCamera.current.zoom })
        },
        clearSelection: () => {
            const map = mapRef.current
            if (!map) return
            // try to unset any selected feature state by querying source features
            try {
                const features = map.querySourceFeatures('buildings')
                for (const f of features) try { map.setFeatureState({ source: 'buildings', id: f.id }, { selected: false, hover: false }) } catch (e) { }
            } catch (e) { }
        }
        ,
        clearRoute: () => {
            const map = mapRef.current
            if (!map) return
            try {
                // remove any layer/source created for route-planner (route-planner-0, -1, ...)
                try {
                    const style = map.getStyle && map.getStyle()
                    const layers = (style && style.layers) || []
                    for (const l of layers) {
                        if (typeof l.id === 'string' && l.id.startsWith('route-planner-')) {
                            try { if (map.getLayer && map.getLayer(l.id)) map.removeLayer(l.id) } catch (e) { }
                        }
                    }
                } catch (e) { }
                try {
                    const style = map.getStyle && map.getStyle()
                    const sources = (style && style.sources) || {}
                    for (const s of Object.keys(sources)) {
                        if (s.startsWith('route-planner-')) {
                            try { if (map.getSource && map.getSource(s)) map.removeSource(s) } catch (e) { }
                        }
                    }
                } catch (e) { }
                // also remove start/end symbol and circle layers/sources if present
                try { if (map.getLayer && map.getLayer('route-planner-start-symbol')) map.removeLayer('route-planner-start-symbol') } catch (e) { }
                try { if (map.getLayer && map.getLayer('route-planner-start-circle')) map.removeLayer('route-planner-start-circle') } catch (e) { }
                try { if (map.getLayer && map.getLayer('route-planner-end-symbol')) map.removeLayer('route-planner-end-symbol') } catch (e) { }
                try { if (map.getLayer && map.getLayer('route-planner-end-circle')) map.removeLayer('route-planner-end-circle') } catch (e) { }
                // remove user connector
                try { if (map.getLayer && map.getLayer('route-planner-user-connector-line')) map.removeLayer('route-planner-user-connector-line') } catch (e) { }
                try { if (map.getSource && map.getSource('route-planner-user-connector')) map.removeSource('route-planner-user-connector') } catch (e) { }
                try { if (map.getSource && map.getSource('route-planner-start')) map.removeSource('route-planner-start') } catch (e) { }
                try { if (map.getSource && map.getSource('route-planner-end')) map.removeSource('route-planner-end') } catch (e) { }
                // also remove any DOM markers created by route planner
                try {
                    const m = (map as any).__routePlannerMarkers
                    if (m) {
                        try { if (m.start && m.start.remove) m.start.remove() } catch (e) { }
                        try { if (m.end && m.end.remove) m.end.remove() } catch (e) { }
                        try { delete (map as any).__routePlannerMarkers } catch (e) { }
                    }
                } catch (e) { }
            } catch (e) { }
        }
    }))

    // Respond to theme changes: swap style and restore custom layers/sources (buildings, names, routes)
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        try {
            const lightStyle = 'https://api.maptiler.com/maps/basic-v2/style.json?key=BiyHHi8FTQZ233ADqskZ'
            const darkStyle = 'https://api.maptiler.com/maps/dataviz-dark/style.json?key=BiyHHi8FTQZ233ADqskZ'
            const target = theme === 'dark' ? darkStyle : lightStyle
            // Always setStyle; preserve camera
            const cam = { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }
            // Snapshot current route sources' data so we can restore them after the style reload
            const savedRouteSources: Array<{ id: string, data: any }> = []
            try {
                const style = map.getStyle && map.getStyle()
                const sources = (style && style.sources) || {}
                for (const sid of Object.keys(sources)) {
                    if (sid.startsWith('route-planner-')) {
                        try {
                            const src: any = (map.getSource && map.getSource(sid)) || null
                            if (src && src._data) savedRouteSources.push({ id: sid, data: src._data })
                        } catch { }
                    }
                }
            } catch { }
            ; (map as any).setStyle(target, { diff: true })
            map.once('styledata', () => {
                try {
                    // re-add our custom sources/layers if needed
                    const d = latestDataRef.current || data
                    if (!d) return
                    // add sources if missing
                    if (!map.getSource('buildings')) {
                        // regenerate themed data
                        const themed = (() => {
                            try {
                                if (d && d.type === 'FeatureCollection') {
                                    const deriveDark = (hex: string): string => {
                                        const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex || '')
                                        if (!m) return hex
                                        const h = hex.replace('#', '')
                                        const parse = (c: string) => c.length === 1 ? parseInt(c + c, 16) : parseInt(c, 16)
                                        const r = parse(h.substring(0, h.length === 3 ? 1 : 2))
                                        const g = parse(h.substring(h.length === 3 ? 1 : 2, h.length === 3 ? 2 : 4))
                                        const b = parse(h.substring(h.length === 3 ? 2 : 4, h.length === 3 ? 3 : 6))
                                        const rn = r / 255, gn = g / 255, bn = b / 255
                                        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
                                        let hdeg = 0, s = 0, l = (max + min) / 2
                                        if (max !== min) {
                                            const dlt = max - min
                                            s = l > 0.5 ? dlt / (2 - max - min) : dlt / (max + min)
                                            switch (max) {
                                                case rn: hdeg = (gn - bn) / dlt + (gn < bn ? 6 : 0); break
                                                case gn: hdeg = (bn - rn) / dlt + 2; break
                                                case bn: hdeg = (rn - gn) / dlt + 4; break
                                            }
                                            hdeg = hdeg * 60
                                        }
                                        const l2 = Math.max(0, l * 0.55)
                                        const s2 = Math.max(0, s * 0.85)
                                        const C = (1 - Math.abs(2 * l2 - 1)) * s2
                                        const X = C * (1 - Math.abs(((hdeg / 60) % 2) - 1))
                                        const m2 = l2 - C / 2
                                        let r1 = 0, g1 = 0, b1 = 0
                                        if (hdeg < 60) { r1 = C; g1 = X; b1 = 0 }
                                        else if (hdeg < 120) { r1 = X; g1 = C; b1 = 0 }
                                        else if (hdeg < 180) { r1 = 0; g1 = C; b1 = X }
                                        else if (hdeg < 240) { r1 = 0; g1 = X; b1 = C }
                                        else if (hdeg < 300) { r1 = X; g1 = 0; b1 = C }
                                        else { r1 = C; g1 = 0; b1 = X }
                                        const R = Math.round((r1 + m2) * 255)
                                        const G = Math.round((g1 + m2) * 255)
                                        const B = Math.round((b1 + m2) * 255)
                                        const toHex = (n: number) => n.toString(16).padStart(2, '0')
                                        return `#${toHex(R)}${toHex(G)}${toHex(B)}`
                                    }
                                    return {
                                        ...d,
                                        features: d.features.map((f: any) => {
                                            const p = { ...(f.properties || {}) }
                                            if (p.color && typeof p.color === 'string') p.darkColor = deriveDark(p.color)
                                            return { ...f, properties: p }
                                        })
                                    }
                                }
                            } catch { }
                            return d
                        })()
                        addBuildingsSource(map, themed)
                    }
                    // layers (derive cfg for dark)
                    const cfg0b = parsedConfigRef.current || undefined
                    const cfgb = (() => {
                        if (!cfg0b) return cfg0b
                        if (!cfg0b.fillColor || theme !== 'dark') return cfg0b
                        const deriveDark = (hex: string): string => {
                            const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex || '')
                            if (!m) return hex
                            const h = hex.replace('#', '')
                            const parse = (c: string) => c.length === 1 ? parseInt(c + c, 16) : parseInt(c, 16)
                            const r = parse(h.substring(0, h.length === 3 ? 1 : 2))
                            const g = parse(h.substring(h.length === 3 ? 1 : 2, h.length === 3 ? 2 : 4))
                            const b = parse(h.substring(h.length === 3 ? 2 : 4, h.length === 3 ? 3 : 6))
                            const rn = r / 255, gn = g / 255, bn = b / 255
                            const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
                            let hdeg = 0, s = 0, l = (max + min) / 2
                            if (max !== min) {
                                const dlt = max - min
                                s = l > 0.5 ? dlt / (2 - max - min) : dlt / (max + min)
                                switch (max) {
                                    case rn: hdeg = (gn - bn) / dlt + (gn < bn ? 6 : 0); break
                                    case gn: hdeg = (bn - rn) / dlt + 2; break
                                    case bn: hdeg = (rn - gn) / dlt + 4; break
                                }
                                hdeg = hdeg * 60
                            }
                            const l2 = Math.max(0, l * 0.55)
                            const s2 = Math.max(0, s * 0.85)
                            const C = (1 - Math.abs(2 * l2 - 1)) * s2
                            const X = C * (1 - Math.abs(((hdeg / 60) % 2) - 1))
                            const m2 = l2 - C / 2
                            let r1 = 0, g1 = 0, b1 = 0
                            if (hdeg < 60) { r1 = C; g1 = X; b1 = 0 }
                            else if (hdeg < 120) { r1 = X; g1 = C; b1 = 0 }
                            else if (hdeg < 180) { r1 = 0; g1 = C; b1 = X }
                            else if (hdeg < 240) { r1 = 0; g1 = X; b1 = C }
                            else if (hdeg < 300) { r1 = X; g1 = 0; b1 = C }
                            else { r1 = C; g1 = 0; b1 = X }
                            const R = Math.round((r1 + m2) * 255)
                            const G = Math.round((g1 + m2) * 255)
                            const B = Math.round((b1 + m2) * 255)
                            const toHex = (n: number) => n.toString(16).padStart(2, '0')
                            return `#${toHex(R)}${toHex(G)}${toHex(B)}`
                        }
                        return { ...cfg0b, fillColor: deriveDark(cfg0b.fillColor) }
                    })()
                    addFillLayers(map, (map as any).__currentLevel ?? level, cfgb, theme)
                    const centroids = generateCentroids(d)
                    if (!map.getSource('buildings-centroids')) addCentroidsSource(map, centroids)
                    addNameLayer(map, (map as any).__currentLevel ?? level, theme)
                    addInteractions(map, { hovered: null, selected: null, selectedPrev: null })
                    // Restore previously drawn route layers/sources (lost during style swap)
                    try {
                        const levelNow = (map as any).__currentLevel ?? level
                        const routeFilter: any = [
                            'any',
                            ['all', ['has', 'level'], ['==', ['get', 'level'], levelNow]],
                            ['all', ['has', 'levels'], ['in', levelNow, ['get', 'levels']]],
                            ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
                        ]
                        for (const saved of savedRouteSources) {
                            try {
                                if (!map.getSource(saved.id)) map.addSource(saved.id, { type: 'geojson', data: saved.data, lineMetrics: true as any })
                            } catch { }
                            const layerId = `${saved.id}-line`
                            // Compute styling: connector vs route indexes (0 primary)
                            let paint: any = {}
                            if (saved.id === 'route-planner-user-connector') {
                                paint = { 'line-color': USER_CONNECTOR_COLOR, 'line-width': USER_CONNECTOR_WIDTH, 'line-opacity': USER_CONNECTOR_OPACITY }
                            } else {
                                let idx = -1
                                try { const m = /route-planner-(\d+)/.exec(saved.id); if (m) idx = parseInt(m[1], 10) } catch { idx = -1 }
                                const color = idx === 0 ? '#ff0000' : (idx === 1 ? '#999999' : '#cccccc')
                                const width = idx === 0 ? 18 : 12
                                const opacity = idx === 0 ? 1 : 0.6
                                paint = { 'line-color': color, 'line-width': width, 'line-opacity': opacity }
                            }
                            try {
                                if (!map.getLayer(layerId)) {
                                    map.addLayer({ id: layerId, type: 'line', source: saved.id, paint, layout: { 'line-cap': 'round', 'line-join': 'round' } })
                                }
                            } catch { }
                            try { map.setFilter(layerId, routeFilter) } catch { }
                        }
                        try { if (map.moveLayer) map.moveLayer('route-planner-0-line') } catch { }
                    } catch { }
                } catch (e) { }
                // restore camera
                try { map.jumpTo(cam as any) } catch { }
            })
        } catch { }
    }, [theme])

    return <>
        <div id="map" ref={container} style={{ height: '100vh' }} />
        <UserGeolocate map={mapRef.current} theme={theme} onToggleTheme={() => onThemeChange && onThemeChange(theme === 'dark' ? 'light' : 'dark')} />
    </>
})
