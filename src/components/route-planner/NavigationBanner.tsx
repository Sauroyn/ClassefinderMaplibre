import type { NavigationState } from './NavigationController'

function iconFor(type: string) {
    const className = "w-6 h-6 inline-block mr-2"
    switch (type) {
        case 'turn-right':
            return (<span aria-hidden className={className}>↱</span>)
        case 'turn-left':
            return (<span aria-hidden className={className}>↰</span>)
        case 'turn-slight-right':
            return (<span aria-hidden className={className}>↗</span>)
        case 'turn-slight-left':
            return (<span aria-hidden className={className}>↖</span>)
        case 'uturn':
            return (<span aria-hidden className={className}>⤴</span>)
        case 'floor-up':
            return (<span aria-hidden className={className}>🧭⬆︎</span>)
        case 'floor-down':
            return (<span aria-hidden className={className}>🧭⬇︎</span>)
        default:
            return (<span aria-hidden className={className}>➡</span>)
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
        <div className="nav-banner fixed top-2.5 left-2.5 right-2.5 z-[1200] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 flex items-center justify-between shadow-xl rounded-xl">
            <div className="flex items-center">
                {upcoming ? iconFor(upcoming.type) : null}
                <div>
                    <div className="font-bold text-base">Prochaine étape</div>
                    <div className="text-sm">{upcoming ? formatInstruction(upcoming.type || 'continue', distanceTo) : '—'}</div>
                </div>
            </div>
            {/* Plus de croix dans la bannière */}
        </div>
    )
}
