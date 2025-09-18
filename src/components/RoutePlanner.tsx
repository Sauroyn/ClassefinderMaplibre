import { useState, useEffect } from 'react'
import { computeAndDrawRoute } from '../map/computeRoute'
import { parseGeoJSON } from './route-planner/utils'
import type { Graph } from './route-planner/utils'
import Suggestions from './route-planner/Suggestions'

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

    async function compute() {
        if (!graph) { console.warn('[RoutePlanner] no graph loaded'); return }
        try {
            await computeAndDrawRoute({ graph, start, end, excludeStairs: false, mapRef })
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

    return (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: 8, borderRadius: 4, zIndex: 20, width: 360, boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', marginBottom: 6 }}>
                {onClose && <button onClick={() => { if (onClose) onClose() }} aria-label="close" title="Close" style={{ position: 'absolute', left: 6, top: 6, width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', fontSize: 16 }}>✕</button>}
                <div style={{ textAlign: 'center', fontWeight: 600 }}>Itinéraire</div>
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
                        {startQuery ? <button onClick={() => { setStart(''); setStartQuery('') }} title="Clear start" style={{ padding: '6px' }}>✕</button> : null}
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
                        {endQuery ? <button onClick={() => { setEnd(''); setEndQuery('') }} title="Clear end" style={{ padding: '6px' }}>✕</button> : null}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => { const s = start; const sq = startQuery; setStart(end); setEnd(s); setStartQuery(endQuery); setEndQuery(sq) }} title="Swap" style={{ padding: '8px 10px' }}>⇄</button>
                </div>
            </div>

            {/* Bottom suggestion panel inside planner container (full width under inputs) */}
            <div style={{ width: '100%', marginTop: 6, borderTop: '1px solid #eee', paddingTop: 6, maxHeight: 220, overflow: 'auto' }}>
                <Suggestions focusedField={focusedField} startQuery={startQuery} endQuery={endQuery} nodeOptions={nodeOptions} onSelectStart={(id, name) => { setStart(id); setStartQuery(name); setFocusedField(null) }} onSelectEnd={(id, name) => { setEnd(id); setEndQuery(name); setFocusedField(null) }} />
            </div>
        </div>
    )
}
