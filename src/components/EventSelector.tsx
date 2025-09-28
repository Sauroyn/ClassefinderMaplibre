import { useEffect, useMemo, useRef, useState } from 'react'
import Select from 'react-select'

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
    onClear: _onClear
}: {
    events: SimpleEvent[]
    selectedId?: string | null
    onSelect: (ev: SimpleEvent) => void
    onClear?: () => void
}) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth <= 640 : false))
    const [bottom, setBottom] = useState<number>(12)

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

    const filtered = sorted

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

    const options = useMemo(() => {
        const groups: Record<string, { label: string, options: any[] }> = {}
        for (const ev of filtered) {
            const label = labelFor(ev)
            const day = ev.dayKey || 'Autres'
            if (!groups[day]) groups[day] = { label: day, options: [] }
            groups[day].options.push({ value: ev.id, label, ev })
        }
        return Object.values(groups)
    }, [filtered])

    const currentValue = selected ? { value: selected.id, label: labelFor(selected), ev: selected } : null

    return (
        <div
            ref={containerRef}
            className="event-selector"
            style={isMobile
                ? { position: 'fixed', right: 64, bottom, zIndex: 10000, width: 'min(92vw, 400px)' }
                : { position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom, zIndex: 10000, width: 'min(92vw, 450px)' }
            }
        >
            <Select
                options={options as any}
                value={currentValue as any}
                onChange={(opt: any) => { if (!opt) { _onClear && _onClear(); return } onSelect(opt.ev) }}
                isClearable
                menuPlacement="top"
                placeholder="Sélectionner un événement durant la semaine"
                noOptionsMessage={() => 'Aucun résultat'}
                styles={{
                    container: (base) => ({ ...base, zIndex: 10000 }),
                    control: (base) => ({ ...base, borderRadius: 999 }),
                    valueContainer: (base) => ({ ...base, overflow: 'hidden' }),
                    singleValue: (base) => ({ ...base, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }),
                    menu: (base) => ({ ...base, zIndex: 10001 })
                }}
                formatOptionLabel={(opt: any) => (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div>{opt.label}</div>
                        {opt.ev?.issues?.length ? (
                            <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {opt.ev.issues.map((iss: string, i: number) => (
                                    <span key={i} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 12, background: '#fff4e6', color: '#b76e00', border: '1px solid #ffd8a8' }}>{iss}</span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                )}
                isSearchable
            />
        </div>
    )
}
