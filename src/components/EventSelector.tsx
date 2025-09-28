import { useEffect, useMemo, useRef, useState } from 'react'

export type SimpleEvent = {
    id: string
    title: string | null
    start: Date | null
    end: Date | null
    location: string | null
    dayKey: string // YYYY-MM-DD
    issues?: string[]
    precomputed?: {
        fromPrevSeconds?: number | null
        fromUserPossible?: boolean
    }
}

export default function EventSelector({
    events,
    selectedId,
    onSelect,
    onClear
}: {
    events: SimpleEvent[]
    selectedId?: string | null
    onSelect: (ev: SimpleEvent) => void
    onClear?: () => void
}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth <= 640 : false))
    const [bottom, setBottom] = useState<number>(12)
    const [q, setQ] = useState<string>('')
    // close on outside click
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!containerRef.current) return
            if (!containerRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [])

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 640)
        window.addEventListener('resize', onResize)
        window.addEventListener('orientationchange', onResize)
        onResize()
        return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize) }
    }, [])

    useEffect(() => {
        const compute = () => {
            try {
                const ctrl = document.querySelector('.maplibregl-ctrl-bottom-right') as HTMLElement | null
                const GAP = 12
                let h = 0
                if (ctrl) { const r = ctrl.getBoundingClientRect(); h = Math.max(0, Math.ceil(r.height)) }
                setBottom(GAP + h)
            } catch { setBottom(12) }
        }
        const update = () => { try { requestAnimationFrame(() => compute()) } catch { compute() } }
        update()
        let ro: ResizeObserver | null = null
        try {
            const ctrl = document.querySelector('.maplibregl-ctrl-bottom-right') as HTMLElement | null
            if (ctrl && 'ResizeObserver' in window) { ro = new ResizeObserver(() => update()); ro.observe(ctrl) }
        } catch { }
        window.addEventListener('resize', update)
        window.addEventListener('orientationchange', update)
        const mo = new MutationObserver(update)
        mo.observe(document.body, { childList: true, subtree: true })
        return () => {
            try { if (ro) ro.disconnect() } catch { }
            window.removeEventListener('resize', update)
            window.removeEventListener('orientationchange', update)
            try { mo.disconnect() } catch { }
        }
    }, [])

    const sorted = useMemo(() => {
        return [...events].sort((a, b) => {
            const as = a.start ? a.start.getTime() : 0
            const bs = b.start ? b.start.getTime() : 0
            return as - bs
        })
    }, [events])

    const filtered = useMemo(() => {
        const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase()
        const qq = norm(q)
        if (!qq) return sorted
        return sorted.filter(ev => {
            const parts = [ev.title || '', ev.location || '']
            if (ev.start) parts.push(ev.start.toLocaleString())
            if (ev.end) parts.push(ev.end.toLocaleString())
            return parts.some(p => norm(String(p)).includes(qq))
        })
    }, [sorted, q])

    const labelFor = (ev: SimpleEvent) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        const s = ev.start ? `${pad(ev.start.getHours())}:${pad(ev.start.getMinutes())}` : '—'
        const e = ev.end ? `${pad(ev.end.getHours())}:${pad(ev.end.getMinutes())}` : '—'
        const name = ev.title || '(Sans titre)'
        const place = ev.location || '(Lieu manquant)'
        let travel = ''
        if (ev.precomputed && typeof ev.precomputed.fromPrevSeconds === 'number') {
            const mins = Math.round(ev.precomputed.fromPrevSeconds / 60)
            travel = ` · ${mins} min`
        }
        const fromYou = ev.precomputed?.fromUserPossible === true ? ' · depuis vous possible' : ''
        return `${s}–${e} · ${name} · ${place}${travel}${fromYou}`
    }

    const selected = selectedId ? events.find(e => e.id === selectedId) : null
    const buttonLabel = selected
        ? (() => { const pad = (n: number) => String(n).padStart(2, '0'); const s = selected.start ? `${pad(selected.start.getHours())}:${pad(selected.start.getMinutes())}` : '—'; const name = selected.title || '(Sans titre)'; return `${s} · ${name}` })()
        : 'Sélectionner un événement durant la semaine'

    return (
        <div
            ref={containerRef}
            className="event-selector"
            style={isMobile
                ? { position: 'fixed', right: 64, bottom, zIndex: 10000 }
                : { position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom, zIndex: 10000 }}
        >
            <button onClick={() => setOpen(o => !o)} style={{ minWidth: 280, maxWidth: '92vw', padding: '10px 12px', borderRadius: 999, border: '1px solid #ddd', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                {sorted.length ? buttonLabel : 'Aucun événement'}
            </button>
            {open && (
                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 46, background: 'white', border: '1px solid #ddd', borderRadius: 8, maxHeight: '45vh', overflow: 'auto', width: 'min(92vw, 780px)', boxShadow: '0 6px 24px rgba(0,0,0,0.2)' }}>
                    <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un événement..." style={{ flex: 1, padding: 8 }} />
                        {onClear && <button onMouseDown={() => { onClear(); setQ(''); setOpen(false) }} title="Effacer la sélection" style={{ padding: '6px 8px' }}>✕</button>}
                    </div>
                    <div onMouseDown={() => { if (onClear) onClear(); setOpen(false) }} style={{ padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontWeight: 600, background: '#fbfbfb' }}>Sélectionner un événement durant la semaine</div>
                    {filtered.map(ev => (
                        <div key={ev.id} onMouseDown={() => { onSelect(ev); setOpen(false) }} style={{ padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{labelFor(ev)}</div>
                                {ev.issues && ev.issues.length > 0 && (
                                    <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {ev.issues.map((iss, i) => (
                                            <span key={i} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 12, background: '#fff4e6', color: '#b76e00', border: '1px solid #ffd8a8' }}>{iss}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
