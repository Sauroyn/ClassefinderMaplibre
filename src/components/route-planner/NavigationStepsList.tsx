import { iconFor, instructionFr } from './navigationUtils'

export function NavigationStepsList({ steps, nav, route, apiRef }: { steps: Array<any>, nav: any, route: any, apiRef: any }) {
    if (!steps || !steps.length) return <div>Aucune étape.</div>
    // Build cumulative distances at end of each step to derive "dans Xm" text using maneuvers
    const cumEnds: number[] = []
    let run = 0
    for (let i = 0; i < steps.length; i++) { run += Math.max(0, Number(steps[i]?.distance || 0)); cumEnds.push(run) }
    return (
        <ol className="list-decimal pl-[18px] m-0 flex flex-col gap-1.5">
            {steps.map((s, i) => (
                <li
                    key={i}
                    className="cursor-pointer transition-opacity"
                    style={{ opacity: i < (nav.currentStep || 0) ? 0.5 : 1 }}
                    onClick={() => {
                        try { apiRef.current?.snapToMin?.() } catch { }
                        try {
                            if (s && s.coords && Array.isArray(s.coords) && s.coords.length === 2) {
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
                    }}
                >
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
                            <div className="flex items-center">
                                {iconFor(t)}
                                <span>{instructionFr(t, distanceTo)}</span>
                            </div>
                        )
                    })()}
                </li>
            ))}
        </ol>
    )
}
