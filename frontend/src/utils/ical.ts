// Minimal iCal (ICS) parser for VEVENT fields we need
// Supports folded lines and basic DTSTART/DTEND/SUMMARY/LOCATION/UID parsing.

export type ICalEvent = {
    uid?: string
    summary?: string
    location?: string
    description?: string
    dtstart?: Date
    dtend?: Date
}

function unfoldLines(text: string): string[] {
    const lines = text.split(/\r?\n/)
    const out: string[] = []
    for (const line of lines) {
        if (!out.length) { out.push(line); continue }
        if (line.startsWith(' ') || line.startsWith('\t')) {
            // continuation of previous line (folding)
            out[out.length - 1] += line.slice(1)
        } else {
            out.push(line)
        }
    }
    return out
}

function parseDate(val: string | undefined): Date | undefined {
    if (!val) return undefined
    // Remove parameters (e.g., DTSTART;TZID=Europe/Paris:20250925T134500)
    const idx = val.indexOf(':')
    const raw = idx !== -1 ? val.slice(idx + 1) : val
    // Examples: 20250925T134500Z or 20250925T134500
    // If Z present, Date will parse as UTC; else treat as local.
    // Use manual parsing to avoid Safari issues.
    const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
    if (!m) return undefined
    const [_, Y, M, D, h, mm, s, z] = m
    const year = Number(Y), mon = Number(M) - 1, day = Number(D)
    const hh = Number(h), mi = Number(mm), ss = Number(s)
    if (z === 'Z') return new Date(Date.UTC(year, mon, day, hh, mi, ss))
    return new Date(year, mon, day, hh, mi, ss)
}

export function parseICS(text: string): ICalEvent[] {
    const lines = unfoldLines(text)
    const events: ICalEvent[] = []
    let cur: ICalEvent | null = null
    for (const ln of lines) {
        const line = ln.trim()
        if (line === 'BEGIN:VEVENT') { cur = {}; continue }
        if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue }
        if (!cur) continue
        // Split key;params:value
        const sep = line.indexOf(':')
        if (sep === -1) continue
        const keyParams = line.slice(0, sep)
        const value = line.slice(sep + 1)
        const key = keyParams.split(';')[0].toUpperCase()
        switch (key) {
            case 'SUMMARY': cur.summary = value; break
            case 'LOCATION': cur.location = value; break
            case 'DESCRIPTION': cur.description = value; break
            case 'UID': cur.uid = value; break
            case 'DTSTART': cur.dtstart = parseDate(line); break
            case 'DTEND': cur.dtend = parseDate(line); break
            default: break
        }
    }
    return events
}

export async function fetchICSEvents(url: string): Promise<ICalEvent[]> {
    // If the URL is cross-origin, route through the local dev/preview proxy to avoid CORS.
    let fetchUrl = url
    try {
        const u = new URL(url)
        const loc = window.location
        const sameOrigin = (u.protocol === loc.protocol && u.host === loc.host)
        if (!sameOrigin) {
            fetchUrl = `/api/ics?url=${encodeURIComponent(url)}`
        }
    } catch {
        // leave fetchUrl as-is if URL parsing fails
    }
    const r = await fetch(fetchUrl)
    if (!r.ok) throw new Error('ICS fetch failed: ' + r.status)
    const text = await r.text()
    return parseICS(text)
}

export function filterNextWeek(events: ICalEvent[], now = new Date()): ICalEvent[] {
    const startMs = now.getTime()
    const endMs = startMs + 7 * 24 * 3600 * 1000
    return events.filter(e => {
        const s = e.dtstart?.getTime()
        if (s == null) return false
        return s >= startMs && s <= endMs
    })
}
