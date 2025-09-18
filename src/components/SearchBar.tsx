import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
    data: GeoJSON.FeatureCollection | null
    onSelect: (id: number | string, level?: number | string) => void
    onRouteRequest?: (feature: any) => void
    onClear?: () => void
}

const STORAGE_KEY = 'cf:recent_searches'

export default function SearchBar({ data, onSelect, onClear, onRouteRequest }: Props) {
    const [q, setQ] = useState('')
    const [focused, setFocused] = useState(false)
    const [showBack, setShowBack] = useState(false)
    type RecentItem = { id: string | number, name: string, level?: string | number }
    const [recent, setRecent] = useState<RecentItem[]>(() => {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            if (Array.isArray(raw)) return raw.map((r: any) => typeof r === 'string' ? { id: r, name: r } : { id: r.id ?? r.name, name: r.name, level: r.level })
        } catch (e) { }
        return []
    })
    const [selected, setSelected] = useState<RecentItem | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const blurTimeout = useRef<number | null>(null)

    const items = useMemo(() => {
        if (!data) return []
        const list: Array<{ id: string | number; name: string; level?: string }> = []
        for (const f of data.features as any) list.push({ id: f.id ?? f.properties?.id ?? f.properties?.name, name: f.properties?.name || '', level: f.properties?.level })
        return list.filter(i => i.name.toLowerCase().startsWith(q.toLowerCase()))
    }, [data, q])

    useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Tab' && items.length === 1) { e.preventDefault(); const it = items[0]; setQ(it.name); setSelected(it); setShowBack(true); onSelect(it.id, it.level) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [items, onSelect])

    // respond to map clicks when they dispatch a feature click event
    useEffect(() => {
        function onMapFeatureClick(e: any) {
            const feat = e.detail as any
            if (!feat) return
            const name = feat.properties?.name ?? feat.properties?.title ?? feat.id
            const id = feat.id ?? feat.properties?.id ?? name
            // mimic a user pick
            pick(id, name)
            // do not auto-open route planner here; RoutePlanner listens separately when open
        }
        window.addEventListener('map:feature-click', onMapFeatureClick as any)
        return () => { window.removeEventListener('map:feature-click', onMapFeatureClick as any) }
    }, [data])

    const pick = (id: string | number, name: string) => {
        let resolved: string | number = id
        if (data) {
            const found = data.features.find((f: any) => (f.id ?? f.properties?.id ?? f.properties?.name) === id || f.properties?.name === name)
            if (found) resolved = found.id ?? found.properties?.id ?? name
        }
        setQ(name)
        const lvl = data && data.features ? (data.features.find((f: any) => (f.id ?? f.properties?.id ?? f.properties?.name) === resolved) || {}).properties?.level : undefined
        // update recent as objects
        setRecent(r => {
            const next = [{ id: resolved, name, level: lvl }, ...r.filter(x => String(x.id) !== String(resolved))].slice(0, 5)
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { }
            return next
        })
        // apply selection
        const item = { id: resolved, name, level: lvl }
        setSelected(item)
        setShowBack(true)
        setFocused(false)
        onSelect(resolved, lvl)
    }

    const list = (q ? items : recent).slice(0, 6)
    const showList = focused && !selected
    return (
        <div className="searchbar" style={{ position: 'absolute', left: 12, top: 12, zIndex: 10, width: 360, background: 'white', padding: 8, borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* left icon: back | clear | search */}
                {showBack ? (
                    <button onClick={() => { setQ(''); setFocused(false); setShowBack(false); setSelected(null); if ((onClear)) onClear() }} style={{ width: 36, height: 36 }}>←</button>
                ) : q.length > 0 ? (
                    <button onClick={() => { if (blurTimeout.current) { clearTimeout(blurTimeout.current); blurTimeout.current = null }; setQ(''); setFocused(true); if (inputRef.current) inputRef.current.focus() }} style={{ width: 36, height: 36 }}>✕</button>
                ) : (
                    <button onClick={() => { const el = document.querySelector('.searchbar input') as HTMLInputElement | null; if (el) el.focus() }} style={{ width: 36, height: 36, background: 'transparent', border: 'none' }} aria-label="search">🔍</button>
                )}
                <input ref={inputRef} className="search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une salle..." style={{ flex: 1, padding: '8px' }} onFocus={() => { if (blurTimeout.current) { clearTimeout(blurTimeout.current); blurTimeout.current = null }; setFocused(true); setSelected(null) }} onBlur={() => { if (blurTimeout.current) clearTimeout(blurTimeout.current); blurTimeout.current = window.setTimeout(() => { setFocused(false); blurTimeout.current = null }, 150) }} />
            </div>
            {showList && list.map((it: any) => (
                <div key={String(it.id)} onMouseDown={() => pick(it.id, it.name)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                    </div>
                    {it.level != null ? <div style={{ alignSelf: 'center', opacity: 0.9, padding: '4px 8px', background: '#f1f3f5', borderRadius: 12 }}>{it.level}</div> : <div style={{ width: 36 }} />}
                </div>
            ))}

            {/* Selected details */}
            {selected && (
                <div style={{ marginTop: 8, padding: 10, background: '#fbfbfb', borderRadius: 6, boxShadow: 'inset 0 0 0 1px #eee' }}>
                    <div style={{ fontWeight: 700 }}>{selected.name}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                        <div style={{ padding: '6px 10px', background: '#f1f3f5', borderRadius: 12 }}>{selected.level ?? '—'}</div>
                        <button style={{ padding: '6px 10px' }} onClick={() => {
                            if (!onRouteRequest) return
                            // find feature in data
                            const feat = (data && data.features) ? data.features.find((f: any) => (f.id ?? f.properties?.id ?? f.properties?.name) === selected.id || f.properties?.name === selected.name) : null
                            onRouteRequest(feat || { id: selected.id, name: selected.name })
                        }}>Itinéraire</button>
                        <button style={{ padding: '6px 10px' }}>Alias</button>
                    </div>
                </div>
            )}
        </div>
    )
}
