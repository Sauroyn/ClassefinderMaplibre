import type { NavigationState } from './NavigationController'

export default function NavigationBanner({ nav, onExit }: { nav: NavigationState, onExit: () => void }) {
    if (!nav.active || !nav.route) return null
    // TODO: afficher l'instruction courante, ETA, distance, étage, etc.
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
            background: 'var(--panel-bg, #222)', color: 'var(--panel-fg, #fff)',
            padding: '16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 12px rgba(0,0,0,0.18)'
        }}>
            <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>Navigation</div>
                <div style={{ fontSize: 14 }}>Prochaine étape : ...</div>
            </div>
            <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>
    )
}
