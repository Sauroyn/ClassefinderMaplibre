import { useEffect, useState } from 'react'

export function useNavigationActive(): boolean {
    const [active, setActive] = useState(false)
    useEffect(() => {
        const handler = (e: any) => { try { setActive(!!e?.detail) } catch { setActive(false) } }
        window.addEventListener('navigation:active', handler as any)
        return () => window.removeEventListener('navigation:active', handler as any)
    }, [])
    return active
}
