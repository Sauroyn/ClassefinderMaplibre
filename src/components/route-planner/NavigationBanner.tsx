import type { NavigationState } from './NavigationController'

function iconFor(type: string) {
    const style: any = { width: 24, height: 24, display: 'inline-block', marginRight: 8 }
    switch (type) {
        case 'turn-right':
            return (<span aria-hidden style={style}>↱</span>)
        case 'turn-left':
            return (<span aria-hidden style={style}>↰</span>)
        case 'turn-slight-right':
            return (<span aria-hidden style={style}>↗</span>)
        case 'turn-slight-left':
            return (<span aria-hidden style={style}>↖</span>)
        case 'uturn':
            return (<span aria-hidden style={style}>⤴</span>)
        case 'floor-up':
            return (<span aria-hidden style={style}>🧭⬆︎</span>)
        case 'floor-down':
            return (<span aria-hidden style={style}>🧭⬇︎</span>)
        default:
            return (<span aria-hidden style={style}>➡</span>)
    }
}

function formatInstruction(type: string, meters: number) {
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

export default function NavigationBanner({ nav }: { nav: NavigationState }) {
    if (!nav.active || !nav.route) return null
    const route: any = nav.route
    const maneuvers: Array<any> = Array.isArray((route as any).maneuvers) ? (route as any).maneuvers : []
    const along = Number(nav.along || 0)
    // find next maneuver strictly after current along
    const upcoming = maneuvers.find(m => (m.at || 0) > along) || maneuvers[0]
    const distanceTo = upcoming ? Math.max(0, (upcoming.at || 0) - along) : 0

    // Float banner with rounded corners and some offset from the very top to avoid overlapping floor selector
    return (
        <div className="nav-banner" style={{
            position: 'fixed', top: 10, left: 10, right: 10, zIndex: 1200,
            background: 'var(--panel-bg, #222)', color: 'var(--panel-fg, #fff)',
            padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 6px 18px rgba(0,0,0,0.22)', borderRadius: 12,
        }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {upcoming ? iconFor(upcoming.type) : null}
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Prochaine étape</div>
                    <div style={{ fontSize: 14 }}>{upcoming ? formatInstruction(upcoming.type || 'continue', distanceTo) : '—'}</div>
                </div>
            </div>
            {/* Plus de croix dans la bannière */}
        </div>
    )
}
