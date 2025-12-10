export function iconFor(type: string) {
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

export function instructionFr(type: string, meters: number) {
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
