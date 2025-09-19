import { useState, useEffect } from 'react'
import { computeAndDrawRoute } from '../map/computeRoute'
import { parseGeoJSON } from './route-planner/utils'
import type { Graph } from './route-planner/utils'
import Suggestions from './route-planner/Suggestions'
import RouteOption from './route-planner/RouteOption'

export default function RoutePlanner({ mapRef, initialDestination, onClose }: { mapRef: any, initialDestination?: any, onClose?: () => void }) {
    const [graph, setGraph] = useState<Graph | null>(null)
    const [start, setStart] = useState<string>('')
    const [end, setEnd] = useState<string>('')

    const [nodeOptions, setNodeOptions] = useState<Array<{ id: string, name: string, level?: string }>>([])
    const [startQuery, setStartQuery] = useState<string>('')
    const [endQuery, setEndQuery] = useState<string>('')
    const [focusedField, setFocusedField] = useState<'start' | 'end' | null>(null)

    useEffect(() => {
        // Try to load default file name (geojson or json)
        async function loadDefault() {
            const candidates = ['/testGraph.geojson']
            for (const url of candidates) {
                try {
                    console.log('[RoutePlanner] trying to load', url)
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
                    // do not auto-set start/end; let the user choose. We keep nodeOptions for suggestions.
                    return
                } catch (e) { /* try next */ }
            }
            console.warn('[RoutePlanner] no default graph found')
        }
        loadDefault()
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

    // no file input handling: graph loaded from defaults only

    const [routes, setRoutes] = useState<Array<any>>([])
    const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null)
    const [excludeStairs, setExcludeStairs] = useState<boolean>(false)
    const [coveredOnly, setCoveredOnly] = useState<boolean>(false)
    const [showSecondary, setShowSecondary] = useState<boolean>(true)
    const [showSettings, setShowSettings] = useState<boolean>(false)
    async function compute() {
        if (!graph) { console.warn('[RoutePlanner] no graph loaded'); return }
        // clear previous routes while computing
        setRoutes([])
        try {
            const k = showSecondary ? 3 : 1
            const res = await computeAndDrawRoute({ graph, start, end, excludeStairs, coveredOnly, mapRef, k })
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
                        const res = await computeAndDrawRoute({ graph, start, end: setId, excludeStairs, coveredOnly, mapRef, k: 3 })
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
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: 8, borderRadius: 4, zIndex: 20, width: 360, boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', marginBottom: 6 }}>
                {onClose && <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } if (onClose) onClose() }} aria-label="close" title="Close" style={{ position: 'absolute', left: 6, top: 6, width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', fontSize: 16 }}>✕</button>}
                <div style={{ textAlign: 'center', fontWeight: 600 }}>Itinéraire</div>
                <button title="Paramètres itinéraire" onClick={() => setShowSettings(s => !s)} style={{ position: 'absolute', right: 6, top: 6, width: 32, height: 28, borderRadius: 4, border: 'none', background: 'transparent', fontSize: 16 }}>⚙</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>Départ</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                        <input value={startQuery} onChange={(e) => { setStartQuery(e.target.value); setFocusedField('start') }} onFocus={() => { setFocusedField('start') }} onBlur={() => setTimeout(() => { setFocusedField(null) }, 150)} onKeyDown={(e) => {
                            const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((startQuery || '').toLowerCase()))
                            if ((e.key === 'Enter' || e.key === 'Tab') && list.length === 1) {
                                e.preventDefault()
                                const n = list[0]
                                setStart(n.id)
                                setStartQuery(n.name || String(n.id))
                                setFocusedField(null)
                            }
                        }} style={{ flex: 1, padding: 6 }} placeholder="Rechercher un départ..." />
                        {startQuery ? <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } setStart(''); setStartQuery(''); setRoutes([]); setHighlightedRoute(null); }} title="Clear start" style={{ padding: '6px' }}>✕</button> : null}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 8 }}>Arrivée</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                        <input value={endQuery} onChange={(e) => { setEndQuery(e.target.value); setFocusedField('end') }} onFocus={() => { setFocusedField('end') }} onBlur={() => setTimeout(() => { setFocusedField(null) }, 150)} onKeyDown={(e) => {
                            const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((endQuery || '').toLowerCase()))
                            if ((e.key === 'Enter' || e.key === 'Tab') && list.length === 1) {
                                e.preventDefault()
                                const n = list[0]
                                setEnd(n.id)
                                setEndQuery(n.name || String(n.id))
                                setFocusedField(null)
                            }
                        }} style={{ flex: 1, padding: 6 }} placeholder="Rechercher une arrivée..." />
                        {endQuery ? <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } setEnd(''); setEndQuery(''); setRoutes([]); setHighlightedRoute(null); }} title="Clear end" style={{ padding: '6px' }}>✕</button> : null}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } setRoutes([]); setHighlightedRoute(null); const s = start; const sq = startQuery; setStart(end); setEnd(s); setStartQuery(endQuery); setEndQuery(sq) }} title="Swap" style={{ padding: '8px 10px' }}>⇄</button>
                </div>
                {showSettings && (
                    <div style={{ position: 'absolute', right: 12, top: 40, background: 'white', border: '1px solid #ddd', padding: 8, borderRadius: 6, zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 13 }}><input type="checkbox" checked={excludeStairs} onChange={(e) => setExcludeStairs(e.target.checked)} />{' '}Mode fauteuil roulant (sans escaliers)</label>
                            <label style={{ fontSize: 13 }}><input type="checkbox" checked={coveredOnly} onChange={(e) => setCoveredOnly(e.target.checked)} />{' '}Couvert uniquement</label>
                            <label style={{ fontSize: 13 }}><input type="checkbox" checked={showSecondary} onChange={(e) => setShowSecondary(e.target.checked)} />{' '}Afficher itinéraires secondaires</label>
                            <div style={{ fontSize: 12, color: '#333' }}><strong>Filtres actifs :</strong> {excludeStairs ? 'Sans escaliers' : '—'}{', '}{coveredOnly ? 'Couvert' : '—'}</div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => { setShowSettings(false); try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } if (graph && start && end) compute() }} style={{ padding: '6px 8px' }}>Appliquer</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom suggestion panel inside planner container (full width under inputs) */}
            <div style={{ width: '100%', marginTop: 6, borderTop: '1px solid #eee', paddingTop: 6, maxHeight: 220, overflow: 'auto' }}>
                <div style={{ marginBottom: 8 }}>
                    {/* Always show existing routes first (if any), then suggestions beneath when a field is focused */}
                    {routes && routes.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                            {routes.map((r: any, i: number) => (
                                <RouteOption key={r.id} route={{ ...r, index: i }} primary={i === 0} highlighted={highlightedRoute === r.layerId} onHover={(rt: any) => { setHighlightedRoute(rt.layerId); highlightRouteLayer(rt.layerId) }} onLeave={() => { setHighlightedRoute(null); highlightRouteLayer(null) }} onGo={(rt: any) => { /* when Go pressed, mark route as selected and ensure it's highlighted */ setHighlightedRoute(rt.layerId); highlightRouteLayer(rt.layerId) }} />
                            ))}
                        </div>
                    )}
                    <Suggestions focusedField={focusedField} startQuery={startQuery} endQuery={endQuery} nodeOptions={nodeOptions} onSelectStart={(id, name) => { setStart(id); setStartQuery(name); setFocusedField(null) }} onSelectEnd={(id, name) => { setEnd(id); setEndQuery(name); setFocusedField(null) }} />
                </div>
            </div>
        </div>
    )
}
