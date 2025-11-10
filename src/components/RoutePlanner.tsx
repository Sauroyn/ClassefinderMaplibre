import { useState, useEffect, useRef } from 'react'
import ConfirmStartModal from './route-planner/ConfirmStartModal'
import Toast from './route-planner/Toast'
import GroupedResultsMenu from './search/GroupedResultsMenu'

import { getUserStartDistance } from './route-planner/getStartProximity'
import { computeAndDrawRoute } from '../map/computeRoute'
import type { Graph } from './route-planner/utils'
import Suggestions from './route-planner/Suggestions'
import RoutesList from './route-planner/RoutesList'
import DesktopRouteDetails from './route-planner/DesktopRouteDetails'
import { isMobileViewport } from './route-planner/MobileSheetsUtils'
import { MobileRoutesSheet } from './route-planner/MobileRoutesSheet'
import { MobileRouteDetailsSheet } from './route-planner/MobileRouteDetailsSheet'
import { useNavigationController } from './route-planner/NavigationController'
import NavigationBanner from './route-planner/NavigationBanner'
import NavigationBottomSheet from './route-planner/NavigationBottomSheet'
import SettingsPopover from './route-planner/SettingsPopover'
import Inputs from './route-planner/Inputs'
import { fitBoundsSmart } from '../map/viewport'
import { loadGraphFromConfigOrFallback } from '../utils/graph'
import { findByNormalizedId } from '../utils/featureId'
import { createProvisionalNode } from '../map/provisionalNode'
import { getMapInstance, setPaintProperty, setLayoutProperty } from '../utils/mapHelpers'

export default function RoutePlanner({ mapRef, data, initialDestination, initialStartId, initialStartName, initialEndId, initialEndName, onClose }: { mapRef: any, data?: GeoJSON.FeatureCollection | null, initialDestination?: any, initialStartId?: string, initialStartName?: string, initialEndId?: string, initialEndName?: string, onClose?: () => void }) {

    // Bloc unique de hooks d'état
    const [graph, setGraph] = useState<Graph | null>(null)
    const [start, setStart] = useState<string>('')
    const [end, setEnd] = useState<string>('')
    const [nodeOptions, setNodeOptions] = useState<Array<{ id: string, name: string, level?: string }>>([])
    const [startQuery, setStartQuery] = useState<string>('')
    const [endQuery, setEndQuery] = useState<string>('')
    const [focusedField, setFocusedField] = useState<'start' | 'end' | null>(null)
    const [routes, setRoutes] = useState<Array<any>>([])
    const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null)
    const [excludeStairs, setExcludeStairs] = useState<boolean>(false)
    const [coveredOnly, setCoveredOnly] = useState<boolean>(false)
    const [showSecondary, setShowSecondary] = useState<boolean>(true)
    const [showSettings, setShowSettings] = useState<boolean>(false)
    const [isMobile] = useState<boolean>(() => isMobileViewport())
    const [mobileRoutesOpen, setMobileRoutesOpen] = useState(false)
    const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [navigationActive, setNavigationActive] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmDistance, setConfirmDistance] = useState(0)
    const [confirmUserCoord, setConfirmUserCoord] = useState<[number, number] | null>(null)
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [_provisionalNodes, setProvisionalNodes] = useState<Map<string, any>>(new Map())
    const [groupMenuField, setGroupMenuField] = useState<'start' | 'end' | null>(null)
    const [groupMenuTitle, setGroupMenuTitle] = useState<string>('')
    const [groupMenuItems, setGroupMenuItems] = useState<Array<{ id: string, name: string, level?: string }>>([])
    // Keep the last computed workingGraph (with provisional nodes) so we can reuse it for onAdjust
    const workingGraphRef = useRef<Graph | null>(null)


    // Load graph and populate nodeOptions at mount
    useEffect(() => {
        (async () => {
            try {
                const g = await loadGraphFromConfigOrFallback()
                if (g) {
                    setGraph(g)
                    // Build node options for autocomplete
                    const opts = g.nodes.map((n: any) => ({
                        id: String(n.id),
                        name: n.name || String(n.id),
                        level: n.level != null ? String(n.level) : undefined
                    }))

                    // Add provisional options for features without matching nodes
                    if (data && data.features) {
                        const nodeNames = new Set(opts.map((n: any) => (n.name || '').toLowerCase().trim()))
                        const features = data.features as any[]

                        for (let i = 0; i < features.length; i++) {
                            const feat = features[i]
                            const name = feat.properties?.name
                            if (!name || typeof name !== 'string' || name.trim().length === 0) continue

                            const nameLower = name.toLowerCase().trim()
                            if (nodeNames.has(nameLower)) continue // Already has a node

                            // This feature has a name but no corresponding node
                            // Add it as a provisional option (allow multiple features with same name)
                            const level = feat.properties?.level ?? (Array.isArray(feat.properties?.levels) && feat.properties.levels.length > 0 ? feat.properties.levels[0] : null)
                            opts.push({
                                id: `PROVISIONAL_${i}`,
                                name,
                                level: level != null ? String(level) : undefined,
                                provisional: true,
                                featureIndex: i
                            } as any)
                            // Don't add to nodeNames - allow duplicates for grouped selection
                        }
                    }

                    setNodeOptions(opts)

                    // Initialize start/end if provided
                    if (initialStartId && initialStartName) {
                        setStart(initialStartId)
                        setStartQuery(initialStartName)
                    }
                    if (initialEndId && initialEndName) {
                        setEnd(initialEndId)
                        setEndQuery(initialEndName)
                    }
                    // Handle initialDestination if provided
                    if (initialDestination) {
                        const name = initialDestination.properties?.name ?? initialDestination.properties?.title ?? initialDestination.id
                        const fid = initialDestination.id ?? initialDestination.properties?.id ?? name
                        const match = opts.find((n: any) => String(n.id) === String(fid) || String((n.name || '')).toLowerCase() === String(name).toLowerCase())
                        const setId = match ? String(match.id) : String(fid)
                        setEnd(setId)
                        setEndQuery(String(match?.name ?? name))
                    }
                }
            } catch (err) {
                console.error('[RoutePlanner] failed to load graph', err)
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    // Gestion du bouton retour sur le menu de détails mobile
    useEffect(() => {
        function onBack() {
            setDetailsOpen(false)
            setMobileRoutesOpen(true)
        }
        window.addEventListener('route-details-back', onBack)
        return () => window.removeEventListener('route-details-back', onBack)
    }, [])
    // Contrôleur de navigation (mobile)
    const nav = useNavigationController(navigationActive ? selectedRoute : null, () => setNavigationActive(false), mapRef)

    // Dev-only override: click on map sets user position when navigating
    useEffect(() => {
        if (!navigationActive) return
        // hide geolocate UI while navigating
        try { window.dispatchEvent(new CustomEvent('ui:hide-geolocate')) } catch { }
        const onMapClick = (e: any) => {
            if (import.meta.env && import.meta.env.DEV !== true) return
            const lngLat = e?.detail?.lngLat || e?.detail || null
            if (!lngLat) return
            const p: [number, number] = Array.isArray(lngLat) ? [lngLat[0], lngLat[1]] : [lngLat.lng, lngLat.lat]
            window.dispatchEvent(new CustomEvent('navigation:dev-set-user-position', { detail: p }))
        }
        // Option 1: listen to maplibre click
        const map = getMapInstance(mapRef)
        const onNativeClick = (ev: any) => {
            if (import.meta.env && import.meta.env.DEV !== true) return
            try {
                const p = ev?.lngLat; if (p) window.dispatchEvent(new CustomEvent('navigation:dev-set-user-position', { detail: [p.lng, p.lat] }))
            } catch { }
        }
        try { map?.on?.('click', onNativeClick) } catch { }
        window.addEventListener('map:click', onMapClick as any)
        return () => {
            try { map?.off?.('click', onNativeClick) } catch { }
            window.removeEventListener('map:click', onMapClick as any)
            try { window.dispatchEvent(new CustomEvent('ui:show-geolocate')) } catch { }
        }
    }, [navigationActive, mapRef])

    // Handle recalc and finish
    useEffect(() => {
        const onRecalc = async (e: any) => {
            try {
                const p = e?.detail
                if (!p || !graph || !end) return
                const user: [number, number] = [p.lng, p.lat]
                const res = await computeAndDrawRoute({ graph, start: String(selectedRoute?.path?.[0] ?? start), end, excludeStairs, coveredOnly, mapRef, k: 3, userOriginLngLat: user })
                if (res && res.routes && res.routes.length) {
                    const primary = res.routes[0]
                    setRoutes(res.routes)
                    setSelectedRoute(primary)
                }
            } catch { }
        }
        const onFinish = () => {
            // Exit navigation mode silently (no popup)
            try { const m = mapRef?.current; m?.clearRoute?.() } catch { }
            setNavigationActive(false)
            try { window.dispatchEvent(new CustomEvent('navigation:active', { detail: false })) } catch { }
            try { window.dispatchEvent(new CustomEvent('ui:show-geolocate')) } catch { }
            try { window.dispatchEvent(new CustomEvent('ui:trigger-geolocate')) } catch { }
        }
        window.addEventListener('navigation:recalc-from', onRecalc as any)
        window.addEventListener('navigation:finish', onFinish as any)
        return () => {
            window.removeEventListener('navigation:recalc-from', onRecalc as any)
            window.removeEventListener('navigation:finish', onFinish as any)
        }
    }, [graph, end, excludeStairs, coveredOnly, mapRef, selectedRoute, start])

    // Focus a step bounds when requested from NavigationBottomSheet
    useEffect(() => {
        const onFocus = (e: any) => {
            try {
                const bounds = e?.detail as [[number, number], [number, number]]
                if (!bounds || !Array.isArray(bounds[0]) || !Array.isArray(bounds[1])) return
                const map = getMapInstance(mapRef)
                if (map) fitBoundsSmart(map, bounds)
            } catch { }
        }
        window.addEventListener('nav:focus-step-bounds', onFocus as any)
        return () => window.removeEventListener('nav:focus-step-bounds', onFocus as any)
    }, [mapRef])

    // When planner closes from parent, also close sheets
    useEffect(() => {
        return () => {
            setMobileRoutesOpen(false)
            setDetailsOpen(false)
            setSelectedRoute(null)
        }
    }, [])
    async function compute() {
        if (!graph) { console.warn('[RoutePlanner] no graph loaded'); return }
        // clear previous routes while computing
        setRoutes([])
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

            // Handle provisional nodes: create temporary graph with provisional nodes/edges
            let workingGraph = graph
            let hasProvisional = false
            const newProvisionalNodes = new Map<string, any>()

            if (s.startsWith('PROVISIONAL_') || e.startsWith('PROVISIONAL_')) {
                workingGraph = { ...graph, nodes: [...graph.nodes], edges: [...graph.edges] }

                const edgesToRemove: Array<{ from: string; to: string }> = []
                const provisionalsList: any[] = []

                // First pass: create all provisional nodes and collect info
                for (const id of [s, e]) {
                    if (!id.startsWith('PROVISIONAL_')) continue

                    // Find the corresponding feature
                    const opt = nodeOptions.find((n: any) => n.id === id) as any
                    if (!opt || !opt.featureIndex || !data) continue

                    const feature = findByNormalizedId(data, opt.featureIndex)
                    if (!feature) continue

                    // Create provisional node, passing all features for intersection checking
                    const allFeatures = data.features as any[]
                    const provisional = createProvisionalNode(feature, graph, id, allFeatures)
                    if (!provisional) continue

                    provisionalsList.push(provisional)

                    // Collect edges to remove if intermediate node was created
                    if (provisional.intermediateNode && provisional.edgeToRemove) {
                        const splitEdge = provisional.connectionEdges.find((e: any) =>
                            e.id && e.id.includes('-split-1') && !e.id.includes('-reverse')
                        )

                        if (splitEdge) {
                            const fromNodeId = splitEdge.from
                            const toNodeId = provisional.connectionEdges.find((e: any) =>
                                e.id && e.id.includes('-split-2') && !e.id.includes('-reverse')
                            )?.to

                            if (toNodeId) {
                                edgesToRemove.push({ from: String(fromNodeId), to: String(toNodeId) })
                            }
                        }
                    }

                    newProvisionalNodes.set(id, provisional)
                    hasProvisional = true
                }

                // Second pass: remove original edges that were split
                if (edgesToRemove.length > 0) {
                    workingGraph.edges = workingGraph.edges.filter((e: any) => {
                        // Check if this edge matches any edge to remove
                        return !edgesToRemove.some(toRemove =>
                            (String(e.from) === toRemove.from && String(e.to) === toRemove.to) ||
                            (String(e.from) === toRemove.to && String(e.to) === toRemove.from)
                        )
                    })
                }

                // Third pass: add all new nodes and edges
                for (const provisional of provisionalsList) {
                    workingGraph.nodes.push(provisional.node)
                    if (provisional.intermediateNode) {
                        workingGraph.nodes.push(provisional.intermediateNode)
                    }
                    for (const edge of provisional.connectionEdges) {
                        workingGraph.edges.push(edge)
                    }
                }

                setProvisionalNodes(newProvisionalNodes)
            } const k = showSecondary ? 3 : 1
            const res = await computeAndDrawRoute({ graph: workingGraph, start: s, end: e, excludeStairs, coveredOnly, mapRef, k, userOriginLngLat: userCoord || undefined })
            // Save the working graph (with any provisional nodes) for follow-up actions like onAdjust
            try { workingGraphRef.current = workingGraph as any } catch { }
            if (res && res.routes) {
                setRoutes(res.routes)
                if (isMobile) {
                    setMobileRoutesOpen(true)
                }

                // Show toast if using provisional node
                if (hasProvisional) {
                    setToastMessage("Chemin approximatif : la salle sélectionnée n'a pas de point d'accès défini. L'itinéraire vous rapprochera au maximum.")
                }
            }
        } catch (err) { console.error('[RoutePlanner] compute failed', err) }
    }

    // clearMap removed: route cleared when planner closes or when path set to null

    // trigger compute automatically when both start and end IDs are present
    useEffect(() => {
        console.log('[RoutePlanner] useEffect compute trigger:', { graph: !!graph, start, end })
        if (graph && start && end) {
            console.log('[RoutePlanner] Calling compute()')
            compute()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, end, graph])

    // listen for map feature clicks to allow quick fill of focused field or set destination
    useEffect(() => {
        async function onMapFeatureClick(e: any) {
            const feat = e.detail as any
            if (!feat) return
            const name = feat.properties?.name ?? feat.properties?.title ?? feat.id
            const fid = feat.id ?? feat.properties?.id ?? name

            // Try to find exact match by feature ID (important for provisional nodes with duplicate names)
            // feat.id is the normalized index from MapView, so we can match PROVISIONAL_{index}
            let match = nodeOptions.find(n => String(n.id) === String(fid))

            // If no exact match, try provisional ID pattern (PROVISIONAL_{index})
            if (!match && typeof fid === 'number') {
                const provisionalId = `PROVISIONAL_${fid}`
                match = nodeOptions.find(n => n.id === provisionalId)
            }

            // Fallback: match by name (only if no exact ID match found)
            if (!match) {
                match = nodeOptions.find(n => String((n.name || '')).toLowerCase() === String(name).toLowerCase())
            }

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
            // If no field is focused, ignore (let SearchBar handle the click)
        }
        window.addEventListener('map:feature-click', onMapFeatureClick as any)
        return () => { window.removeEventListener('map:feature-click', onMapFeatureClick as any) }
    }, [focusedField, start, end, nodeOptions, mapRef])

    // route selector UI helpers: highlight route on map when hovering an item
    function highlightRouteLayer(layerId: string | null) {
        const map = getMapInstance(mapRef)
        if (!map) return
        // reset all route layers to default opacity and width
        const primaryCovered = 'route-planner-0-covered-line'
        const primaryRemaining = 'route-planner-0-remaining-line'
        routes.forEach((r) => {
            const isPrimary = r.layerId === 'route-planner-0-line'
            const isSelected = r.layerId === layerId
            if (isPrimary) {
                setPaintProperty(map, primaryCovered, 'line-width', isSelected ? 22 : 18)
                setPaintProperty(map, primaryRemaining, 'line-width', isSelected ? 18 : 18)
                setPaintProperty(map, primaryCovered, 'line-opacity', isSelected ? 1 : 0.6)
                setPaintProperty(map, primaryRemaining, 'line-opacity', isSelected ? 1 : 0.6)
            } else {
                setPaintProperty(map, r.layerId, 'line-width', isSelected ? 22 : 12)
                setPaintProperty(map, r.layerId, 'line-opacity', isSelected ? 1 : 0.6)
            }
        })
    }

    // En mode navigation, on masque le planner et on affiche la bannière + le panneau bas d'info
    if (navigationActive) {
        const navProxy: any = { ...nav, active: true, route: (nav.route || selectedRoute || null) }
        return (
            <>
                <NavigationBanner nav={navProxy} />
                <NavigationBottomSheet nav={navProxy} onFinish={() => { try { (nav as any)?.exit?.() } catch { } try { const m = mapRef?.current; m?.clearRoute?.() } catch { } setNavigationActive(false); try { window.dispatchEvent(new CustomEvent('navigation:active', { detail: false })) } catch { } }} />
            </>
        )
    }
    // Affichage desktop : toujours les inputs et la liste, détail en-dessous si sélectionné
    return (
        <div className="route-planner" style={{ position: 'absolute', top: 10, left: 10, background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', padding: 8, borderRadius: 6, zIndex: 20, width: 360, boxSizing: 'border-box', border: '1px solid var(--panel-border, #ddd)', boxShadow: '0 4px 12px rgba(0,0,0,0.18)', display: (navigationActive ? 'none' : 'block') }}>
            <div style={{ position: 'relative', marginBottom: 6 }}>
                {onClose && <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } if (onClose) onClose() }} aria-label="close" title="Close" style={{ position: 'absolute', left: 6, top: 6, width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', fontSize: 16 }}>✕</button>}
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
                    onClearStart={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch { } setStart(''); setStartQuery(''); setRoutes([]); setHighlightedRoute(null); setDetailsOpen(false); setSelectedRoute(null); setMobileRoutesOpen(false) }}
                    onClearEnd={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch { } setEnd(''); setEndQuery(''); setRoutes([]); setHighlightedRoute(null); setDetailsOpen(false); setSelectedRoute(null); setMobileRoutesOpen(false) }}
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
            {/* Suggestions toujours visibles, liste masquée si détail ouvert (desktop) */}
            <div style={{ width: '100%', marginTop: 6, borderTop: '1px solid var(--muted, #eee)', paddingTop: 6, maxHeight: 220, overflow: 'auto' }}>
                <div style={{ marginBottom: 8 }}>
                    <Suggestions
                        focusedField={focusedField}
                        startQuery={startQuery}
                        endQuery={endQuery}
                        nodeOptions={nodeOptions}
                        onSelectStart={(id, name) => { setStart(id); setStartQuery(name); setFocusedField(null) }}
                        onSelectEnd={(id, name) => { setEnd(id); setEndQuery(name); setFocusedField(null) }}
                        onRequestGroup={(field, name, items) => {
                            setGroupMenuField(field)
                            setGroupMenuTitle(name)
                            setGroupMenuItems(items)
                            setFocusedField(null)
                        }}
                    />
                    {/* Liste visible seulement si détail non ouvert */}
                    {!isMobile && routes && routes.length > 0 && !detailsOpen && (
                        <RoutesList
                            routes={routes}
                            highlightedRoute={highlightedRoute}
                            onHover={(rt: any) => { setHighlightedRoute(rt.layerId); highlightRouteLayer(rt.layerId) }}
                            onLeave={() => { setHighlightedRoute(null); highlightRouteLayer(null) }}
                            onGo={(rt: any) => {
                                setSelectedRoute(rt)
                                setDetailsOpen(true)
                                setHighlightedRoute(rt.layerId)
                                highlightRouteLayer(rt.layerId)
                            }}
                        />
                    )}
                </div>
            </div>
            {/* Affichage du détail en-dessous en mode desktop */}
            {!isMobile && detailsOpen && selectedRoute && (
                <DesktopRouteDetails
                    route={selectedRoute}
                    arrivalTime={(() => {
                        if (!selectedRoute) return null
                        try { const now = new Date(); return new Date(now.getTime() + Math.round((selectedRoute.time || 0) * 1000)) } catch { return null }
                    })()}
                    onBack={() => {
                        setDetailsOpen(false)
                        setSelectedRoute(null)
                    }}
                />
            )}
            {isMobile && (
                <MobileRoutesSheet
                    routes={routes}
                    open={mobileRoutesOpen}
                    onSelect={(rt) => {
                        setSelectedRoute(rt)
                        setMobileRoutesOpen(false)
                        setDetailsOpen(true)
                        // hide other routes on map leaving only selected
                        const map = getMapInstance(mapRef)
                        if (map) {
                            const primaryCovered = 'route-planner-0-covered-line'
                            const primaryRemaining = 'route-planner-0-remaining-line'
                            routes.forEach((r) => {
                                const isPrimary = r.layerId === 'route-planner-0-line'
                                const visibility = r.layerId === rt.layerId ? 'visible' : 'none'

                                if (isPrimary) {
                                    setLayoutProperty(map, primaryCovered, 'visibility', visibility)
                                    setLayoutProperty(map, primaryRemaining, 'visibility', visibility)
                                } else {
                                    setLayoutProperty(map, r.layerId, 'visibility', visibility)
                                }
                            })
                        }
                    }}
                />
            )}
            {isMobile && !navigationActive && (
                <MobileRouteDetailsSheet
                    open={detailsOpen}
                    route={selectedRoute}
                    onStart={async () => {
                        // Avant de démarrer, vérifier la distance utilisateur -> départ de l'itinéraire
                        try {
                            const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 20000, timeout: 8000 }))
                            const user: [number, number] = [pos.coords.longitude, pos.coords.latitude]
                            if (selectedRoute && graph) {
                                try {
                                    const d = getUserStartDistance(selectedRoute, graph, user)
                                    if (d != null && d > 20) {
                                        setConfirmDistance(d)
                                        setConfirmUserCoord(user)
                                        setConfirmOpen(true)
                                        return
                                    }
                                } catch { }
                            }
                            // démarrer navigation
                            setDetailsOpen(false)
                            setNavigationActive(true)
                            try { window.dispatchEvent(new CustomEvent('navigation:active', { detail: true })) } catch { }
                            try {
                                const map = mapRef?.current?.getMap ? mapRef.current.getMap() : (mapRef?.current?.map ?? mapRef?.current)
                                if (map) {
                                    const primaryCovered = 'route-planner-0-covered-line'
                                    const primaryRemaining = 'route-planner-0-remaining-line'
                                    routes.forEach((r) => {
                                        const isPrimary = r.layerId === 'route-planner-0-line'
                                        if (selectedRoute && r.layerId === selectedRoute.layerId) {
                                            if (isPrimary) {
                                                setPaintProperty(map, primaryCovered, 'line-width', 20)
                                                setPaintProperty(map, primaryRemaining, 'line-width', 18)
                                                setLayoutProperty(map, primaryCovered, 'visibility', 'visible')
                                                setLayoutProperty(map, primaryRemaining, 'visibility', 'visible')
                                            } else {
                                                setPaintProperty(map, r.layerId, 'line-opacity', 1)
                                                setPaintProperty(map, r.layerId, 'line-width', 20)
                                                setLayoutProperty(map, r.layerId, 'visibility', 'visible')
                                            }
                                        } else {
                                            if (isPrimary) {
                                                setLayoutProperty(map, primaryCovered, 'visibility', 'none')
                                                setLayoutProperty(map, primaryRemaining, 'visibility', 'none')
                                            } else {
                                                setLayoutProperty(map, r.layerId, 'visibility', 'none')
                                            }
                                        }
                                    })
                                    if (user && Number.isFinite(user[0]) && Number.isFinite(user[1])) {
                                        try { map.flyTo?.({ center: { lng: user[0], lat: user[1] }, zoom: Math.max(16, map.getZoom ? map.getZoom() : 16), speed: 0.8, curve: 1.4 }) } catch { }
                                    }
                                }
                            } catch { }
                        } catch {
                            // pas de géoloc: démarrer sans vérif
                            setDetailsOpen(false)
                            setNavigationActive(true)
                            try { window.dispatchEvent(new CustomEvent('navigation:active', { detail: true })) } catch { }
                        }
                    }}
                    arrivalTime={(() => {
                        if (!selectedRoute) return null
                        try { const now = new Date(); return new Date(now.getTime() + Math.round((selectedRoute.time || 0) * 1000)) } catch { return null }
                    })()}
                />
            )}
            {/* Modal de confirmation si départ trop éloigné */}
            {isMobile && (
                <ConfirmStartModal
                    open={confirmOpen}
                    distance={confirmDistance}
                    onCancel={() => { setConfirmOpen(false); setNavigationActive(false); setDetailsOpen(true) }}
                    onAdjust={async () => {
                        try {
                            console.log('[RoutePlanner] onAdjust: starting', { confirmUserCoord, graph: !!graph, selectedRoute: !!selectedRoute })
                            const user = confirmUserCoord
                            setConfirmOpen(false)
                            // Prefer the last workingGraph so provisional endpoints still exist
                            const g2 = (workingGraphRef.current as any) || graph
                            if (g2 && selectedRoute && user) {
                                console.log('[RoutePlanner] onAdjust: calling computeAndDrawRoute')
                                // recalcul en ancrant le départ sur la position utilisateur (le moteur forcera le niveau 1)
                                const res = await computeAndDrawRoute({ graph: g2, start: String(selectedRoute.path?.[0] ?? start), end: end, excludeStairs, coveredOnly, mapRef, k: 3, userOriginLngLat: user })
                                console.log('[RoutePlanner] onAdjust: result', { hasRoutes: res && res.routes && res.routes.length > 0 })
                                if (res && res.routes && res.routes.length) {
                                    const primary = res.routes[0]
                                    setRoutes(res.routes)
                                    setSelectedRoute(primary)
                                    // démarrage immédiat
                                    setDetailsOpen(false)
                                    setNavigationActive(true)
                                    try { window.dispatchEvent(new CustomEvent('navigation:active', { detail: true })) } catch { }
                                    const map = mapRef?.current?.getMap ? mapRef.current.getMap() : (mapRef?.current?.map ?? mapRef?.current)
                                    const primaryCovered = 'route-planner-0-covered-line'
                                    const primaryRemaining = 'route-planner-0-remaining-line'
                                    res.routes.forEach((r: any) => {
                                        const isPrimary = r.layerId === 'route-planner-0-line'
                                        if (r.layerId === primary.layerId) {
                                            if (isPrimary) {
                                                try { map?.setPaintProperty?.(primaryCovered, 'line-width', 20) } catch { }
                                                try { map?.setPaintProperty?.(primaryRemaining, 'line-width', 18) } catch { }
                                                try { map?.setLayoutProperty?.(primaryCovered, 'visibility', 'visible') } catch { }
                                                try { map?.setLayoutProperty?.(primaryRemaining, 'visibility', 'visible') } catch { }
                                            } else {
                                                try { map?.setPaintProperty?.(r.layerId, 'line-opacity', 1) } catch { }
                                                try { map?.setPaintProperty?.(r.layerId, 'line-width', 20) } catch { }
                                                try { map?.setLayoutProperty?.(r.layerId, 'visibility', 'visible') } catch { }
                                            }
                                        } else {
                                            if (isPrimary) {
                                                try { map?.setLayoutProperty?.(primaryCovered, 'visibility', 'none') } catch { }
                                                try { map?.setLayoutProperty?.(primaryRemaining, 'visibility', 'none') } catch { }
                                            } else {
                                                try { map?.setLayoutProperty?.(r.layerId, 'visibility', 'none') } catch { }
                                            }
                                        }
                                    })
                                    if (user && Number.isFinite(user[0]) && Number.isFinite(user[1])) {
                                        try { map?.flyTo?.({ center: { lng: user[0], lat: user[1] }, zoom: Math.max(16, map.getZoom ? map.getZoom() : 16), speed: 0.8, curve: 1.4 }) } catch { }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('[RoutePlanner] onAdjust: error', err)
                            setConfirmOpen(false)
                        }
                    }}
                />
            )}
            {/* Toast for provisional node warning */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    duration={6000}
                    onClose={() => setToastMessage(null)}
                />
            )}
            {/* Group menu for multiple features with same name */}
            {groupMenuField && groupMenuItems.length > 0 && (
                <GroupedResultsMenu
                    title={groupMenuTitle}
                    items={groupMenuItems}
                    onPick={(id, name) => {
                        console.log('[RoutePlanner] GroupedResultsMenu onPick:', { field: groupMenuField, id, name })
                        if (groupMenuField === 'start') {
                            setStart(String(id))
                            setStartQuery(name)
                        } else {
                            setEnd(String(id))
                            setEndQuery(name)
                        }
                        setGroupMenuField(null)
                    }}
                    onClose={() => {
                        setGroupMenuField(null)
                        try { window.dispatchEvent(new CustomEvent('map:hover-clear')) } catch { }
                    }}
                />
            )}
        </div>
    )
}
