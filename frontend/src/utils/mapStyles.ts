/**
 * MapTiler style URLs for light and dark themes
 * 
 * Centralized configuration to avoid duplication and make updates easier.
 */

export const MAP_STYLES = {
    light: 'https://api.maptiler.com/maps/3b544fc3-420c-4a93-a594-a99b71d941bb/style.json?key=BiyHHi8FTQZ233ADqskZ',
    dark: 'https://api.maptiler.com/maps/04c03a5d-804b-4c6f-9736-b7103fdb530b/style.json?key=BiyHHi8FTQZ233ADqskZ'
} as const;

/**
 * Get the appropriate map style URL based on theme
 * @param theme - Current theme ('light' or 'dark')
 * @returns MapTiler style URL
 */
export function getMapStyleUrl(theme: 'light' | 'dark'): string {
    return theme === 'dark' ? MAP_STYLES.dark : MAP_STYLES.light;
}
