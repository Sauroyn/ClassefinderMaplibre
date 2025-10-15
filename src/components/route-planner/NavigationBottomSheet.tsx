import type { NavigationState } from './NavigationController'
import { BottomSheetBase, formatDistance, formatEta } from './MobileSheets'

function iconFor(type: string) {
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

function instructionFr(type: string, meters: number) {
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

export default function NavigationBottomSheet({ nav, onFinish, onOpenSettings }: { nav: NavigationState, onFinish: () => void, onOpenSettings?: () => void }) {
    if (!nav.active || !nav.route) return null
    const route = nav.route as any
    const steps: Array<any> = Array.isArray(route.steps) ? route.steps : []
    const totalDist = formatDistance(Math.round(route.distance || 0))
    const totalTime = formatEta(Math.round(route.time || 0))

    // Detect dark mode
    const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches)
    const apiRef = { current: null as null | { snapTo: (index: number) => void, snapToMin: () => void } }

    return (
        <BottomSheetBase
            open={true}
            reduceOnOutsideClick={false}
            apiRef={apiRef}
            header={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700 }}>Trajet en cours</div>
                    <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{totalDist} • {totalTime}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button aria-label="Paramètres" title="Paramètres" onClick={() => {
                        try { window.dispatchEvent(new CustomEvent('ui:open-settings')) } catch { }
                        if (onOpenSettings) onOpenSettings()
                    }} style={{ border: '1px solid ' + (isDark ? '#333' : '#e3e3e3'), background: 'transparent', color: 'inherit', borderRadius: 8, padding: '4px 8px' }}>⚙</button>
                    <button onClick={onFinish} style={{ border: 'none', background: '#e74c3c', color: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}>Finir</button>
                </div>
            </div>}
            initialSnap={0.2}
            snapPercents={[0.12, 0.28, 0.5, 0.86]}
        >
            <div style={{ fontSize: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Étapes</div>
                {steps && steps.length ? (
                    <ol style={{ listStyle: 'decimal', paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(() => {
                            // Build cumulative distances at end of each step to derive "dans Xm" text using maneuvers
                            const cumEnds: number[] = []
                            let run = 0
                            for (let i = 0; i < steps.length; i++) { run += Math.max(0, Number(steps[i]?.distance || 0)); cumEnds.push(run) }
                            return steps.map((s, i) => (
                                <li
                                    key={i}
                                    style={{ opacity: i < (nav.currentStep || 0) ? 0.5 : 1, cursor: 'pointer' }}
                                    onClick={() => {
                                        try { apiRef.current?.snapToMin?.() } catch { }
                                        try {
                                            // s.coords is [ [lng1,lat1], [lng2,lat2] ]
                                            if (s && s.coords && Array.isArray(s.coords) && s.coords.length === 2) {
                                                const a = s.coords[0]
                                                const b = s.coords[1]
                                                const minX = Math.min(a[0], b[0])
                                                const minY = Math.min(a[1], b[1])
                                                const maxX = Math.max(a[0], b[0])
                                                const maxY = Math.max(a[1], b[1])
                                                // if MapView exposes getMap via ref, we may not have global; MapView already exposes ref to parent.
                                                // Use a custom event to request fit on RoutePlanner/MapView side for robustness.
                                                const bounds: [[number, number], [number, number]] = [[minX, minY], [maxX, maxY]]
                                                window.dispatchEvent(new CustomEvent('nav:focus-step-bounds', { detail: bounds }))
                                            }
                                            // switch level if provided
                                            const lvl = (s as any).level
                                            if (lvl != null) {
                                                const n = typeof lvl === 'string' ? parseInt(lvl, 10) : lvl
                                                if (!Number.isNaN(n)) window.dispatchEvent(new CustomEvent('ui:set-level', { detail: n }))
                                            }
                                        } catch { }
                                    }}
                                >
                                    {(() => {
                                        const manList: Array<any> = Array.isArray((route as any).maneuvers) ? (route as any).maneuvers : []
                                        // Choose the maneuver that occurs at or after the end of this step
                                        const at = cumEnds[i]
                                        let man = manList.find(m => (m.at || 0) >= at)
                                        // Fallback for floor-change step: force type
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
                    </ol>
                ) : (
                    <div>Aucune étape.</div>
                )}
            </div>
        </BottomSheetBase>
    )
}
