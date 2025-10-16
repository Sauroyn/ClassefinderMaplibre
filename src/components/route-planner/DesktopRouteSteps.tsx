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

type RouteStep = {
    distance: number
    coords: [number[], number[]]
    fromId?: string
    toId?: string
    type?: string
    direction?: string
    level?: number
}

export default function DesktopRouteSteps({
    steps,
    maneuvers,
    maxDisplay = Number.POSITIVE_INFINITY,
}: {
    steps: RouteStep[]
    maneuvers?: Array<{ at: number; type: string; idx?: number }>
    maxDisplay?: number
}) {
    if (!steps || steps.length === 0) return null

    // Calculer les distances cumulées
    const cumEnds: number[] = []
    let run = 0
    for (let i = 0; i < steps.length; i++) {
        run += Math.max(0, Number(steps[i]?.distance || 0))
        cumEnds.push(run)
    }

    const displaySteps = steps.slice(0, maxDisplay)

    return (
        <div>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Étapes</div>
            <ol
                style={{
                    listStyle: 'decimal',
                    paddingLeft: 20,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 300,
                    overflow: 'auto',
                }}
            >
                {displaySteps.map((s, i) => {
                    const manList: Array<any> = Array.isArray(maneuvers) ? maneuvers : []
                    const at = cumEnds[i]
                    let man = manList.find((m) => (m.at || 0) >= at)
                    if ((s as any).type === 'floor-change') {
                        const dir = (s as any).direction
                        const t = dir === 'up' ? 'floor-up' : 'floor-down'
                        man = { at, type: t }
                    }
                    const prevAt = i === 0 ? 0 : cumEnds[i - 1]
                    const distanceTo = Math.max(0, (man?.at || at) - prevAt)
                    const t = man?.type || 'continue'

                    return (
                        <li
                            key={i}
                            style={{
                                fontSize: 12,
                                color: 'var(--panel-fg, #333)',
                                cursor: 'pointer',
                                lineHeight: 1.4,
                            }}
                            onClick={() => {
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
                                        if (!Number.isNaN(n))
                                            window.dispatchEvent(new CustomEvent('ui:set-level', { detail: n }))
                                    }
                                } catch { }
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {iconFor(t)}
                                <span>{instructionFr(t, distanceTo)}</span>
                            </div>
                        </li>
                    )
                })}
                {/* All steps are shown; container is scrollable */}
            </ol>
        </div>
    )
}
