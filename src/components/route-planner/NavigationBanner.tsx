import type { NavigationState } from './NavigationController'

export default function NavigationBanner({ nav }: { nav: NavigationState }) {
    if (!nav.active || !nav.route) return null
    const route: any = nav.route
    const steps: Array<any> = Array.isArray(route.steps) ? route.steps : []
    const next = (() => {
        const i = Math.max(0, Math.min(nav.currentStep || 0, steps.length - 1))
        return steps[i] || null
    })()

    // Float banner with rounded corners and some offset from the very top to avoid overlapping floor selector
    return (
        <div className="nav-banner" style={{
            position: 'fixed', top: 10, left: 10, right: 10, zIndex: 1200,
            background: 'var(--panel-bg, #222)', color: 'var(--panel-fg, #fff)',
            padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 6px 18px rgba(0,0,0,0.22)', borderRadius: 12,
        }}>
            <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Prochaine étape</div>
                <div style={{ fontSize: 14 }}>{next ? `Avancez ${Math.round(next.distance || 0)} m` : '—'}</div>
            </div>
            {/* Plus de croix dans la bannière */}
        </div>
    )
}
