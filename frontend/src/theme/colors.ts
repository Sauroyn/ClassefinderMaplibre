export type ThemeMode = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'cf:theme'

export const themeVars = {
    light: {
        '--panel-bg': 'white',
        '--panel-fg': '#111',
        '--panel-border': '#ddd',
        '--muted': '#f1f3f5',
        '--chip-bg': '#f1f3f5',
        '--chip-fg': '#111',
        '--btn-bg': 'white',
        '--btn-fg': '#111',
        '--btn-border': '#ddd',
    },
    dark: {
        '--panel-bg': 'rgba(20,20,22,0.9)',
        '--panel-fg': '#f5f7fb',
        '--panel-border': '#2a2d33',
        '--muted': '#2a2d33',
        '--chip-bg': '#1f2329',
        '--chip-fg': '#d7dce3',
        '--btn-bg': '#1c1f24',
        '--btn-fg': '#f5f7fb',
        '--btn-border': '#2b2f36',
        '--route-item-bg': '#1e2127',
        '--route-item-bg-primary': '#232730',
        '--route-item-bg-hover': '#262a33',
        '--route-item-border': '#2b2f36',
        '--route-item-border-primary': '#363b44',
        '--route-item-border-hover': '#3a3f46',
        '--list-item-muted': '#9aa3af',
    },
} as const

const resolveSystemTheme = (): ResolvedTheme => {
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
    catch { return 'light' }
}

export const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
    if (mode === 'auto') return resolveSystemTheme()
    return mode
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
    if (typeof document === 'undefined') return resolveTheme(mode)

    const resolved = resolveTheme(mode)
    const root = document.documentElement
    root.setAttribute('data-theme-mode', mode)
    root.setAttribute('data-theme', resolved)

    // Add/remove 'dark' class for Tailwind
    if (resolved === 'dark') {
        root.classList.add('dark')
    } else {
        root.classList.remove('dark')
    }

    const vars = themeVars[resolved]
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
    return resolved
}

export function loadInitialTheme(): ThemeMode {
    try {
        const v = localStorage.getItem(THEME_KEY) as ThemeMode | null
        if (v === 'light' || v === 'dark' || v === 'auto') return v
    } catch { }
    return 'auto'
}

export function saveTheme(mode: ThemeMode) {
    try { localStorage.setItem(THEME_KEY, mode) } catch { }
}
