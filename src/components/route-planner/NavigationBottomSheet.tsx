import type { NavigationState } from './NavigationController'
import { BottomSheetBase, formatDistance, formatEta } from './MobileSheets'

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
                        {steps.map((s, i) => (
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
                                    if ((s as any).type === 'floor-change') {
                                        const dir = (s as any).direction
                                        const toL = (s as any).toLevel
                                        if (dir === 'up') return `Monter un étage (Niveau ${toL})`
                                        if (dir === 'down') return `Descendre un étage (Niveau ${toL})`
                                    }
                                    return `Avancez ${formatDistance(Math.round(s.distance || 0))}`
                                })()}
                            </li>
                        ))}
                    </ol>
                ) : (
                    <div>Aucune étape.</div>
                )}
            </div>
        </BottomSheetBase>
    )
}
