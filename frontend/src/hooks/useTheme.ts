import { useEffect, useState } from 'react'
import { applyTheme, loadInitialTheme, saveTheme, type ThemeMode, type ResolvedTheme } from '../theme/colors'

export function useTheme() {
    const initialMode = loadInitialTheme()
    const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode)
    const [theme, setTheme] = useState<ResolvedTheme>(() => applyTheme(initialMode))

    useEffect(() => {
        saveTheme(themeMode)
        setTheme(applyTheme(themeMode))
    }, [themeMode])

    useEffect(() => {
        if (themeMode !== 'auto') return
        let mq: MediaQueryList | null = null
        try { mq = window.matchMedia('(prefers-color-scheme: dark)') } catch { mq = null }
        if (!mq) return

        const handleChange = () => setTheme(applyTheme('auto'))
        try { mq.addEventListener('change', handleChange) } catch { mq.addListener(handleChange) }
        return () => {
            try { mq?.removeEventListener('change', handleChange) } catch { mq?.removeListener(handleChange) }
        }
    }, [themeMode])

    return { theme, themeMode, setThemeMode, setTheme: setThemeMode }
}
