import { useState, useEffect } from 'react'
import { shortestPath } from '../map/shortestPath'

type Graph = { nodes: any[], edges: any[] }

function distance2(a: number[], b: number[]) {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    return dx * dx + dy * dy
}

function parseGeoJSON(geo: any): Graph {
    const nodes: any[] = []
    const edges: any[] = []
    if (!geo || !geo.features) return { nodes, edges }

    // First pass: collect Point features as nodes
    let genNodeIdx = 0
    for (const f of geo.features) {
        if (!f.geometry) continue
        const type = f.geometry.type
        const props = f.properties || {}
        if (type === 'Point') {
            const id = String(props.id ?? props.name ?? `node-${genNodeIdx++}`)
            nodes.push({ id, coord: f.geometry.coordinates, name: props.name ?? id, raw: f })
        }
    }

    // helper to find nearest node (or exact match)
    function findNearestNode(coord: number[]) {
        if (nodes.length === 0) return null
        let best = nodes[0]
        let bestd = distance2(coord, best.coord)
        for (let i = 1; i < nodes.length; i++) {
            const d = distance2(coord, nodes[i].coord)
            if (d < bestd) { bestd = d; best = nodes[i] }
        }
        return best
    }

    // Second pass: interpret LineString features as edges
    let genEdgeIdx = 0
    for (const f of geo.features) {
        if (!f.geometry) continue
        const type = f.geometry.type
        const props = f.properties || {}
        if (type === 'LineString') {
            const coords = f.geometry.coordinates
            const id = String(props.id ?? props.name ?? `edge-${genEdgeIdx++}`)
            const weight = props.weight ?? 0
            let from = props.from != null ? String(props.from) : null
            let to = props.to != null ? String(props.to) : null

            // If from/to missing, try to snap to nearest nodes using endpoints
            if (!from || !to) {
                const startCoord = coords[0]
                const endCoord = coords[coords.length - 1]
                const n1 = findNearestNode(startCoord)
                const n2 = findNearestNode(endCoord)
                if (n1) from = from ?? n1.id
                if (n2) to = to ?? n2.id
            }

            // If still missing nodes, create them (as anonymous nodes)
            if (!from) {
                const nid = `node-gen-${genNodeIdx++}`
                const coord = coords[0]
                nodes.push({ id: nid, coord, name: nid, raw: null })
                from = nid
            }
            if (!to) {
                const nid = `node-gen-${genNodeIdx++}`
                const coord = coords[coords.length - 1]
                nodes.push({ id: nid, coord, name: nid, raw: null })
                to = nid
            }

            // Compute weight if not provided (euclidean length)
            let w = weight
            if (!w || w === 0) {
                let total = 0
                for (let i = 1; i < coords.length; i++) {
                    const a = coords[i - 1]
                    const b = coords[i]
                    total += Math.sqrt(distance2(a, b))
                }
                w = total
            }

            const tags = Array.isArray(props.tags) ? props.tags : (props.tags ? [props.tags] : [])
            edges.push({ id, from, to, weight: w, tags, raw: f })
        }
    }

    return { nodes, edges }
}

export default function RoutePlanner({ mapRef, initialDestination, onClose }: { mapRef: any, initialDestination?: any, onClose?: () => void }) {
    const [graph, setGraph] = useState<Graph | null>(null)
    const [start, setStart] = useState<string>('')
    const [end, setEnd] = useState<string>('')
    const [excludeStairs, setExcludeStairs] = useState(false)
    const [path, setPath] = useState<string[] | null>(null)
    const [nodeOptions, setNodeOptions] = useState<{ id: string, name: string }[]>([])
    const [startQuery, setStartQuery] = useState<string>('')
    const [showStartList, setShowStartList] = useState(false)
    const [endQuery, setEndQuery] = useState<string>('')
    const [showEndList, setShowEndList] = useState(false)

    useEffect(() => {
        // Try to load default file name (geojson or json)
        async function loadDefault() {
            const candidates = ['/src/map/testGraph.geojson', '/src/map/testGraph.json', '/src/map/testGraph.json']
            for (const url of candidates) {
                try {
                    console.log('[RoutePlanner] trying to load', url)
                    const r = await fetch(url)
                    if (!r.ok) continue
                    const j = await r.json()
                    const g = parseGeoJSON(j)
                    console.log('[RoutePlanner] parsed graph', g)
                    setGraph(g)
                    setNodeOptions(g.nodes.map(n => ({ id: n.id, name: n.name ?? n.id })))
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

    function getRawMap() {
        if (!mapRef) return null
        const cur = mapRef.current
        if (!cur) return null
        if ((cur as any).getMap) return (cur as any).getMap()
        if ((cur as any).map) return (cur as any).map
        return cur
    }

    function compute() {
        console.log('[RoutePlanner] compute', { start, end, excludeStairs })
        if (!graph) { console.warn('[RoutePlanner] no graph loaded'); return }
        const exclude = excludeStairs ? ['stairs'] : []
        try {
            const p = shortestPath({ nodes: graph.nodes, edges: graph.edges }, String(start), String(end), exclude)
            console.log('[RoutePlanner] shortestPath result', p)
            setPath(p as string[] | null)
            if (p) {
                const coords = (p as string[]).map((id) => {
                    const n = graph.nodes.find(x => x.id === String(id))
                    return n ? n.coord : null
                }).filter(Boolean)
                // collect levels from nodes if available
                const levels = (p as string[]).map((id) => {
                    const n = graph.nodes.find(x => x.id === String(id))
                    return n && n.raw && n.raw.properties ? n.raw.properties.level : null
                }).filter((l: any) => l != null)
                const props: any = {}
                if (levels.length === 1) props.level = levels[0]
                else if (levels.length > 1) props.levels = Array.from(new Set(levels))
                const geo = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: props }] }
                const map = getRawMap()
                if (!map) { console.warn('[RoutePlanner] map instance not found'); return }
                try {
                    console.log('[RoutePlanner] map object', map)
                    if (map.getSource && map.getSource('route-planner')) {
                        console.log('[RoutePlanner] updating existing source')
                        map.getSource('route-planner').setData(geo)
                        try {
                            if (map.setPaintProperty) {
                                map.setPaintProperty('route-planner-line', 'line-color', '#ff0000')
                                map.setPaintProperty('route-planner-line', 'line-width', 18)
                            }
                            if (map.setLayoutProperty) {
                                map.setLayoutProperty('route-planner-line', 'line-cap', 'round')
                                map.setLayoutProperty('route-planner-line', 'line-join', 'round')
                            }
                        } catch (e) { /* non-fatal */ }
                    } else {
                        console.log('[RoutePlanner] adding source and layer')
                        if (map.addSource) map.addSource('route-planner', { type: 'geojson', data: geo })
                        if (map.addLayer) map.addLayer({ id: 'route-planner-line', type: 'line', source: 'route-planner', paint: { 'line-color': '#ff0000', 'line-width': 18 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
                    }
                    // fit to route bounds
                    try {
                        const coordsArr = coords as any[]
                        if (coordsArr.length) {
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                            for (const c of coordsArr) { if (c[0] < minX) minX = c[0]; if (c[1] < minY) minY = c[1]; if (c[0] > maxX) maxX = c[0]; if (c[1] > maxY) maxY = c[1] }
                            if (isFinite(minX)) map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 40, duration: 400 })
                        }
                    } catch (e) { console.warn('[RoutePlanner] fitBounds failed', e) }
                } catch (err) { console.error('[RoutePlanner] error drawing route', err) }
            }
        } catch (err) { console.error('[RoutePlanner] compute failed', err) }
    }

    // clearMap removed: route cleared when planner closes or when path set to null

    // trigger compute automatically when both start and end IDs are present
    useEffect(() => {
        if (graph && start && end) {
            compute()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, end, excludeStairs, graph])

    return (
        <div style={{ position: 'absolute', top: 80, left: 10, background: 'white', padding: 8, borderRadius: 4, zIndex: 20, width: 360 }}>
            <div style={{ position: 'relative', marginBottom: 6 }}>
                {onClose && <button onClick={() => { if (onClose) onClose() }} aria-label="close" title="Close" style={{ position: 'absolute', left: 6, top: 6, width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', fontSize: 16 }}>✕</button>}
                <div style={{ textAlign: 'center', fontWeight: 600 }}>Itinéraire</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'end' }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => { const s = start; const sq = startQuery; setStart(end); setEnd(s); setStartQuery(endQuery); setEndQuery(sq) }} title="Swap" style={{ padding: '4px 6px' }}>⇄</button>
                        <div>Départ</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <input value={startQuery} onChange={(e) => { setStartQuery(e.target.value); setShowStartList(true) }} onFocus={() => setShowStartList(true)} onBlur={() => setTimeout(() => setShowStartList(false), 150)} style={{ width: 140, padding: 6 }} placeholder="Rechercher un départ..." />
                        <button onClick={() => { setStart(''); setStartQuery('') }} title="Clear start" style={{ padding: '4px' }}>✕</button>
                    </div>
                    {showStartList && (
                        <div style={{ position: 'absolute', top: 40, left: 0, width: 320, maxHeight: 200, overflow: 'auto', background: 'white', border: '1px solid #eee', zIndex: 30 }}>
                            {nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((startQuery || '').toLowerCase())).map(n => (
                                <div key={n.id} onMouseDown={() => { setStart(n.id); setStartQuery(n.name || String(n.id)); setShowStartList(false) }} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }}>{n.name}</div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 12 }}>Arrivée</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <input value={endQuery} onChange={(e) => { setEndQuery(e.target.value); setShowEndList(true) }} onFocus={() => setShowEndList(true)} onBlur={() => setTimeout(() => setShowEndList(false), 150)} style={{ width: 140, padding: 6 }} placeholder="Rechercher une arrivée..." />
                        <button onClick={() => { setEnd(''); setEndQuery('') }} title="Clear end" style={{ padding: '4px' }}>✕</button>
                    </div>
                    {showEndList && (
                        <div style={{ position: 'absolute', top: 28, left: 0, width: 320, maxHeight: 200, overflow: 'auto', background: 'white', border: '1px solid #eee', zIndex: 30 }}>
                            {nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((endQuery || '').toLowerCase())).map(n => (
                                <div key={n.id} onMouseDown={() => { setEnd(n.id); setEndQuery(n.name || String(n.id)); setShowEndList(false) }} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }}>{n.name}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <label style={{ display: 'block', marginBottom: 6 }}>
                <input type="checkbox" checked={excludeStairs} onChange={e => setExcludeStairs(e.target.checked)} /> Exclure les escaliers
            </label>
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12 }}>Result</div>
                <div style={{ fontSize: 13 }}>{path ? path.join(' → ') : '—'}</div>
            </div>
        </div>
    )
}
