import { useEffect, useState } from 'react'

export default function SettingsButton({ onClick }: { onClick: () => void }) {
    const [bottom, setBottom] = useState<number>(12)

    useEffect(() => {
        const compute = () => {
            try {
                const ctrl = document.querySelector('.maplibregl-ctrl-bottom-right') as HTMLElement | null
                const GAP = 12
                let h = 0
                if (ctrl) {
                    const r = ctrl.getBoundingClientRect()
                    h = Math.max(0, Math.ceil(r.height))
                }
                setBottom(GAP + h)
            } catch {
                setBottom(12)
            }
        }
        const update = () => { try { requestAnimationFrame(() => compute()) } catch { compute() } }
        update()
        // observe size changes of control container
        let ro: ResizeObserver | null = null
        try {
            const ctrl = document.querySelector('.maplibregl-ctrl-bottom-right') as HTMLElement | null
            if (ctrl && 'ResizeObserver' in window) {
                ro = new ResizeObserver(() => update()); ro.observe(ctrl)
            }
        } catch { }
        window.addEventListener('resize', update)
        window.addEventListener('orientationchange', update)
        const mo = new MutationObserver(update)
        mo.observe(document.body, { childList: true, subtree: true })
        return () => {
            try { if (ro) ro.disconnect() } catch { }
            window.removeEventListener('resize', update)
            window.removeEventListener('orientationchange', update)
            try { mo.disconnect() } catch { }
        }
    }, [])

    return (
        <button
            className="settings-button"
            aria-label="Paramètres"
            title="Paramètres"
            onClick={onClick}
            style={{ position: 'fixed', right: 12, bottom, zIndex: 900, width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}
        >
            ⚙
        </button>
    )
}
