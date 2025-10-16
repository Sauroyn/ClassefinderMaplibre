import { useMemo } from 'react'
import { BottomSheetBase } from './BottomSheetBase'
import type { RouteItem } from './MobileSheets'
import { formatEta, formatDistance } from './MobileSheets'

export function MobileRouteDetailsSheet({
    open,
    route,
    onStart,
    arrivalTime,
}: {
    open: boolean
    route: RouteItem | null
    onStart: (rt: RouteItem) => void
    arrivalTime?: Date | null
}) {
    if (!route) return null
    const eta = formatEta(route.time)
    const dist = formatDistance(route.distance)
    const arrStr = useMemo(() => arrivalTime ? arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null, [arrivalTime])
    const iconFor = (type: string) => {
        const style: any = { width: 18, height: 18, display: 'inline-block', marginRight: 6 }
        switch (type) {
            case 'turn-right': return (<span aria-hidden style={style}>↱</span>)
            case 'turn-left': return (<span aria-hidden style={style}>↰</span>)
            case 'turn-slight-right': return (<span aria-hidden style={style}>↗</span>)
            case 'turn-slight-left': return (<span aria-hidden style={style}>↖</span>)
            case 'uturn': return (<span aria-hidden style={style}>⤴</span>)
            case 'floor-up': return (<span aria-hidden style={style}>🧭⬆︎</span>)
            case 'floor-down': return (<span aria-hidden style={style}>🧭⬇︎</span>)
            case 'arrive': return (<span aria-hidden style={style}>🏁</span>)
            default: return (<span aria-hidden style={style}>➡</span>)
        }
    }
    const instructionFr = (type: string, meters: number) => {
        const d = Math.max(0, Math.round(meters))
        switch (type) {
            case 'turn-right': return `dans ${d} m, tournez à droite`
            case 'turn-left': return `dans ${d} m, tournez à gauche`
            case 'turn-slight-right': return `dans ${d} m, tournez légèrement à droite`
            case 'turn-slight-left': return `dans ${d} m, tournez légèrement à gauche`
            case 'uturn': return `dans ${d} m, faites demi-tour`
            case 'floor-up': return `dans ${d} m, montez un étage`
            case 'floor-down': return `dans ${d} m, descendez d'un étage`
            case 'arrive': return d > 0 ? `dans ${d} m, vous êtes arrivé` : `Vous êtes arrivé`
            default: return `dans ${d} m, continuez tout droit`
        }
    }
    return (
        <BottomSheetBase open={open} reduceOnOutsideClick={false} header={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button aria-label="Retour" title="Retour" onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('route-details-back')) }}
                        style={{ marginRight: 8, background: 'none', border: 'none', color: 'var(--rsbs-color, #111)', fontSize: 20, cursor: 'pointer', padding: 0, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 700 }}>&larr;</span>
                    </button>
                    <div style={{ fontWeight: 700 }}>Trajet sélectionné</div>
                </div>
            </div>
        } initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]} minPeekPx={40}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--list-item-muted, #666)' }}>Durée</div>
                        <div style={{ fontWeight: 700 }}>{eta}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--list-item-muted, #666)' }}>Distance</div>
                        <div style={{ fontWeight: 700 }}>{dist}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--list-item-muted, #666)' }}>Arrivée</div>
                        <div style={{ fontWeight: 700 }}>{arrStr ?? '-'}</div>
                    </div>
                </div>

                <button onClick={() => onStart(route)} style={{ padding: '12px 16px', borderRadius: 12, border: 'none', background: 'var(--btn-fg, #111)', color: 'var(--btn-bg, #fff)', fontWeight: 700 }}>Démarrer</button>

                {route.steps && route.steps.length > 0 && (
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Étapes</div>
                        <ol style={{ listStyle: 'decimal', paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(() => {
                                const steps = route.steps || []
                                const cumEnds: number[] = []
                                let run = 0
                                for (let i = 0; i < steps.length; i++) { run += Math.max(0, Number(steps[i]?.distance || 0)); cumEnds.push(run) }
                                return steps.slice(0, 12).map((s, i) => (
                                    <li key={i} style={{ fontSize: 13, color: 'var(--panel-fg, #333)', cursor: 'pointer' }} onClick={() => {
                                        try {
                                            const bbox = (s as any).bbox as [[number, number], [number, number]] | undefined
                                            if (bbox && Array.isArray(bbox[0]) && Array.isArray(bbox[1])) {
                                                window.dispatchEvent(new CustomEvent('nav:focus-step-bounds', { detail: bbox }))
                                            } else if (s && s.coords && Array.isArray(s.coords) && s.coords.length === 2) {
                                                const a = s.coords[0]
                                                const b = s.coords[1]
                                                const minX = Math.min(a[0], b[0])
                                                const minY = Math.min(a[1], b[1])
                                                const maxX = Math.max(a[0], b[0])
                                                const maxY = Math.max(a[1], b[1])
                                                const bounds: [[number, number], [number, number]] = [[minX, minY], [maxX, maxY]]
                                                window.dispatchEvent(new CustomEvent('nav:focus-step-bounds', { detail: bounds }))
                                            }
                                            const lvl = (s as any).level
                                            if (lvl != null) {
                                                const n = typeof lvl === 'string' ? parseInt(lvl, 10) : lvl
                                                if (!Number.isNaN(n)) window.dispatchEvent(new CustomEvent('ui:set-level', { detail: n }))
                                            }
                                        } catch { }
                                    }}>
                                        {(() => {
                                            const manList: Array<any> = Array.isArray((route as any).maneuvers) ? (route as any).maneuvers : []
                                            const at = cumEnds[i]
                                            let man = manList.find(m => (m.at || 0) >= at)
                                            if ((s as any).type === 'floor-change') {
                                                const dir = (s as any).direction
                                                const t = dir === 'up' ? 'floor-up' : 'floor-down'
                                                man = { at, type: t }
                                            }
                                            const prevAt = (i === 0 ? 0 : cumEnds[i - 1])
                                            const distanceTo = Math.max(0, (man?.at || at) - prevAt)
                                            const t = man?.type || 'continue'
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    {iconFor(t)}
                                                    <span>{instructionFr(t, distanceTo)}</span>
                                                </div>
                                            )
                                        })()}
                                    </li>
                                ))
                            })()}
                            {route.steps.length > 12 && (
                                <li style={{ fontSize: 12, color: 'var(--list-item-muted, #666)' }}>… {route.steps.length - 12} étapes supplémentaires</li>
                            )}
                        </ol>
                    </div>
                )}
            </div>
        </BottomSheetBase>
    )
}
