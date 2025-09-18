import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import maplibre from 'maplibre-gl'
import { addBuildingsSource, addCentroidsSource } from '../map/sources'
import { addFillLayers, addNameLayer } from '../map/layers'
import { generateCentroids } from '../map/generateCentroids'
import { addInteractions } from '../map/interactions'

type Props = { data: any | null, level: number }

export default forwardRef(function MapView({ data, level }: Props, ref) {
    const container = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibre.Map | null>(null)
    const initialized = useRef(false)
    const initialCamera = useRef<any>(null)
    useEffect(() => {
        if (!container.current) return
        const map = new maplibre.Map({ container: container.current, style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=BiyHHi8FTQZ233ADqskZ', center: [2.3522, 48.8566], zoom: 12 })
        mapRef.current = map
        // store initial camera when map is ready
        const saveInit = () => { const c = map.getCenter(); initialCamera.current = { center: [c.lng, c.lat], zoom: map.getZoom() } }
        if (map.loaded()) saveInit(); else map.on('load', saveInit)
        return () => { map.remove(); mapRef.current = null }
    }, [])

    // initialize sources/layers when data becomes available
    useEffect(() => {
        const map = mapRef.current
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
        const filter = ['==', ['get', 'level'], level]
        try {
            if (map.getLayer('buildings-extrusion')) map.setFilter('buildings-extrusion', filter as any)
            if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filter as any)
            if (map.getLayer('buildings-name')) map.setFilter('buildings-name', filter as any)
            // also apply filter to route planner line if present
            if (map.getLayer('route-planner-line')) {
                // accept features where properties.level == level OR properties.levels contains level
                // show segments that explicitly match the level OR that list the level in levels
                // also show segments that have neither level nor levels properties (fallback segments)
                const routeFilter = [
                    'any',
                    ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                    ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]],
                    ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
                ]
                try { map.setFilter('route-planner-line', routeFilter as any) } catch (e) { }
            }
            // ensure that if the route layer/source is added later (by compute), we re-apply the filter
            const onData = () => {
                try {
                    if (map.getLayer('route-planner-line')) {
                        const routeFilter = [
                            'any',
                            ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                            ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]],
                            ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
                        ]
                        map.setFilter('route-planner-line', routeFilter as any)
                    }
                } catch (err) { }
            }
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
            const features = map.querySourceFeatures('buildings', { sourceLayer: undefined, filter: ['==', ['id'], id] })
            const feat = features && features[0]
            if (feat && feat.geometry) {
                if (feat.geometry.type === 'Polygon') {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    const coords = feat.geometry.coordinates[0]
                    for (const c of coords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                    if (isFinite(minX)) { map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, duration: 800 }); return }
                } else if (feat.geometry.type === 'MultiPolygon') {
                    let best: { area: number, bounds: [number, number, number, number] } | null = null
                    for (const poly of feat.geometry.coordinates) {
                        const ring = poly[0]
                        let a = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                        for (let i = 0; i < ring.length - 1; i++) { const x0 = ring[i][0], y0 = ring[i][1], x1 = ring[i + 1][0], y1 = ring[i + 1][1]; a += (x0 * y1 - x1 * y0); if (x0 < minX) minX = x0; if (y0 < minY) minY = y0; if (x0 > maxX) maxX = x0; if (y0 > maxY) maxY = y0 }
                        a = Math.abs(a) / 2
                        if (!best || a > best.area) best = { area: a, bounds: [minX, minY, maxX, maxY] }
                    }
                    if (best) { map.fitBounds([[best.bounds[0], best.bounds[1]], [best.bounds[2], best.bounds[3]]], { padding: 60, duration: 800 }); return }
                }
            }
            // fallback
            map.flyTo({ center: map.getCenter(), zoom: 16 })
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
            } catch (e) { }
        }
    }))

    return <div id="map" ref={container} style={{ height: '100vh' }} />
})
