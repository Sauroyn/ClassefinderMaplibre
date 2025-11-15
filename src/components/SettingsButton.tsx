import { useEffect, useState } from 'react'
import { Gear } from '@gravity-ui/icons'

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
            className="fixed right-3 z-[900] w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
            aria-label="Paramètres"
            title="Paramètres"
            onClick={onClick}
            style={{ bottom }}
        >
            <Gear className="w-5 h-5" />
        </button>
    )
}
