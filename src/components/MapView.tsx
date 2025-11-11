import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { Sun, Moon, LocationArrow } from '@gravity-ui/icons'
import maplibre from 'maplibre-gl'
import UserGeolocate from './UserGeolocate'
import { useNavigationActive } from '../hooks/useNavigationActive'
import { addBuildingsSource, addCentroidsSource } from '../map/sources'
import { addFillLayers } from '../map/layers'
import { createFeatureLabels, FeatureLabels } from '../map/labels/FeatureLabels'
import { generateCentroids } from '../map/generateCentroids'
import { addInteractions } from '../map/interactions'
// Connector styling is now handled by combined covered/remaining layers; no direct import needed
import { fitBoundsSmart } from '../map/viewport'
import { haversine } from '../map/measure'
import { normalizeFeatureCollection } from '../utils/featureNormalization'
import { deriveDarkColor } from '../utils/colors'
import { STORAGE_KEYS } from '../utils/storage'
import { removeLayer, removeSource, getLayersWithPrefix, getSourcesWithPrefix, setFeatureState, setFilter } from '../utils/mapHelpers'
import { getFeatureBounds } from '../utils/geometryBounds'
import { getMapStyleUrl } from '../utils/mapStyles'

type Props = { data: any | null, level: number, theme?: 'light' | 'dark', onThemeChange?: (t: 'light' | 'dark') => void }

export default forwardRef(function MapView({ data, level, theme = 'light', onThemeChange }: Props, ref) {
    const container = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibre.Map | null>(null)
    const latestDataRef = useRef<any | null>(null)
    const initialized = useRef(false)
    const initialCamera = useRef<any>(null)
    const parsedConfigRef = useRef<any | null>(null)
    const navActive = useNavigationActive()
    const followNavMarkerRef = useRef<boolean>(false)
    // Gestionnaire des labels de features
    const featureLabelsRef = useRef<FeatureLabels | null>(null)
    // Hover management from Search UI
    const uiHoverIdRef = useRef<number | null>(null)
    const uiHoverIdsRef = useRef<number[] | null>(null)
    // Highlight management from Search UI (persists after hover clears)
    const uiHighlightIdRef = useRef<number | null>(null)
    // Dynamic top for nav buttons (mobile): keep below level selector to avoid overlap
    const navBtnsTopRef = useRef<number | null>(null)
    const [navBtnsTopState, setNavBtnsTopState] = useState<number | null>(null)
    // Follow mode: stop following on user interactions with the map
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        const stopFollow = () => { followNavMarkerRef.current = false }
        try {
            map.on('dragstart', stopFollow)
            map.on('zoomstart', stopFollow)
            map.on('rotate', stopFollow)
            map.on('pitch', stopFollow)
        } catch { }
        return () => {
            try {
                map.off('dragstart', stopFollow)
                map.off('zoomstart', stopFollow)
                map.off('rotate', stopFollow)
                map.off('pitch', stopFollow)
            } catch { }
        }
    }, [])
    // Compute floating nav buttons positions under the level selector on mobile
    useEffect(() => {
        const compute = () => {
            try {
                if (typeof window === 'undefined') return
                // Only compute special positioning for narrow/mobile viewports
                const isMobile = window.innerWidth <= 720
                if (!isMobile) { navBtnsTopRef.current = null; setNavBtnsTopState(null); return }
                const sel = document.querySelector('.level-selector') as HTMLElement | null
                const GAP = 8
                if (sel) {
                    const cs = window.getComputedStyle(sel)
                    const rect = sel.getBoundingClientRect()
                    const vv = (window as any).visualViewport
                    const vvOffsetTop = vv && typeof vv.offsetTop === 'number' ? vv.offsetTop : 0
                    let baseTop: number
                    if (cs.position === 'fixed') {
                        const topCss = parseFloat(cs.top || '')
                        baseTop = Number.isFinite(topCss) ? topCss + sel.offsetHeight : rect.bottom + vvOffsetTop
                    } else {
                        baseTop = rect.bottom + vvOffsetTop
                    }
                    const top = Math.ceil(baseTop + GAP)
                    navBtnsTopRef.current = top
                    setNavBtnsTopState(top)
                } else {
                    // fallback to previous static top used (~110)
                    navBtnsTopRef.current = 110
                    setNavBtnsTopState(110)
                }
            } catch {
                navBtnsTopRef.current = 110
                setNavBtnsTopState(110)
            }
        }
        const update = () => { try { requestAnimationFrame(() => compute()) } catch { compute() } }
        update()
        const ro = new ResizeObserver(() => update())
        try { const el = document.querySelector('.level-selector'); if (el) ro.observe(el as Element) } catch { }
        window.addEventListener('resize', update)
        window.addEventListener('orientationchange', update)
        try {
            const vv = (window as any).visualViewport
            if (vv && vv.addEventListener) { vv.addEventListener('resize', update); vv.addEventListener('scroll', update) }
        } catch { }
        const mo = new MutationObserver(update)
        mo.observe(document.body, { childList: true, subtree: true })
        return () => {
            try { ro.disconnect() } catch { }
            window.removeEventListener('resize', update)
            window.removeEventListener('orientationchange', update)
            try { const vv = (window as any).visualViewport; if (vv && vv.removeEventListener) { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) } } catch { }
            try { mo.disconnect() } catch { }
        }
    }, [])
    // Follow mode: when enabled, smoothly recenter on marker updates and orient camera forward in 3D
    useEffect(() => {
        const onMarker = (e: any) => {
            if (!followNavMarkerRef.current) return
            try {
                const center = e?.detail?.center as [number, number]
                const lvl = e?.detail?.level as number | null
                const heading = e?.detail?.heading as number | null | undefined
                if (!center) return
                if (lvl != null) { try { window.dispatchEvent(new CustomEvent('ui:set-level', { detail: lvl })) } catch { } }
                const m: any = mapRef.current
                if (m) {
                    // Smooth follow: ease duration proportional to distance, clamped
                    const curr = m.getCenter ? m.getCenter() : null
                    const currLL: [number, number] | null = curr ? [curr.lng, curr.lat] : null
                    const dist = currLL ? haversine(currLL, center) : 0
                    const duration = Math.max(150, Math.min(500, dist * 8))
                    const easeOut = (t: number) => 1 - Math.pow(1 - t, 2)
                    // Target 3D forward looking camera when following
                    const targetPitch = Math.max(45, Math.min(65, m.getPitch ? m.getPitch() : 60))
                    const targetBearing = (typeof heading === 'number' && isFinite(heading)) ? heading : (m.getBearing ? m.getBearing() : 0)
                    try {
                        m.easeTo?.({ center: { lng: center[0], lat: center[1] }, bearing: targetBearing, pitch: targetPitch, duration, easing: easeOut })
                    } catch {
                        // Fallback without easing extras
                        try { m.setBearing?.(targetBearing) } catch { }
                        try { m.setPitch?.(targetPitch) } catch { }
                        m.jumpTo?.({ center: { lng: center[0], lat: center[1] } })
                    }
                }
            } catch { }
        }
        window.addEventListener('nav:marker-center', onMarker as any)
        const onFinish = () => { followNavMarkerRef.current = false }
        window.addEventListener('navigation:finish', onFinish as any)
        return () => {
            window.removeEventListener('nav:marker-center', onMarker as any)
            window.removeEventListener('navigation:finish', onFinish as any)
        }
    }, [])
    useEffect(() => {
        if (!container.current) return

        (async () => {
            // defaults (Paris)
            let center: [number, number] = [2.3522, 48.8566]
            let zoom = 12
            try {
                const sel = (typeof window !== 'undefined') ? (localStorage.getItem(STORAGE_KEYS.CONFIG_FILE) || null) : null
                if (sel) {
                    try {
                        const base = (import.meta.env && (import.meta.env.BASE_URL || '/'))
                        const r = await fetch(base + 'configs/' + sel)
                        if (r.ok) {
                            const parsed = await r.json()
                            if (Array.isArray(parsed.initialCenter) && parsed.initialCenter.length === 2) center = [parsed.initialCenter[0], parsed.initialCenter[1]]
                            if (typeof parsed.initialZoom === 'number') zoom = parsed.initialZoom
                            parsedConfigRef.current = {
                                fillColor: parsed.fillColor || parsed.color || undefined,
                                fillHeight: (typeof parsed.fillHeight === 'number') ? parsed.fillHeight : undefined,
                                transitionZoom: (typeof parsed.transitionZoom === 'number') ? parsed.transitionZoom : undefined
                            }
                        }
                    } catch (e) { /* ignore fetch/parse errors */ }
                }
            } catch (e) { /* ignore localStorage errors */ }

            const map = new maplibre.Map({
                container: container.current!,
                style: getMapStyleUrl(theme),
                center,
                zoom
            })
            mapRef.current = map
                // Exposer la map globalement pour le debug
                ; (window as any).__debugMap = map

            // Attach follow-stop handlers on user interactions (not programmatic easeTo)
            const attachFollowStopHandlers = () => {
                const stopFollow = (e?: any) => {
                    try {
                        // Only stop on user-initiated interactions
                        if (e && !e.originalEvent) return
                    } catch { }
                    followNavMarkerRef.current = false
                }
                try {
                    map.on('movestart', stopFollow)
                    map.on('dragstart', stopFollow)
                    map.on('zoomstart', stopFollow)
                    map.on('rotatestart', stopFollow)
                    map.on('pitchstart', stopFollow)
                } catch { }
                // Save a cleanup to remove the same handlers if needed later
                ; (map as any).__removeFollowHandlers = () => {
                    try {
                        map.off('movestart', stopFollow)
                        map.off('dragstart', stopFollow)
                        map.off('zoomstart', stopFollow)
                        map.off('rotatestart', stopFollow)
                        map.off('pitchstart', stopFollow)
                    } catch { }
                }
            }

            const saveInit = () => { const c = map.getCenter(); initialCamera.current = { center: [c.lng, c.lat], zoom: map.getZoom() } }

            // Attach UI hover handlers after map exists so feature-state can be set reliably
            const attachSearchHoverHandlers = () => {
                const setHover = (id: number | null) => {
                    try {
                        if (uiHoverIdRef.current != null) {
                            setFeatureState(map, 'buildings', uiHoverIdRef.current, { hover: false })
                        }
                        // clear any previous multi-hover
                        if (uiHoverIdsRef.current && uiHoverIdsRef.current.length) {
                            for (const pid of uiHoverIdsRef.current) {
                                setFeatureState(map, 'buildings', pid, { hover: false })
                            }
                            uiHoverIdsRef.current = null
                        }
                        if (id != null) {
                            setFeatureState(map, 'buildings', id, { hover: true })
                        }
                        uiHoverIdRef.current = id
                    } catch { }
                }
                const setHoverMany = (ids: number[] | null) => {
                    try {
                        // clear previous single
                        if (uiHoverIdRef.current != null) {
                            setFeatureState(map, 'buildings', uiHoverIdRef.current, { hover: false })
                            uiHoverIdRef.current = null
                        }
                        // clear previous many
                        if (uiHoverIdsRef.current && uiHoverIdsRef.current.length) {
                            for (const pid of uiHoverIdsRef.current) {
                                setFeatureState(map, 'buildings', pid, { hover: false })
                            }
                        }
                        uiHoverIdsRef.current = null
                        if (ids && ids.length) {
                            const out: number[] = []
                            for (const raw of ids) {
                                const n = parseInt(String(raw), 10)
                                const id = Number.isFinite(n) ? n : (typeof raw === 'number' ? raw : null)
                                if (id != null) {
                                    setFeatureState(map, 'buildings', id, { hover: true })
                                    out.push(id as number)
                                }
                            }
                            uiHoverIdsRef.current = out
                        }
                    } catch { }
                }
                const onHover = (e: any) => {
                    try {
                        const raw = e?.detail
                        const n = parseInt(String(raw), 10)
                        const id = Number.isFinite(n) ? n : (typeof raw === 'number' ? raw : null)
                        if (id == null) { setHover(null); return }
                        setHover(id)
                    } catch { }
                }
                const onHoverMany = (e: any) => {
                    try {
                        const arr = Array.isArray(e?.detail) ? e.detail : []
                        setHoverMany(arr)
                    } catch { }
                }
                const onClear = () => setHover(null)
                // Highlight handlers: set/clear persistent highlight independent of hover
                const onHighlight = (e: any) => {
                    try {
                        const map = mapRef.current
                        if (!map) return
                        // Clear previous highlight
                        if (uiHighlightIdRef.current != null) {
                            setFeatureState(map, 'buildings', uiHighlightIdRef.current, { highlight: false })
                        }
                        // Set new highlight
                        const raw = e?.detail
                        const n = parseInt(String(raw), 10)
                        const id = Number.isFinite(n) ? n : (typeof raw === 'number' ? raw : null)
                        if (id != null) {
                            setFeatureState(map, 'buildings', id, { highlight: true })
                            uiHighlightIdRef.current = id as number
                        } else {
                            uiHighlightIdRef.current = null
                        }
                    } catch { }
                }
                const onClearHighlight = () => {
                    try {
                        const map = mapRef.current
                        if (!map) return
                        if (uiHighlightIdRef.current != null) {
                            setFeatureState(map, 'buildings', uiHighlightIdRef.current, { highlight: false })
                            uiHighlightIdRef.current = null
                        }
                    } catch { }
                }
                window.addEventListener('map:hover-feature', onHover as any)
                window.addEventListener('map:hover-features', onHoverMany as any)
                window.addEventListener('map:hover-clear', onClear as any)
                window.addEventListener('map:highlight-feature', onHighlight as any)
                window.addEventListener('map:highlight-clear', onClearHighlight as any)
                    ; (map as any).__removeSearchHoverHandlers = () => {
                        try { window.removeEventListener('map:hover-feature', onHover as any) } catch { }
                        try { window.removeEventListener('map:hover-features', onHoverMany as any) } catch { }
                        try { window.removeEventListener('map:hover-clear', onClear as any) } catch { }
                        try { window.removeEventListener('map:highlight-feature', onHighlight as any) } catch { }
                        try { window.removeEventListener('map:highlight-clear', onClearHighlight as any) } catch { }
                    }
            }

            const loadRouteIcons = async () => {
                const tryLoad = (url: string, name: string) => new Promise<boolean>(async (resolve) => {
                    try {
                        const img = new Image()
                        img.crossOrigin = 'anonymous'
                        img.src = url
                        try {
                            if ((img as any).decode) await (img as any).decode()
                        } catch (e) {
                            // decode failed
                            resolve(false)
                            return
                        }
                        try {
                            if (!(map as any).hasImage || !(map as any).hasImage(name)) (map as any).addImage(name, img as any)
                            resolve(true)
                        } catch (e) {
                            resolve(false)
                        }
                    } catch (e) {
                        resolve(false)
                    }
                })

                const rawStartCandidates = ['/start-icon.svg', '/marker-start.svg', '/start.svg', '/marker-start-icon.svg', '/icons/marker-start.svg']
                const rawEndCandidates = ['/end-icon.svg', '/marker-end.svg', '/end.svg', '/marker-end-icon.svg', '/icons/marker-end.svg']
                const prefix = (import.meta.env && (import.meta.env.BASE_URL || '/'))
                const startCandidates = rawStartCandidates.map(u => u.startsWith('/') ? (prefix + u.slice(1)) : u)
                const endCandidates = rawEndCandidates.map(u => u.startsWith('/') ? (prefix + u.slice(1)) : u)

                let ok = false
                for (const c of startCandidates) {
                    if (await tryLoad(c, 'marker-start')) { ok = true; break }
                }
                if (!ok) console.warn('[MapView] no start marker icon found in public/ (tried common names)')

                ok = false
                for (const c of endCandidates) {
                    if (await tryLoad(c, 'marker-end')) { ok = true; break }
                }
                if (!ok) console.warn('[MapView] no end marker icon found in public/ (tried common names)')

                const ensureImage = (name: string, color: string) => {
                    try {
                        if ((map as any).hasImage && (map as any).hasImage(name)) return
                    } catch (e) { }
                    try {
                        const size = 48
                        const canvas = document.createElement('canvas')
                        canvas.width = size; canvas.height = size
                        const ctx = canvas.getContext('2d')!
                        ctx.clearRect(0, 0, size, size)
                        ctx.beginPath()
                        ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2)
                        ctx.fillStyle = color
                        ctx.fill()
                        ctx.beginPath()
                        ctx.arc(size / 2, size / 2, size * 0.12, 0, Math.PI * 2)
                        ctx.fillStyle = '#ffffff'
                        ctx.fill()
                        const img = ctx.getImageData(0, 0, size, size)
                        if ((map as any).addImage) (map as any).addImage(name, img)
                    } catch (e) { }
                }
                ensureImage('marker-start', '#2ecc71')
                ensureImage('marker-end', '#e74c3c')
            }

            if (map.loaded()) { saveInit(); loadRouteIcons(); attachFollowStopHandlers(); attachSearchHoverHandlers() } else map.on('load', () => { saveInit(); loadRouteIcons(); attachFollowStopHandlers(); attachSearchHoverHandlers() })
            return () => {
                try { const fn = (map as any).__removeFollowHandlers; if (fn) fn() } catch { }
                try { const fn2 = (map as any).__removeSearchHoverHandlers; if (fn2) fn2() } catch { }
                map.remove(); mapRef.current = null
            }
        })()
    }, [])

    // initialize sources/layers when data becomes available
    useEffect(() => {
        const map = mapRef.current
        latestDataRef.current = data
        if (!map || !data || initialized.current) return
        const init = () => {
            try {
                // Normalize incoming data: ensure numeric level and stable ids; then derive dark color if needed
                let themedData = data
                try {
                    if (data && data.type === 'FeatureCollection') {
                        // Use centralized normalization utility
                        themedData = normalizeFeatureCollection(data, theme === 'dark')
                    }
                } catch { }
                addBuildingsSource(map, themedData)
                // derive cfg color for dark if needed
                const cfg0 = parsedConfigRef.current || undefined
                const cfg = (() => {
                    if (!cfg0) return cfg0
                    if (!cfg0.fillColor || theme !== 'dark') return cfg0
                    // Use centralized color utility
                    return { ...cfg0, fillColor: deriveDarkColor(cfg0.fillColor) }
                })()
                addFillLayers(map, level, cfg, theme)
                const centroids = generateCentroids(themedData)
                addCentroidsSource(map, centroids)
                // Initialiser le gestionnaire de labels
                featureLabelsRef.current = createFeatureLabels(map)
                featureLabelsRef.current.update(level, theme)
                addInteractions(map, { hovered: null, selected: null, selectedPrev: null })
                initialized.current = true
            } catch (e) { console.warn('init map sources failed', e) }
        }
        if (map.loaded()) init()
        else map.on('load', init)
    }, [data, level])
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        try { (map as any).__currentLevel = level } catch (e) { }
        const filter: any = [
            'any',
            ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
            ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
        ]
        try {
            if (map.getLayer('buildings-extrusion')) map.setFilter('buildings-extrusion', filter as any)
            if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filter as any)
            // Mettre à jour les labels avec le nouveau niveau
            if (featureLabelsRef.current) {
                featureLabelsRef.current.update(level, theme)
            }
            // apply filter to any route-planner layers (IDs like "route-planner-0-line")
            const applyRouteFilterToAll = () => {
                try {
                    const style = map.getStyle && map.getStyle()
                    const layers = (style && style.layers) || []
                    const routeFilter = [
                        'any',
                        ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                        ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]],
                        ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
                    ]
                    for (const lyr of layers) {
                        if (lyr && typeof lyr.id === 'string' && lyr.id.startsWith('route-planner-')) {
                            setFilter(map, lyr.id, routeFilter as any)
                        }
                    }
                } catch (e) { }
            }
            applyRouteFilterToAll()
            // show/hide DOM markers for start/end based on current level
            try {
                const m = (map as any).__routePlannerMarkers
                if (m) {
                    const applyVisibility = (marker: any, itemLevel: any, itemLevels: any) => {
                        try {
                            if (!marker || !marker.getElement) return
                            const el = marker.getElement()
                            // fallback to dataset on element if meta not provided
                            let lvl = itemLevel
                            let lvls = itemLevels
                            try {
                                if ((lvl === null || lvl === undefined) && el.dataset && el.dataset.level) lvl = Number(el.dataset.level)
                                if ((!lvls || !Array.isArray(lvls)) && el.dataset && el.dataset.levels) lvls = String(el.dataset.levels).split(',').map(v => { const n = Number(v); return Number.isNaN(n) ? v : n })
                            } catch (e) { }
                            if (lvl !== null && lvl !== undefined) {
                                el.style.display = (lvl === level) ? 'block' : 'none'
                            } else if (lvls && Array.isArray(lvls)) {
                                el.style.display = (lvls.indexOf(level) !== -1) ? 'block' : 'none'
                            } else {
                                // if no level info, show by default
                                el.style.display = 'block'
                            }
                        } catch (e) { }
                    }
                    try { applyVisibility(m.start, (m.startLevel ?? null), m.startLevels) } catch (e) { }
                    try { applyVisibility(m.end, (m.endLevel ?? null), m.endLevels) } catch (e) { }
                }
            } catch (e) { }
            // ensure that if the route layer/source is added later (by compute), we re-apply the filter
            const onData = () => { applyRouteFilterToAll() }
            map.on('sourcedata', onData)
            // also update nav marker visibility when level changes
            try {
                const syncMarkerVis = () => {
                    try {
                        const el = (map as any).__navMarkerEl as HTMLElement | null
                        const mkLvl = (map as any).__navMarkerLevel as number | null
                        if (el) {
                            if (mkLvl == null) el.style.display = 'block'
                            else el.style.display = (mkLvl === (map as any).__currentLevel) ? 'block' : 'none'
                        }
                    } catch { }
                }
                syncMarkerVis()
                const handler = syncMarkerVis as any
                window.addEventListener('ui:set-level', handler)
                    // attach cleanup to remove the same handler
                    ; (map as any).__removeLevelSyncHandler = () => {
                        try { window.removeEventListener('ui:set-level', handler) } catch { }
                    }
            } catch { }
            // remove listener on cleanup
            return () => {
                try { map.off('sourcedata', onData) } catch (e) { }
                try { const fn = (map as any).__removeLevelSyncHandler; if (fn) fn() } catch { }
            }
        } catch (e) { }
    }, [level])

    // Écouter les changements d'alias et régénérer les centroides
    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        const onAliasesUpdated = () => {
            console.log('[MapView] Alias mis à jour, régénération des centroides...')
            try {
                if (!data) return

                // Régénérer les centroides avec les nouveaux alias
                let themedData = data
                try {
                    if (theme === 'dark') {
                        themedData = normalizeFeatureCollection(data, true)
                    }
                } catch { }

                const centroids = generateCentroids(themedData)

                // Mettre à jour la source des centroides
                const source = map.getSource('buildings-centroids') as any
                if (source && source.setData) {
                    source.setData(centroids)
                    console.log('[MapView] Centroides mis à jour avec succès')

                    // Mettre à jour les labels aussi
                    if (featureLabelsRef.current) {
                        featureLabelsRef.current.update(level, theme)
                    }
                }
            } catch (error) {
                console.error('[MapView] Erreur lors de la mise à jour des centroides:', error)
            }
        }

        window.addEventListener('aliases:updated', onAliasesUpdated as any)
        return () => {
            window.removeEventListener('aliases:updated', onAliasesUpdated as any)
        }
    }, [data, level, theme])

    useImperativeHandle(ref, () => ({
        getMap: () => mapRef.current,
        selectFeatureById: (id: number | string) => {
            const map = mapRef.current
            if (!map) return
            try {
                if (!map.getSource || !map.getSource('buildings')) return
            } catch (e) { return }
            const features = map.querySourceFeatures('buildings', { sourceLayer: undefined, filter: ['==', ['id'], id] })
            const feat = features && features[0]
            if (feat && feat.geometry) {
                const bbox = getFeatureBounds(feat)
                if (bbox) { fitBoundsSmart(map, bbox); return }
                // fallback manual (should rarely hit)
                if (feat.geometry.type === 'Polygon') {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    const coords = (feat.geometry as any).coordinates[0]
                    for (const c of coords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                    if (isFinite(minX)) { fitBoundsSmart(map, [[minX, minY], [maxX, maxY]]); return }
                } else if (feat.geometry.type === 'MultiPolygon') {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    for (const poly of (feat.geometry as any).coordinates) {
                        const ring = poly[0]
                        for (const p of ring) { const x = p[0], y = p[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                    }
                    if (isFinite(minX)) { fitBoundsSmart(map, [[minX, minY], [maxX, maxY]]); return }
                }
            }
            // if feature wasn't found in the source, try to find it in latestDataRef (search results when data not yet added)
            try {
                const d = latestDataRef.current
                if (d && d.features && d.features.length) {
                    const found = d.features.find((f: any) => (f.id ?? f.properties?.id ?? f.properties?.name) === id || (f.properties && f.properties.name) === id)
                    if (found && found.geometry) {
                        const bbox = getFeatureBounds(found)
                        if (bbox) { fitBoundsSmart(map, bbox); return }
                    }
                }
            } catch (e) { }
            // else: do nothing (avoid unnecessary zooming)
            // ensure feature-state selection is applied
            try {
                const all = map.querySourceFeatures('buildings') || []
                for (const f of all) setFeatureState(map, 'buildings', f.id as number, { selected: false, hover: false })
                setFeatureState(map, 'buildings', id, { selected: true })
            } catch (e) { }
        }
        ,
        getCamera: () => {
            const map = mapRef.current
            if (!map) return null
            const c = map.getCenter()
            return { center: [c.lng, c.lat] as [number, number], zoom: map.getZoom() }
        },
        restoreCamera: (cam: any) => {
            const map = mapRef.current
            if (!map || !cam) return
            if (Array.isArray(cam.center) && cam.center.length === 2) map.flyTo({ center: cam.center as [number, number], zoom: cam.zoom })
        },
        restoreInitialCamera: () => {
            const map = mapRef.current
            if (!map || !initialCamera.current) return
            map.flyTo({ center: initialCamera.current.center as [number, number], zoom: initialCamera.current.zoom })
        },
        clearSelection: () => {
            const map = mapRef.current
            if (!map) return
            // try to unset any selected feature state by querying source features
            try {
                const features = map.querySourceFeatures('buildings')
                for (const f of features) setFeatureState(map, 'buildings', f.id as number, { selected: false, hover: false })
            } catch (e) { }
        }
        ,
        clearRoute: () => {
            const map = mapRef.current
            if (!map) return
            try {
                // Remove layers with 'route-planner-' prefix using helper
                const layers = getLayersWithPrefix(map, 'route-planner-')
                for (const layerId of layers) {
                    removeLayer(map, layerId)
                }

                // Remove sources with 'route-planner-' prefix using helper
                const sources = getSourcesWithPrefix(map, 'route-planner-')
                for (const sourceId of sources) {
                    removeSource(map, sourceId)
                }

                // also remove start/end symbol and circle layers/sources if present
                removeLayer(map, 'route-planner-start-symbol')
                removeLayer(map, 'route-planner-start-circle')
                removeLayer(map, 'route-planner-end-symbol')
                removeLayer(map, 'route-planner-end-circle')
                // remove user connector
                removeLayer(map, 'route-planner-user-connector-line')
                removeSource(map, 'route-planner-user-connector')
                removeSource(map, 'route-planner-start')
                removeSource(map, 'route-planner-end')
                // also remove any DOM markers created by route planner
                try {
                    const m = (map as any).__routePlannerMarkers
                    if (m) {
                        try { if (m.start && m.start.remove) m.start.remove() } catch (e) { }
                        try { if (m.end && m.end.remove) m.end.remove() } catch (e) { }
                        try { delete (map as any).__routePlannerMarkers } catch (e) { }
                    }
                } catch (e) { }
            } catch (e) { }
        }
    }))

    // Respond to theme changes: swap style and restore custom layers/sources (buildings, names, routes)
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        try {
            // prevent concurrent swaps
            const swappingKey = '__swappingStyle'
            if ((map as any)[swappingKey]) return
                ; (map as any)[swappingKey] = true

            const target = getMapStyleUrl(theme)
            // Always setStyle; preserve camera
            const cam = { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }
            // Snapshot current route sources' data so we can restore them after the style reload
            const savedRouteSources: Array<{ id: string, data: any }> = []
            try {
                const style = map.getStyle && map.getStyle()
                const sources = (style && style.sources) || {}
                for (const sid of Object.keys(sources)) {
                    if (sid.startsWith('route-planner-')) {
                        try {
                            const src: any = (map.getSource && map.getSource(sid)) || null
                            if (src && src._data) savedRouteSources.push({ id: sid, data: src._data })
                        } catch { }
                    }
                }
            } catch { }
            try { (map as any).stop?.() } catch { }
            ; (map as any).setStyle(target, { diff: false })
            console.log('[MapView] setStyle appelé, en attente de style.load')
            map.once('style.load', () => {
                console.log('[MapView] style.load déclenché')
                try {
                    // re-add our custom sources/layers if needed
                    const d = latestDataRef.current || data
                    if (!d) return
                    // We'll keep a normalized/themed copy to reuse for centroids
                    let themedDataForAll: any = d
                    // add sources if missing
                    if (!map.getSource('buildings')) {
                        // Use centralized normalization utility
                        themedDataForAll = normalizeFeatureCollection(d, theme === 'dark')
                        addBuildingsSource(map, themedDataForAll)
                    }
                    // layers (derive cfg for dark)
                    const cfg0b = parsedConfigRef.current || undefined
                    const cfgb = (() => {
                        if (!cfg0b) return cfg0b
                        if (!cfg0b.fillColor || theme !== 'dark') return cfg0b
                        // Use centralized color utility
                        return { ...cfg0b, fillColor: deriveDarkColor(cfg0b.fillColor) }
                    })()
                    addFillLayers(map, (map as any).__currentLevel ?? level, cfgb, theme)
                    // Generate centroids from the normalized/themed data to ensure coerced numeric levels
                    const centroids = generateCentroids(themedDataForAll)
                    if (import.meta && (import.meta as any).env && (import.meta as any).env.DEV) {
                        console.log('[MapView] Centroïdes générés:', centroids.features.length, 'features')
                        if (centroids.features.length > 0) {
                            console.log('[MapView] Premier centroïde:', centroids.features[0])
                            console.log('[MapView] Propriétés du premier centroïde:', centroids.features[0].properties)
                            console.log('[MapView] Propriété name:', centroids.features[0].properties?.name)
                        }
                    }
                    // Toujours recréer la source centroids après un swap de style (force=true)
                    addCentroidsSource(map, centroids, true)

                    // Recréer les labels après le swap de style
                    // IMPORTANT: Ne PAS utiliser requestAnimationFrame car il peut être appelé plusieurs fois
                    if (!featureLabelsRef.current) {
                        featureLabelsRef.current = createFeatureLabels(map)
                    }
                    console.log('[MapView] Recréation des labels après swap de style')
                    featureLabelsRef.current.update((map as any).__currentLevel ?? level, theme)

                    addInteractions(map, { hovered: null, selected: null, selectedPrev: null })
                    // Restore previously drawn route layers/sources (lost during style swap)
                    try {
                        const levelNow = (map as any).__currentLevel ?? level
                        const routeFilter: any = [
                            'any',
                            ['all', ['has', 'level'], ['==', ['get', 'level'], levelNow]],
                            ['all', ['has', 'levels'], ['in', levelNow, ['get', 'levels']]],
                            ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
                        ]
                        for (const saved of savedRouteSources) {
                            try {
                                if (!map.getSource(saved.id)) {
                                    const srcOpts: any = { type: 'geojson', data: saved.data }
                                    if (saved.id === 'route-planner-0' || saved.id === 'route-planner-user-connector') srcOpts.lineMetrics = true
                                    map.addSource(saved.id, srcOpts)
                                }
                            } catch { }
                            const layerId = `${saved.id}-line`
                            // Skip adding layers for connector and primary route; those are handled by draw.ts (covered/remaining)
                            if (saved.id === 'route-planner-user-connector' || saved.id === 'route-planner-0') {
                                continue
                            }
                            // For alternative routes, add simple solid styling
                            let idx = -1
                            try { const m = /route-planner-(\d+)/.exec(saved.id); if (m) idx = parseInt(m[1], 10) } catch { idx = -1 }
                            const color = idx === 1 ? '#999999' : '#cccccc'
                            const width = 12
                            const opacity = 0.6
                            const paint: any = { 'line-color': color, 'line-width': width, 'line-opacity': opacity }
                            try {
                                if (!map.getLayer(layerId)) {
                                    map.addLayer({ id: layerId, type: 'line', source: saved.id, paint, layout: { 'line-cap': 'round', 'line-join': 'round' } })
                                }
                            } catch { }
                            setFilter(map, layerId, routeFilter)
                        }
                        // Primary route is now split into covered/remaining; ordering handled when drawing
                    } catch { }
                } catch (e) { }
                // restore camera
                try { map.jumpTo(cam as any) } catch { }
                try { (map as any)[swappingKey] = false } catch { }
            })
        } catch { }
    }, [theme])

    // Action to recenter on nav marker with 3D camera and follow
    const recenterToNavMarker = () => {
        try {
            const map: any = mapRef.current
            if (!map) return
            const lvl: number | null | undefined = map.__navMarkerLevel
            const center: [number, number] | undefined = map.__navMarkerCenter
            const heading: number | null | undefined = map.__navMarkerHeading
            if (lvl != null) {
                try { window.dispatchEvent(new CustomEvent('ui:set-level', { detail: lvl })) } catch { }
            }
            // enable follow mode so subsequent marker updates keep camera aligned
            followNavMarkerRef.current = true
            if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
                const pitch = Math.max(45, Math.min(65, map.getPitch ? map.getPitch() : 60))
                const bearing = (typeof heading === 'number' && isFinite(heading)) ? heading : (map.getBearing ? map.getBearing() : 0)
                try { map.flyTo?.({ center: { lng: center[0], lat: center[1] }, zoom: Math.max(16, map.getZoom ? map.getZoom() : 16), bearing, pitch, speed: 0.8, curve: 1.4 }) } catch { }
            }
        } catch { }
    }

    const themeToggle = (
        <button
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            onClick={() => onThemeChange && onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="fixed right-2.5 z-selector w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md flex items-center justify-center text-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            style={{ top: navBtnsTopState ?? 110 }}
        >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    )
    const recenterToMarker = (
        <button
            title={'Recentrer sur le marqueur'}
            aria-label={'Recentrer sur le marqueur'}
            onClick={recenterToNavMarker}
            className="fixed right-2.5 z-selector w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md flex items-center justify-center text-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            style={{ top: (navBtnsTopState ?? 110) + 50 }}
        >
            <LocationArrow className="w-5 h-5" />
        </button>
    )

    // When navigation starts, auto-trigger the same recenter + 3D orientation as the button
    useEffect(() => {
        if (navActive) {
            // small delay to allow nav marker metadata to initialize
            const t = setTimeout(() => recenterToNavMarker(), 50)
            return () => clearTimeout(t)
        }
    }, [navActive])
    return <>
        <div id="map" ref={container} className="h-screen" onClick={(e) => {
            // Also relay click as custom event with lngLat if possible (dev aid)
            try {
                const map = mapRef.current
                if (map) {
                    const m = map as any
                    const rect = (m.getContainer && m.getContainer()) ? m.getContainer().getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const x = (e as any).clientX - rect.left
                    const y = (e as any).clientY - rect.top
                    if (m.unproject) {
                        const ll = m.unproject([x, y])
                        window.dispatchEvent(new CustomEvent('map:click', { detail: { lngLat: { lng: ll.lng, lat: ll.lat } } }))
                    }
                }
            } catch { }
        }} />
        {/* Follow mode handled via top-level effects */}
        {navActive ? (
            <>
                {themeToggle}
                {recenterToMarker}
            </>
        ) : (
            <UserGeolocate map={mapRef.current} theme={theme} onToggleTheme={() => onThemeChange && onThemeChange(theme === 'dark' ? 'light' : 'dark')} />
        )}
    </>
})
