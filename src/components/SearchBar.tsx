import { useEffect, useMemo, useState } from 'react'

type Props = {
    data: GeoJSON.FeatureCollection | null
    onSelect: (id: number | string, level?: number | string) => void
    onClear?: () => void
}

const STORAGE_KEY = 'cf:recent_searches'

export default function SearchBar({ data, onSelect, onClear }: Props) {
    const [q, setQ] = useState('')
    const [focused, setFocused] = useState(false)
    const [showBack, setShowBack] = useState(false)
    const [recent, setRecent] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } })

    const items = useMemo(() => {
        if (!data) return []
        const list: Array<{ id: string | number; name: string; level?: string }> = []
        for (const f of data.features as any) list.push({ id: f.id ?? f.properties?.id ?? f.properties?.name, name: f.properties?.name || '', level: f.properties?.level })
        return list.filter(i => i.name.toLowerCase().startsWith(q.toLowerCase()))
    }, [data, q])

    useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Tab' && items.length === 1) { e.preventDefault(); setQ(items[0].name); onSelect(items[0].id, items[0].level) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [items, onSelect])

    const pick = (id: string | number, name: string) => {
        let resolved: string | number = id
        if (data) {
            const found = data.features.find((f: any) => (f.id ?? f.properties?.id ?? f.properties?.name) === id || f.properties?.name === name)
            if (found) resolved = found.id ?? found.properties?.id ?? name
        }
        setQ(name)
        setRecent(r => { const next = [name, ...r.filter(x => x !== name)].slice(0, 5); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { } return next })
        const lvl = data && data.features ? (data.features.find((f: any) => (f.id ?? f.properties?.id ?? f.properties?.name) === resolved) || {}).properties?.level : undefined
        onSelect(resolved, lvl)
        // keep back button visible after selection
        setShowBack(true)
    }

    const list = (q ? items : recent.map(name => ({ id: name, name }))).slice(0, 6)
    return (
        <div className="searchbar" style={{ position: 'absolute', left: 12, top: 12, zIndex: 10, width: 360, background: 'white', padding: 8, borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
                {(focused || showBack) && <button onClick={() => { setQ(''); setFocused(false); setShowBack(false); if ((onClear)) onClear() }} style={{ width: 36, height: 36 }}>←</button>}
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une salle..." style={{ flex: 1, padding: '8px' }} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} />
            </div>
            {(focused || q) && list.map((it: any) => (
                <div key={String(it.id)} onMouseDown={() => pick(it.id, it.name)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{it.level ?? ''}</div>
                    </div>
                    {it.level != null ? <div style={{ alignSelf: 'center', opacity: 0.9, padding: '4px 8px', background: '#f1f3f5', borderRadius: 12 }}>{it.level}</div> : <div style={{ width: 36 }} />}
                </div>
            ))}
        </div>
    )
}
