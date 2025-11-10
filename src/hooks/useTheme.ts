import { useEffect, useState } from 'react'
import { applyTheme, loadInitialTheme, saveTheme, type ThemeMode } from '../theme/colors'

export function useTheme() {
    const [theme, setTheme] = useState<ThemeMode>(() => loadInitialTheme())
    useEffect(() => { saveTheme(theme); applyTheme(theme) }, [theme])
    return { theme, setTheme }
}
