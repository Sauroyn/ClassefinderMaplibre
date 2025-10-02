import { useState, useEffect } from 'react'
import { computeAndDrawRoute } from '../map/computeRoute'
import { parseGeoJSON } from './route-planner/utils'
import type { Graph } from './route-planner/utils'
import Suggestions from './route-planner/Suggestions'
import RoutesList from './route-planner/RoutesList'
import SettingsPopover from './route-planner/SettingsPopover'
import Inputs from './route-planner/Inputs'
import RouteSheetModal from './route-planner/RouteSheetModal'
import RouteDetailModal from './route-planner/RouteDetailModal'
import NavigationModule from './route-planner/NavigationModule'
import { generateRouteSteps } from './route-planner/RouteStepsGenerator'
import { saveRoute } from '../utils/savedRoutes'

export default function RoutePlanner({ mapRef, initialDestination, initialStartId, initialStartName, initialEndId, initialEndName, onClose }: { mapRef: any, initialDestination?: any, initialStartId?: string, initialStartName?: string, initialEndId?: string, initialEndName?: string, onClose?: () => void }) {
    const [graph, setGraph] = useState<Graph | null>(null)
    const [start, setStart] = useState<string>('')
    const [end, setEnd] = useState<string>('')

    const [nodeOptions, setNodeOptions] = useState<Array<{ id: string, name: string, level?: string }>>([])
    const [startQuery, setStartQuery] = useState<string>('')
    const [endQuery, setEndQuery] = useState<string>('')
    const [focusedField, setFocusedField] = useState<'start' | 'end' | null>(null)

    useEffect(() => {
        // Load graph using selected config if available, else fall back to defaults
        const CONFIG_STORAGE_KEY = 'site_config_file'
        async function loadGraph() {
            const prefix = (import.meta.env && (import.meta.env.BASE_URL || '/'))
            let candidates: string[] = []
            try {
                const sel = (typeof window !== 'undefined') ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
                if (sel) {
                    try {
                        const r = await fetch(prefix + 'configs/' + sel)
                        if (r.ok) {
                            const parsed = await r.json()
                            if (parsed.graphGeojson && typeof parsed.graphGeojson === 'string') {
                                const url = prefix + String(parsed.graphGeojson).replace(/^\//, '')
                                candidates.push(url)
                            }
                        }
                    } catch (e) { /* ignore parse errors, will use fallbacks */ }
                }
            } catch (e) { /* ignore storage errors */ }
            // add fallbacks
            candidates.push(prefix + 'testGraph.geojson')
            candidates.push(prefix + 'Paris-graph.geojson')

            for (const url of candidates) {
                try {
                    console.log('[RoutePlanner] trying to load graph', url)
                    const r = await fetch(url)
                    if (!r.ok) continue
                    const j = await r.json()
                    const g = parseGeoJSON(j)
                    console.log('[RoutePlanner] parsed graph', g)
                    setGraph(g)
                    setNodeOptions(g.nodes.map(n => {
                        const raw = n.raw || {}
                        const props = raw.properties || {}
                        const level = props.level ?? props.floor ?? (Array.isArray(props.levels) ? props.levels[0] : undefined)
                        return { id: n.id, name: n.name ?? n.id, level: level != null ? String(level) : '' }
                    }))
                    // success
                    return
                } catch (e) { /* try next candidate */ }
            }
            console.warn('[RoutePlanner] no graph file found from config nor defaults')
        }
        loadGraph()
    }, [])

    // if an initialDestination was provided (from SearchBar), try to set end field
    useEffect(() => {
        if (!initialDestination) return
        // initialDestination may be a GeoJSON feature or an object { id, name }
        const feat = initialDestination as any
        const name = feat.properties?.name ?? feat.name ?? feat.properties?.title
        const id = feat.id ?? feat.properties?.id ?? feat.properties?.ref ?? feat.properties?.name ?? feat.name
        // Prefer setting the visible query to the human name when available
        if (name) {
            setEndQuery(String(name))
        }
        // Try to set internal end ID only if we can match a node from nodeOptions
        const sid = id != null ? String(id) : null
        if (sid) {
            // try to find by id first
            let found = nodeOptions.find(n => String(n.id) === sid)
            // if not found, try to find by name (useful when feature id is numeric but node names are letters)
            if (!found && name) found = nodeOptions.find(n => String(n.name) === String(name))
            if (found) {
                setEnd(found.id)
                setEndQuery(found.name)
            }
        }
    }, [initialDestination, nodeOptions])

    // prefill start/end if explicitly provided (e.g., from EventSelector decision)
    useEffect(() => {
        if (!nodeOptions || nodeOptions.length === 0) return
        if (initialStartId) {
            setStart(initialStartId)
            if (initialStartName) setStartQuery(initialStartName)
        }
        if (initialEndId) {
            setEnd(initialEndId)
            if (initialEndName) setEndQuery(initialEndName)
        }
    }, [initialStartId, initialStartName, initialEndId, initialEndName, nodeOptions])

    // no file input handling: graph loaded from defaults only

    const [routes, setRoutes] = useState<Array<any>>([])
    const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null)
    const [excludeStairs, setExcludeStairs] = useState<boolean>(false)
    const [coveredOnly, setCoveredOnly] = useState<boolean>(false)
    const [showSecondary, setShowSecondary] = useState<boolean>(true)
    const [showSettings, setShowSettings] = useState<boolean>(false)

    // Nouveaux états pour les modales et la navigation
    const [showRouteSheet, setShowRouteSheet] = useState<boolean>(false)
    const [showRouteDetail, setShowRouteDetail] = useState<boolean>(false)
    const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
    const [isNavigating, setIsNavigating] = useState<boolean>(false)
    const [navigationSteps, setNavigationSteps] = useState<any[]>([])
    const [routeSheetDismissed, setRouteSheetDismissed] = useState<boolean>(false)

    // Détection mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    async function compute() {
        if (!graph) { console.warn('[RoutePlanner] no graph loaded'); return }
        // clear previous routes while computing and reset dismissed state
        setRoutes([])
        setRouteSheetDismissed(false)
        try {
            // resolve 'USER_POSITION' pseudo-id to nearest node if present
            let s = start
            let e = end
            const nearestToUser = async (): Promise<string | null> => {
                try {
                    const user = await new Promise<{ lng: number, lat: number }>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition((pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }), (err) => reject(err), { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 })
                    })
                    let bestId: string | null = null
                    let bestD = Infinity
                    const toRad = (v: number) => v * Math.PI / 180
                    const hav = (a: [number, number], b: [number, number]) => {
                        const R = 6371000
                        const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
                        const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
                        const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
                        const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
                        return R * c
                    }
                    for (const n of graph.nodes) {
                        const d = hav([user.lng, user.lat], n.coord as [number, number])
                        if (d < bestD) { bestD = d; bestId = String(n.id) }
                    }
                    return bestId
                } catch { return null }
            }
            let userCoord: [number, number] | null = null
            if (s === 'USER_POSITION') { const nid = await nearestToUser(); if (nid) { s = nid; try { const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 })); userCoord = [pos.coords.longitude, pos.coords.latitude] } catch { } } }
            if (e === 'USER_POSITION') { const nid = await nearestToUser(); if (nid) { e = nid; try { const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 })); userCoord = [pos.coords.longitude, pos.coords.latitude] } catch { } } }
            const k = showSecondary ? 3 : 1
            const res = await computeAndDrawRoute({ graph, start: s, end: e, excludeStairs, coveredOnly, mapRef, k, userOriginLngLat: userCoord || undefined })
            if (res && res.routes) setRoutes(res.routes)
        } catch (err) { console.error('[RoutePlanner] compute failed', err) }
    }

    // clearMap removed: route cleared when planner closes or when path set to null

    // trigger compute automatically when both start and end IDs are present
    useEffect(() => {
        if (graph && start && end) {
            compute()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, end, graph])

    // Afficher la modal des itinéraires sur mobile quand il y a des résultats
    useEffect(() => {
        if (routes && routes.length > 0 && isMobile && !isNavigating && !showRouteDetail && !routeSheetDismissed) {
            // Délai très court pour éviter les conflits de state
            const timer = setTimeout(() => {
                setShowRouteSheet(true)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [routes, isMobile, isNavigating, showRouteDetail, routeSheetDismissed])

    // Empêcher la fermeture des modales par swipe en les ré-ouvrant si besoin
    useEffect(() => {
        if (!isMobile) return
        if (routes.length === 0) return
        if (!isNavigating && !showRouteDetail && !showRouteSheet && !routeSheetDismissed) {
            const t = setTimeout(() => setShowRouteSheet(true), 50)
            return () => clearTimeout(t)
        }
    }, [showRouteSheet, showRouteDetail, isNavigating, isMobile, routes.length, routeSheetDismissed])

    // Ecouter les évènements hors itinéraire pour recalculer
    useEffect(() => {
        const onOff = () => {
            if (!graph || !isNavigating || !selectedRoute) return
            try {
                // on recalcule depuis la position utilisateur (USER_POSITION) jusqu'à la fin prévue
                const endId = end
                computeAndDrawRoute({ graph, start: 'USER_POSITION', end: endId, excludeStairs, coveredOnly, mapRef, k: showSecondary ? 3 : 1 })
                    .then(res => {
                        if (res && res.routes && res.routes.length) {
                            setRoutes(res.routes)
                            const primary = res.routes[0]
                            setSelectedRoute(primary)
                            try {
                                const steps = generateRouteSteps(graph, primary.path)
                                setNavigationSteps(steps)
                            } catch { }
                        }
                    })
                    .catch(() => { })
            } catch { }
        }
        window.addEventListener('route:off', onOff as any)
        return () => { window.removeEventListener('route:off', onOff as any) }
    }, [graph, isNavigating, selectedRoute, end, excludeStairs, coveredOnly, mapRef, showSecondary])

    // Nouvelles fonctions pour la gestion des modales et navigation
    const handleSelectRoute = (route: any) => {
        console.log('[RoutePlanner] handleSelectRoute called with:', route)
        setSelectedRoute(route)
        setShowRouteSheet(false)
        setShowRouteDetail(true)
        console.log('[RoutePlanner] Setting showRouteDetail to true')

        // Génerer les étapes pour la navigation
        if (graph) {
            const steps = generateRouteSteps(graph, route.path)
            setNavigationSteps(steps)
            console.log('[RoutePlanner] Generated steps:', steps.length)
        }

        // Mettre en avant uniquement l'itinéraire sélectionné (couleur bleue), les autres conservent leur couleur d'origine
        try {
            const map = mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current))
            if (map) {
                const style = map.getStyle && map.getStyle()
                const layers = (style && style.layers) || []
                for (const lyr of layers) {
                    if (!lyr || typeof lyr.id !== 'string') continue
                    if (lyr.id.startsWith('route-planner-') && lyr.id.endsWith('-line')) {
                        // réinitialiser la couleur selon l'index
                        let idx = -1
                        try { const m = /route-planner-(\d+)-line/.exec(lyr.id); if (m) idx = parseInt(m[1], 10) } catch { idx = -1 }
                        const baseColor = idx === 0 ? '#ff0000' : (idx === 1 ? '#999999' : '#cccccc')
                        try { map.setPaintProperty(lyr.id, 'line-gradient', null) } catch { }
                        try { map.setPaintProperty(lyr.id, 'line-color', baseColor) } catch { }
                    }
                }
                // colorer la sélection en bleu
                try { map.setPaintProperty(route.layerId, 'line-color', '#007AFF') } catch { }
            }
        } catch (e) { }
    }

    const handleStartNavigation = () => {
        setShowRouteDetail(false)
        setIsNavigating(true)
    }

    const handleFinishNavigation = () => {
        setIsNavigating(false)
        setSelectedRoute(null)
        setNavigationSteps([])

        // Remettre la carte en vue normale
        const map = mapRef && mapRef.current && (
            mapRef.current.getMap ? mapRef.current.getMap() :
                (mapRef.current.map ? mapRef.current.map : mapRef.current)
        )
        if (map) {
            try {
                map.easeTo({
                    pitch: 0,
                    bearing: 0,
                    duration: 1000
                })

                // Réafficher tous les itinéraires
                routes.forEach((route) => {
                    try {
                        map.setLayoutProperty(route.layerId, 'visibility', 'visible')
                        // enlever tout dégradé de progression et restaurer couleurs de base
                        try { map.setPaintProperty(route.layerId, 'line-gradient', null) } catch { }
                        let idx = -1
                        try { const m = /route-planner-(\d+)-line/.exec(route.layerId); if (m) idx = parseInt(m[1], 10) } catch { idx = -1 }
                        const baseColor = idx === 0 ? '#ff0000' : (idx === 1 ? '#999999' : '#cccccc')
                        try { map.setPaintProperty(route.layerId, 'line-color', baseColor) } catch { }
                    } catch (e) { }
                })
            } catch (e) { }
        }
    }

    const handleSaveRoute = (route: any, name: string) => {
        try {
            saveRoute(route, name, graph)
            // Vous pourriez ajouter une notification ici
            console.log('Itinéraire sauvegardé:', name)
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error)
            // Vous pourriez ajouter une notification d'erreur ici
        }
    }

    // listen for map feature clicks to allow quick fill of focused field or set destination
    useEffect(() => {
        async function onMapFeatureClick(e: any) {
            const feat = e.detail as any
            if (!feat) return
            const name = feat.properties?.name ?? feat.properties?.title ?? feat.id
            const fid = feat.id ?? feat.properties?.id ?? name

            // try to find a matching node in the parsed graph by name or id (case-insensitive)
            const match = nodeOptions.find(n => String(n.id) === String(fid) || String((n.name || '')).toLowerCase() === String(name).toLowerCase())

            if (focusedField === 'start') {
                // if we matched a graph node, set its id; otherwise set raw feature id
                const setId = match ? String(match.id) : String(fid)
                setStart(setId); setStartQuery(String(match?.name ?? name)); setFocusedField(null); return
            }
            if (focusedField === 'end') {
                const setId = match ? String(match.id) : String(fid)
                setEnd(setId); setEndQuery(String(match?.name ?? name)); setFocusedField(null);
                // trigger compute immediately if possible
                if (graph && start) {
                    try {
                        // If start is the special USER_POSITION token, resolve nearest node and capture user coordinate
                        let s = start
                        let userCoord: [number, number] | undefined = undefined
                        if (s === 'USER_POSITION') {
                            try {
                                const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }))
                                userCoord = [pos.coords.longitude, pos.coords.latitude]
                                // find nearest node id
                                let bestId: string | null = null
                                let bestD = Infinity
                                const toRad = (v: number) => v * Math.PI / 180
                                const hav = (a: [number, number], b: [number, number]) => {
                                    const R = 6371000
                                    const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
                                    const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
                                    const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
                                    const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
                                    return R * c
                                }
                                for (const n of graph.nodes) {
                                    const d = hav([pos.coords.longitude, pos.coords.latitude], n.coord as [number, number])
                                    if (d < bestD) { bestD = d; bestId = String(n.id) }
                                }
                                if (bestId) s = bestId
                            } catch { /* ignore geolocation failures */ }
                        }
                        const res = await computeAndDrawRoute({ graph, start: s, end: setId, excludeStairs, coveredOnly, mapRef, k: 3, userOriginLngLat: userCoord })
                        if (res && res.routes) setRoutes(res.routes)
                    } catch (err) { console.error('[RoutePlanner] compute failed', err) }
                }
                return
            }
            // if planner is open but no focused field and no start/end selected, set end to matched node if possible
            if (!focusedField && !start && !end) {
                const setId = match ? String(match.id) : String(fid)
                setEnd(setId); setEndQuery(String(match?.name ?? name));
                return
            }
            // otherwise ignore here (SearchBar handles non-planner clicks)
        }
        window.addEventListener('map:feature-click', onMapFeatureClick as any)
        return () => { window.removeEventListener('map:feature-click', onMapFeatureClick as any) }
    }, [focusedField, start, end, nodeOptions, mapRef])

    // route selector UI helpers: highlight route on map when hovering an item
    function highlightRouteLayer(layerId: string | null) {
        const map = mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current))
        if (!map) return
        // reset all route layers to default opacity and width
        routes.forEach((r) => {
            try { map.setPaintProperty(r.layerId, 'line-width', r.layerId === layerId ? 22 : (r.layerId === 'route-planner-0-line' ? 18 : 12)) } catch (e) { }
            try { map.setPaintProperty(r.layerId, 'line-opacity', r.layerId === layerId ? 1 : 0.6) } catch (e) { }
        })
    }

    return (
        <div className="route-planner" style={{
            position: 'absolute',
            top: isMobile ? 0 : 10,
            left: isMobile ? 0 : 10,
            right: isMobile ? 0 : 'auto',
            background: 'var(--panel-bg, white)',
            color: 'var(--panel-fg, #111)',
            padding: 8,
            borderRadius: isMobile ? 0 : 6,
            zIndex: 20,
            width: isMobile ? '100%' : 360,
            boxSizing: 'border-box',
            border: isMobile ? 'none' : '1px solid var(--panel-border, #ddd)',
            boxShadow: isMobile ? 'none' : '0 4px 12px rgba(0,0,0,0.18)'
        }}>
            <div style={{ position: 'relative', marginBottom: 6 }}>
                {onClose && <button onClick={() => {
                    try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { }
                    // Fermer toutes les modales mobiles
                    setShowRouteSheet(false)
                    setShowRouteDetail(false)
                    setIsNavigating(false)
                    setSelectedRoute(null)
                    setNavigationSteps([])
                    if (onClose) onClose()
                }} aria-label="close" title="Close" style={{ position: 'absolute', left: 6, top: 6, width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', fontSize: 16 }}>✕</button>}
                <div style={{ textAlign: 'center', fontWeight: 600 }}>Itinéraire</div>
                <button title="Paramètres itinéraire" onClick={() => setShowSettings(s => !s)} style={{ position: 'absolute', right: 6, top: 6, width: 32, height: 28, borderRadius: 4, border: 'none', background: 'transparent', fontSize: 16 }}>⚙</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <Inputs
                    startQuery={startQuery}
                    endQuery={endQuery}
                    setStartQuery={setStartQuery}
                    setEndQuery={setEndQuery}
                    nodeOptions={nodeOptions}
                    setFocusedField={setFocusedField}
                    onPickStart={(id, name) => { setStart(id); setStartQuery(name) }}
                    onPickEnd={(id, name) => { setEnd(id); setEndQuery(name) }}
                    onClearStart={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch { } setStart(''); setStartQuery(''); setRoutes([]); setHighlightedRoute(null) }}
                    onClearEnd={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch { } setEnd(''); setEndQuery(''); setRoutes([]); setHighlightedRoute(null) }}
                />

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } setRoutes([]); setHighlightedRoute(null); const s = start; const sq = startQuery; setStart(end); setEnd(s); setStartQuery(endQuery); setEndQuery(sq) }} title="Swap" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>⇄</button>
                </div>
                {showSettings && (
                    <SettingsPopover
                        excludeStairs={excludeStairs}
                        coveredOnly={coveredOnly}
                        showSecondary={showSecondary}
                        onChangeExcludeStairs={setExcludeStairs}
                        onChangeCoveredOnly={setCoveredOnly}
                        onChangeShowSecondary={setShowSecondary}
                        onApply={() => { setShowSettings(false); try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch { } if (graph && start && end) compute() }}
                    />
                )}
            </div>

            {/* Bottom suggestion panel inside planner container (full width under inputs) */}
            <div style={{ width: '100%', marginTop: 6, borderTop: '1px solid var(--muted, #eee)', paddingTop: 6, maxHeight: 220, overflow: 'auto' }}>
                <div style={{ marginBottom: 8 }}>
                    {/* Always show existing routes first (if any), then suggestions beneath when a field is focused */}
                    {routes && routes.length > 0 && !isMobile && (
                        <RoutesList
                            routes={routes}
                            highlightedRoute={highlightedRoute}
                            onHover={(rt: any) => { setHighlightedRoute(rt.layerId); highlightRouteLayer(rt.layerId) }}
                            onLeave={() => { setHighlightedRoute(null); highlightRouteLayer(null) }}
                            onGo={(rt: any) => {
                                // Sur desktop, simplement mettre en évidence l'itinéraire
                                if (!isMobile) {
                                    setHighlightedRoute(rt.layerId);
                                    highlightRouteLayer(rt.layerId);
                                } else {
                                    // Sur mobile, ouvrir les détails
                                    handleSelectRoute(rt);
                                }
                            }}
                        />
                    )}
                    <Suggestions focusedField={focusedField} startQuery={startQuery} endQuery={endQuery} nodeOptions={nodeOptions} onSelectStart={(id, name) => { setStart(id); setStartQuery(name); setFocusedField(null) }} onSelectEnd={(id, name) => { setEnd(id); setEndQuery(name); setFocusedField(null) }} />
                </div>
            </div>

            {/* Modales pour mobile */}
            <RouteSheetModal
                isOpen={showRouteSheet && !isNavigating}
                routes={routes}
                highlightedRoute={highlightedRoute}
                onSelectRoute={handleSelectRoute}
            />            <RouteDetailModal
                isOpen={showRouteDetail && !isNavigating}
                onClose={() => {
                    // réinitialiser les couleurs à la fermeture du détail
                    try {
                        const map = mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current))
                        if (map) {
                            routes.forEach((rt: any) => {
                                try { map.setPaintProperty(rt.layerId, 'line-gradient', null) } catch { }
                                let idx = -1
                                try { const m = /route-planner-(\d+)-line/.exec(rt.layerId); if (m) idx = parseInt(m[1], 10) } catch { idx = -1 }
                                const baseColor = idx === 0 ? '#ff0000' : (idx === 1 ? '#999999' : '#cccccc')
                                try { map.setPaintProperty(rt.layerId, 'line-color', baseColor) } catch { }
                            })
                        }
                    } catch { }
                    setShowRouteDetail(false)
                }}
                route={selectedRoute}
                graph={graph}
                onStartNavigation={handleStartNavigation}
                onSaveRoute={handleSaveRoute}
            />

            {/* Module de navigation */}
            <NavigationModule
                isActive={isNavigating}
                route={selectedRoute}
                steps={navigationSteps}
                mapRef={mapRef}
                graph={graph}
                onFinishNavigation={handleFinishNavigation}
            />
        </div>
    )
}
