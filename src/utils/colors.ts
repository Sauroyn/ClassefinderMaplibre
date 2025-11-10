/**
 * Color utilities for theme switching and color manipulation
 */

/**
 * Convert a hex color to a darker, desaturated version for dark mode
 * Uses HSL color space transformation
 * 
 * @param hex - Hex color string (with or without #, 3 or 6 digits)
 * @returns Darker hex color suitable for dark mode
 */
export function deriveDarkColor(hex: string): string {
    const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex || '')
    if (!m) return hex

    const h = hex.replace('#', '')
    const parse = (c: string) => c.length === 1 ? parseInt(c + c, 16) : parseInt(c, 16)

    // Parse RGB
    const r = parse(h.substring(0, h.length === 3 ? 1 : 2))
    const g = parse(h.substring(h.length === 3 ? 1 : 2, h.length === 3 ? 2 : 4))
    const b = parse(h.substring(h.length === 3 ? 2 : 4, h.length === 3 ? 3 : 6))

    // Normalize to [0, 1]
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255

    // RGB to HSL
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    let hdeg = 0
    let s = 0
    let l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
            case rn:
                hdeg = (gn - bn) / d + (gn < bn ? 6 : 0)
                break
            case gn:
                hdeg = (bn - rn) / d + 2
                break
            case bn:
                hdeg = (rn - gn) / d + 4
                break
        }
        hdeg = hdeg * 60
    }

    // Dark mode adjustment: reduce lightness and saturation
    const l2 = Math.max(0, l * 0.55)
    const s2 = Math.max(0, s * 0.85)

    // HSL to RGB
    const C = (1 - Math.abs(2 * l2 - 1)) * s2
    const X = C * (1 - Math.abs(((hdeg / 60) % 2) - 1))
    const m2 = l2 - C / 2

    let r1 = 0, g1 = 0, b1 = 0
    if (hdeg < 60) { r1 = C; g1 = X; b1 = 0 }
    else if (hdeg < 120) { r1 = X; g1 = C; b1 = 0 }
    else if (hdeg < 180) { r1 = 0; g1 = C; b1 = X }
    else if (hdeg < 240) { r1 = 0; g1 = X; b1 = C }
    else if (hdeg < 300) { r1 = X; g1 = 0; b1 = C }
    else { r1 = C; g1 = 0; b1 = X }

    const R = Math.round((r1 + m2) * 255)
    const G = Math.round((g1 + m2) * 255)
    const B = Math.round((b1 + m2) * 255)

    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHex(R)}${toHex(G)}${toHex(B)}`
}
