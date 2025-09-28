import { useEffect, useMemo, useRef, useState } from 'react'
import SearchList from './search/SearchList'
import SearchSelected from './search/SearchSelected'

type Props = {
    data: GeoJSON.FeatureCollection | null
    onSelect: (id: number | string, level?: number | string) => void
    onRouteRequest?: (feature: any) => void
    onClear?: () => void
}

const BASE_STORAGE_KEY = 'cf:recent_searches'
const CONFIG_STORAGE_KEY = 'site_config_file'

function getScopedStorageKey() {
    try {
        const sel = (typeof window !== 'undefined') ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
        const suffix = sel && typeof sel === 'string' ? sel : 'default'
        return `${BASE_STORAGE_KEY}:${suffix}`
    } catch (e) {
        return `${BASE_STORAGE_KEY}:default`
    }
}

export default function SearchBar({ data, onSelect, onClear, onRouteRequest }: Props) {
    const [q, setQ] = useState('')
    const [focused, setFocused] = useState(false)
    const [showBack, setShowBack] = useState(false)
    type RecentItem = { id: string | number, name: string, level?: string | number }
    const [recent, setRecent] = useState<RecentItem[]>(() => {
        try {
            const key = getScopedStorageKey()
            const raw = JSON.parse(localStorage.getItem(key) || '[]')
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
        return list.filter(i => i.name.toLowerCase().includes(q.toLowerCase()))
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
            try { const key = getScopedStorageKey(); localStorage.setItem(key, JSON.stringify(next)) } catch { }
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
        <div className="searchbar" style={{ position: 'absolute', left: 12, top: 12, zIndex: 10, width: 360, background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', padding: 8, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.18)', border: '1px solid var(--panel-border, #ddd)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* left icon: back | clear | search */}
                {showBack ? (
                    <button onClick={() => { setQ(''); setFocused(false); setShowBack(false); setSelected(null); if ((onClear)) onClear() }} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>←</button>
                ) : q.length > 0 ? (
                    <button onClick={() => { if (blurTimeout.current) { clearTimeout(blurTimeout.current); blurTimeout.current = null }; setQ(''); setFocused(true); if (inputRef.current) inputRef.current.focus() }} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>✕</button>
                ) : (
                    <button onClick={() => { const el = document.querySelector('.searchbar input') as HTMLInputElement | null; if (el) el.focus() }} style={{ width: 36, height: 36, background: 'var(--btn-bg, transparent)', border: '1px solid var(--btn-border, transparent)', borderRadius: 8, color: 'var(--btn-fg, inherit)' }} aria-label="search">🔍</button>
                )}
                <input ref={inputRef} className="search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une salle..." style={{ flex: 1, padding: '8px', background: 'var(--panel-bg, #fff)', color: 'var(--panel-fg, #111)', border: '1px solid var(--panel-border, #eee)', borderRadius: 8, outline: 'none' }} onFocus={() => { if (blurTimeout.current) { clearTimeout(blurTimeout.current); blurTimeout.current = null }; setFocused(true); setSelected(null) }} onBlur={() => { if (blurTimeout.current) clearTimeout(blurTimeout.current); blurTimeout.current = window.setTimeout(() => { setFocused(false); blurTimeout.current = null }, 150) }} />
            </div>
            {showList && <SearchList items={list as any} onPick={(id, name) => pick(id, name)} />}

            {/* Selected details */}
            <SearchSelected selected={selected as any} onRoute={(feat: any) => { if (onRouteRequest) onRouteRequest(feat) }} data={data} />
        </div>
    )
}
