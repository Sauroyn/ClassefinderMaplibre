import { useEffect, useRef } from 'react'
import { Xmark, Gear } from '@gravity-ui/icons'
import ConfirmStartModal from './route-planner/ConfirmStartModal'
import Toast from './route-planner/Toast'

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
import Inputs from './route-planner/Inputs'
import { fitBoundsSmart } from '../map/viewport'
import { haversine } from '../map/measure'
import { getCurrentPosition } from '../utils/geolocation'
import { loadGraphFromConfigOrFallback } from '../utils/graph'
// Provisional helpers now wrapped by buildProvisionalGraph
import { buildProvisionalGraph } from './route-planner/buildProvisionalGraph'
import { getMapInstance, setPaintProperty, setLayoutProperty } from '../utils/mapHelpers'
import { highlightRouteLayer } from './route-planner/utils'
import { useRoutePlannerState } from '../hooks/useRoutePlannerState'
import { getAlias } from '../utils/aliases'

export default function RoutePlanner({ mapRef, data, initialDestination, initialStartId, initialStartName, initialEndId, initialEndName, onClose, onOpenRouteSettings }: { mapRef: any, data?: GeoJSON.FeatureCollection | null, initialDestination?: any, initialStartId?: string, initialStartName?: string, initialEndId?: string, initialEndName?: string, onClose?: () => void, onOpenRouteSettings?: () => void }) {

    // Unified state management with useReducer
    const [state, dispatch] = useRoutePlannerState(isMobileViewport())

    // Destructure state for easier access
    const {
        graph,
        input: { start, end, startQuery, endQuery, focusedField },
        routes: { list: routes, highlighted: highlightedRoute, selected: selectedRoute },
        settings: { excludeStairs, coveredOnly, showSecondary },
        ui: { isMobile, mobileRoutesOpen, detailsOpen },
        navigation: { active: navigationActive, confirmOpen, confirmDistance, confirmUserCoord },
        suggestions: { nodeOptions, groupMenuField, groupMenuTitle, groupMenuItems },
        toastMessage
    } = state

    // Helper functions to update state (wrapper around dispatch for cleaner code)
    // Removed unused setGraph helper (direct dispatch used where needed)
    const setStart = (payload: string) => dispatch({ type: 'SET_START', payload })
    const setEnd = (payload: string) => dispatch({ type: 'SET_END', payload })
    const setStartQuery = (payload: string) => dispatch({ type: 'SET_START_QUERY', payload })
    const setEndQuery = (payload: string) => dispatch({ type: 'SET_END_QUERY', payload })
    const setFocusedField = (payload: 'start' | 'end' | null) => dispatch({ type: 'SET_FOCUSED_FIELD', payload })
    const setRoutes = (payload: Array<any>) => dispatch({ type: 'SET_ROUTES', payload })
    const setHighlightedRoute = (payload: string | null) => dispatch({ type: 'SET_HIGHLIGHTED_ROUTE', payload })
    const setSelectedRoute = (payload: any | null) => dispatch({ type: 'SET_SELECTED_ROUTE', payload })
    const setMobileRoutesOpen = (payload: boolean) => dispatch({ type: 'SET_MOBILE_ROUTES_OPEN', payload })
    const setDetailsOpen = (payload: boolean) => dispatch({ type: 'SET_DETAILS_OPEN', payload })
    const setNavigationActive = (payload: boolean) => dispatch({ type: 'SET_NAVIGATION_ACTIVE', payload })
    const setConfirmOpen = (payload: boolean) => dispatch({ type: 'SET_CONFIRM_OPEN', payload })
    const setConfirmDistance = (payload: number) => dispatch({ type: 'SET_CONFIRM_DISTANCE', payload })
    const setConfirmUserCoord = (payload: [number, number] | null) => dispatch({ type: 'SET_CONFIRM_USER_COORD', payload })
    const setToastMessage = (payload: string | null) => dispatch({ type: 'SET_TOAST_MESSAGE', payload })
    const setProvisionalNodes = (payload: Map<string, any>) => dispatch({ type: 'SET_PROVISIONAL_NODES', payload })
    const openGroupMenu = (field: 'start' | 'end', title: string, items: Array<{ id: string; name: string; level?: string }>) =>
        dispatch({ type: 'SET_GROUP_MENU', payload: { field, title, items } })
    const closeGroupMenu = () => dispatch({ type: 'CLEAR_GROUP_MENU' })
    const dismissGroupMenu = () => {
        closeGroupMenu()
        try { window.dispatchEvent(new CustomEvent('map:hover-clear')) } catch { }
    }

    const showSuggestionsPanel = Boolean(
        focusedField ||
        (groupMenuField && groupMenuItems.length > 0) ||
        (routes && routes.length > 0 && !detailsOpen)
    )

    // Keep the last computed workingGraph (with provisional nodes) so we can reuse it for onAdjust
    const workingGraphRef = useRef<Graph | null>(null)


    // Load graph and populate nodeOptions at mount
    useEffect(() => {
        (async () => {
            try {
                const g = await loadGraphFromConfigOrFallback()
                if (g) {
                    dispatch({ type: 'SET_GRAPH', payload: g })
                    // Build node options for autocomplete
                    const opts = g.nodes.map((n: any) => {
                        // Utiliser l'alias si disponible pour les nodes du graphe
                        const alias = getAlias(n.id)
                        const name = alias ? alias.aliasName : (n.name || String(n.id))
                        return {
                            id: String(n.id),
                            name,
                            level: n.level != null ? String(n.level) : undefined,
                            searchKey: String(name || n.id).toLowerCase()
                        }
                    })

                    // Add provisional options for features without matching nodes
                    if (data && data.features) {
                        const nodeNames = new Set(opts.map((n: any) => (n.name || '').toLowerCase().trim()))
                        const features = data.features as any[]

                        for (let i = 0; i < features.length; i++) {
                            const feat = features[i]
                            const originalName = feat.properties?.name

                            // Utiliser l'alias si disponible
                            const alias = getAlias(i)
                            const name = alias ? alias.aliasName : originalName

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
                                featureIndex: i,
                                searchKey: String(name).toLowerCase()
                            } as any)
                            // Don't add to nodeNames - allow duplicates for grouped selection
                        }
                    }

                    dispatch({ type: 'SET_NODE_OPTIONS', payload: opts })

                    // Initialize start/end if provided
                    if (initialStartId && initialStartName) {
                        dispatch({ type: 'SET_START', payload: initialStartId })
                        dispatch({ type: 'SET_START_QUERY', payload: initialStartName })
                    }
                    if (initialEndId && initialEndName) {
                        dispatch({ type: 'SET_END', payload: initialEndId })
                        dispatch({ type: 'SET_END_QUERY', payload: initialEndName })
                    }
                    // Handle initialDestination if provided
                    if (initialDestination) {
                        // Prioriser l'ID de destination
                        const fid = initialDestination.id ?? initialDestination.properties?.id
                        // Le nom peut être un alias (passé depuis SearchSelected)
                        const name = initialDestination.properties?.name ?? initialDestination.properties?.title ?? fid

                        // D'abord essayer de matcher par ID exact (le plus fiable)
                        let match = opts.find((n: any) => String(n.id) === String(fid))

                        // Sinon, essayer de matcher par nom (alias ou original)
                        if (!match && name) {
                            match = opts.find((n: any) => String((n.name || '')).toLowerCase() === String(name).toLowerCase())
                        }

                        const setId = match ? String(match.id) : String(fid)
                        dispatch({ type: 'SET_END', payload: setId })
                        dispatch({ type: 'SET_END_QUERY', payload: String(match?.name ?? name) })
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
            dispatch({ type: 'SET_DETAILS_OPEN', payload: false })
            dispatch({ type: 'SET_MOBILE_ROUTES_OPEN', payload: true })
        }
        window.addEventListener('route-details-back', onBack)
        return () => window.removeEventListener('route-details-back', onBack)
    }, [])

    // Contrôleur de navigation (mobile)
    const nav = useNavigationController(
        state.navigation.active ? state.routes.selected : null,
        () => dispatch({ type: 'SET_NAVIGATION_ACTIVE', payload: false }),
        mapRef
    )

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
                    const pos = await getCurrentPosition()
                    const user: [number, number] = [pos.coords.longitude, pos.coords.latitude]
                    let bestId: string | null = null
                    let bestD = Infinity
                    for (const n of graph.nodes) {
                        const d = haversine(user, n.coord as [number, number])
                        if (d < bestD) { bestD = d; bestId = String(n.id) }
                    }
                    return bestId
                } catch { return null }
            }
            let userCoord: [number, number] | null = null
            if (s === 'USER_POSITION') { const nid = await nearestToUser(); if (nid) { s = nid; try { const pos = await getCurrentPosition(); userCoord = [pos.coords.longitude, pos.coords.latitude] } catch { } } }
            if (e === 'USER_POSITION') { const nid = await nearestToUser(); if (nid) { e = nid; try { const pos = await getCurrentPosition(); userCoord = [pos.coords.longitude, pos.coords.latitude] } catch { } } }

            // Handle provisional nodes via utility
            const { workingGraph, hasProvisional, provisionalNodes } = buildProvisionalGraph({ graph, startId: s, endId: e, data: data || null, nodeOptions })
            if (provisionalNodes.size) setProvisionalNodes(provisionalNodes)
            const k = showSecondary ? 3 : 1
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
                                const pos = await getCurrentPosition()
                                userCoord = [pos.coords.longitude, pos.coords.latitude]
                                // find nearest node id
                                let bestId: string | null = null
                                let bestD = Infinity
                                for (const n of graph.nodes) {
                                    const d = haversine([pos.coords.longitude, pos.coords.latitude], n.coord as [number, number])
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
    // highlightRouteLayer extracted to utils for reuse

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
        <div className={`route-planner absolute ${isMobile ? 'top-3 left-3 right-3 w-auto' : 'top-[12px] left-[12px] w-[360px]'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[15px] z-controls shadow-lg ${groupMenuField ? 'overflow-visible' : 'overflow-hidden'} ${navigationActive ? 'hidden' : 'block'}`}>
            <div className="p-[2px] pr-1">
                {/* Ligne avec bouton fermer, inputs, et boutons paramètres/swap */}
                <div className="flex gap-2 items-start">
                    {/* Bouton fermer */}
                    <div className="flex-shrink-0 pt-1 pl-1">
                        {onClose && <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } if (onClose) onClose() }} aria-label="close" title="Close" className="w-7 h-7 rounded-lg bg-transparent text-base text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center justify-center"><Xmark className="w-4 h-4" /></button>}
                    </div>

                    {/* Inputs avec icônes */}
                    <div className="flex-1 min-w-0">
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
                    </div>

                    {/* Boutons paramètres et swap positionnés pour s'aligner avec les barres de recherche */}
                    <div className="flex flex-col flex-shrink-0">
                        {/* Bouton paramètres aligné avec la première barre (40px de haut) */}
                        <div className="h-[40px] flex items-center">
                            <button title="Paramètres itinéraire" onClick={() => onOpenRouteSettings && onOpenRouteSettings()} className="w-8 h-8 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"><Gear className="w-4 h-4" /></button>
                        </div>
                        {/* Séparateur de 1px pour correspondre au trait entre les barres */}
                        <div className="h-px" />
                        {/* Bouton swap aligné avec la deuxième barre (40px de haut) */}
                        <div className="h-[40px] flex items-center">
                            <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } setRoutes([]); setHighlightedRoute(null); const s = start; const sq = startQuery; setStart(end); setEnd(s); setStartQuery(endQuery); setEndQuery(sq) }} title="Swap" className="w-8 h-8 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">⇄</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggestions toujours visibles, liste masquée si détail ouvert (desktop) */}
            {/* Afficher le conteneur seulement si suggestions ou routes présentes */}
            {showSuggestionsPanel && (
                <div className="w-full border-t border-gray-200 dark:border-gray-700 max-h-[220px] overflow-auto">
                    <div>
                        <Suggestions
                            focusedField={focusedField}
                            startQuery={startQuery}
                            endQuery={endQuery}
                            nodeOptions={nodeOptions}
                            onSelectStart={(id, name) => { setStart(id); setStartQuery(name); setFocusedField(null) }}
                            onSelectEnd={(id, name) => { setEnd(id); setEndQuery(name); setFocusedField(null) }}
                            onRequestGroup={(field, name, items) => {
                                openGroupMenu(field, name, items)
                                setFocusedField(field)
                            }}
                            groupView={groupMenuField && groupMenuItems.length > 0 ? { field: groupMenuField, title: groupMenuTitle, items: groupMenuItems } : null}
                            onCloseGroup={dismissGroupMenu}
                        />
                        {/* Liste visible seulement si détail non ouvert */}
                        {!isMobile && routes && routes.length > 0 && !detailsOpen && (
                            <RoutesList
                                routes={routes}
                                highlightedRoute={highlightedRoute}
                                onHover={(rt: any) => { setHighlightedRoute(rt.layerId); highlightRouteLayer(mapRef, routes, rt.layerId) }}
                                onLeave={() => { setHighlightedRoute(null); highlightRouteLayer(mapRef, routes, null) }}
                                onGo={(rt: any) => {
                                    setSelectedRoute(rt)
                                    setDetailsOpen(true)
                                    setHighlightedRoute(rt.layerId)
                                    highlightRouteLayer(mapRef, routes, rt.layerId)
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
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
                            const pos = await getCurrentPosition({ enableHighAccuracy: true, maximumAge: 20000, timeout: 8000 })
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
        </div>
    )
}
