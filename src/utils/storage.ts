/**
 * Safe localStorage utilities with error handling
 * Centralized storage key management
 */

// Storage keys (centralized from storageKeys.ts)
export const STORAGE_KEYS = {
    CONFIG_FILE: 'site_config_file',
    ICAL_URL: 'cf:ical_url',
    TRAVEL_BUFFER_MIN: 'cf:travel_buffer_min',
    EVENTS_ENABLED: 'cf:events_enabled',
    RECENT_SEARCHES_BASE: 'cf:recent_searches',
    THEME: 'user_theme',
} as const

/**
 * Safely get an item from localStorage
 * @returns Value or null if not found or error
 */
export function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

/**
 * Safely set an item in localStorage
 * @returns Success boolean
 */
export function safeSetItem(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value)
        return true
    } catch {
        return false
    }
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key: string): void {
    try {
        localStorage.removeItem(key)
    } catch {
        // Ignore errors
    }
}

/**
 * Get a config-scoped storage key for features that need per-config isolation
 * Example: recent searches should be scoped to the current site config
 */
export function getScopedKey(baseKey: string): string {
    const configFile = safeGetItem(STORAGE_KEYS.CONFIG_FILE)
    const suffix = configFile && typeof configFile === 'string' ? configFile : 'default'
    return `${baseKey}:${suffix}`
}

/**
 * Get a stored number with fallback
 */
export function getStoredNumber(key: string, fallback: number): number {
    const raw = safeGetItem(key)
    if (!raw) return fallback

    const value = Number(raw)
    return Number.isFinite(value) ? value : fallback
}

/**
 * Get a stored boolean with fallback
 */
export function getStoredBoolean(key: string, fallback: boolean): boolean {
    const raw = safeGetItem(key)
    if (raw === null) return fallback

    return raw === '1' || raw === 'true'
}

/**
 * Set a boolean value in storage
 */
export function setStoredBoolean(key: string, value: boolean): boolean {
    return safeSetItem(key, value ? '1' : '0')
}
