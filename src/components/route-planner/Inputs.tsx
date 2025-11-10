type NodeOption = { id: string, name: string }

type Props = {
    startQuery: string
    endQuery: string
    setStartQuery: (v: string) => void
    setEndQuery: (v: string) => void
    onPickStart: (id: string, name: string) => void
    onPickEnd: (id: string, name: string) => void
    onClearStart: () => void
    onClearEnd: () => void
    nodeOptions: NodeOption[]
    setFocusedField: (f: 'start' | 'end' | null) => void
}

export default function Inputs({ startQuery, endQuery, setStartQuery, setEndQuery, onPickStart, onPickEnd, onClearStart, onClearEnd, nodeOptions, setFocusedField }: Props) {
    const tryPickSingle = (query: string, pick: (id: string, name: string) => void) => {
        const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((query || '').toLowerCase()))
        if (list.length === 1) { const n = list[0]; pick(n.id, n.name || String(n.id)); setFocusedField(null) }
    }
    return (
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}><div>Départ</div></div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <input value={startQuery} onChange={(e) => { setStartQuery(e.target.value); setFocusedField('start') }} onFocus={() => setFocusedField('start')} onBlur={() => setTimeout(() => setFocusedField(null), 150)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); tryPickSingle(startQuery, onPickStart) } }} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--panel-border, #ddd)', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)' }} placeholder="Rechercher un départ..." />
                {startQuery ? <button onClick={onClearStart} title="Clear start" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>✕</button> : null}
            </div>
            <div style={{ fontSize: 12, marginTop: 8 }}>Arrivée</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <input value={endQuery} onChange={(e) => { setEndQuery(e.target.value); setFocusedField('end') }} onFocus={() => setFocusedField('end')} onBlur={() => setTimeout(() => setFocusedField(null), 150)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); tryPickSingle(endQuery, onPickEnd) } }} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--panel-border, #ddd)', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)' }} placeholder="Rechercher une arrivée..." />
                {endQuery ? <button onClick={onClearEnd} title="Clear end" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>✕</button> : null}
            </div>
        </div>
    )
}
