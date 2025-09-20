import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import maplibre from 'maplibre-gl'
import UserGeolocate from './UserGeolocate'
import { addBuildingsSource, addCentroidsSource } from '../map/sources'
import { addFillLayers, addNameLayer } from '../map/layers'
import { generateCentroids } from '../map/generateCentroids'
import { addInteractions } from '../map/interactions'
import { fitBoundsSmart } from '../map/viewport'

type Props = { data: any | null, level: number }

export default forwardRef(function MapView({ data, level }: Props, ref) {
    const container = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibre.Map | null>(null)
    const latestDataRef = useRef<any | null>(null)
    const initialized = useRef(false)
    const initialCamera = useRef<any>(null)
    useEffect(() => {
        if (!container.current) return
        const map = new maplibre.Map({ container: container.current, style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=BiyHHi8FTQZ233ADqskZ', center: [2.3522, 48.8566], zoom: 12 })
        mapRef.current = map
        // store initial camera when map is ready
        const saveInit = () => { const c = map.getCenter(); initialCamera.current = { center: [c.lng, c.lat], zoom: map.getZoom() } }

        // try to load start/end marker icons from `public/` and register them as map images
        const loadRouteIcons = async () => {
            const tryLoad = (url: string, name: string) => new Promise<boolean>(resolve => {
                try {
                    ; (map as any).loadImage(url, (err: any, img: any) => {
                        if (!err && img) {
                            try {
                                if (!(map as any).hasImage || !(map as any).hasImage(name)) (map as any).addImage(name, img)
                                resolve(true)
                                return
                            } catch (e) { /* ignore */ }
                        }
                        resolve(false)
                    })
                } catch (e) { resolve(false) }
            })

            const startCandidates = ['/marker-start.svg', '/marker-start.svg', '/start.svg', '/start-icon.svg', '/marker-start-icon.svg', '/icons/marker-start.svg']
            const endCandidates = ['/marker-end.svg', '/marker-end.svg', '/end.svg', '/end-icon.svg', '/marker-end-icon.svg', '/icons/marker-end.svg']

            let ok = false
            for (const c of startCandidates) {
                // eslint-disable-next-line no-await-in-loop
                if (await tryLoad(c, 'marker-start')) { ok = true; break }
            }
            if (!ok) console.warn('[MapView] no start marker icon found in public/ (tried common names)')

            ok = false
            for (const c of endCandidates) {
                // eslint-disable-next-line no-await-in-loop
                if (await tryLoad(c, 'marker-end')) { ok = true; break }
            }
            if (!ok) console.warn('[MapView] no end marker icon found in public/ (tried common names)')

            // if icons weren't found, create simple fallback markers via canvas and register them
            const ensureImage = (name: string, color: string) => {
                try {
                    if ((map as any).hasImage && (map as any).hasImage(name)) return
                } catch (e) { }
                try {
                    const size = 48
                    const canvas = document.createElement('canvas')
                    canvas.width = size; canvas.height = size
                    const ctx = canvas.getContext('2d')!
                    // transparent background
                    ctx.clearRect(0, 0, size, size)
                    // draw outer circle
                    ctx.beginPath()
                    ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2)
                    ctx.fillStyle = color
                    ctx.fill()
                    // draw inner white dot
                    ctx.beginPath()
                    ctx.arc(size / 2, size / 2, size * 0.12, 0, Math.PI * 2)
                    ctx.fillStyle = '#ffffff'
                    ctx.fill()
                    const img = ctx.getImageData(0, 0, size, size)
                    if ((map as any).addImage) (map as any).addImage(name, img)
                } catch (e) { }
            }
            // create fallbacks for start (green) and end (red)
            ensureImage('marker-start', '#2ecc71')
            ensureImage('marker-end', '#e74c3c')
        }

        if (map.loaded()) { saveInit(); loadRouteIcons() } else map.on('load', () => { saveInit(); loadRouteIcons() })
        return () => { map.remove(); mapRef.current = null }
    }, [])

    // initialize sources/layers when data becomes available
    useEffect(() => {
        const map = mapRef.current
        latestDataRef.current = data
        if (!map || !data || initialized.current) return
        const init = () => {
            try {
                addBuildingsSource(map, data)
                addFillLayers(map, level)
                const centroids = generateCentroids(data)
                addCentroidsSource(map, centroids)
                addNameLayer(map, level)
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

    return <>
        <div id="map" ref={container} style={{ height: '100vh' }} />
        <UserGeolocate map={mapRef.current} />
    </>
})
