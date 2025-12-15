import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView'
import LevelSelector from './components/LevelSelector'
import SearchBar from './components/SearchBar'
import RoutePlanner from './components/RoutePlanner'
import SettingsButton from './components/SettingsButton'
import EventBar from './components/events/EventBar'
import MobileControlsBar from './components/MobileControlsBar'
import LocationLockMessage from './components/LocationLockMessage'
import { loadGraphFromConfigOrFallback } from './utils/graph'
import SettingsModal from './components/settings/SettingsModal.tsx'
import { useConfigData, type BuildingFiltersState, type BuildingFilterSettings, type BuildingMeta, createDefaultFilterFromMeta } from './hooks/useConfigData'
import { useTheme } from './hooks/useTheme'
import { useSettingsDraft } from './hooks/useSettingsDraft'
import { useLocationLock } from './hooks/useLocationLock'
import { useSharedUserPosition } from './hooks/useSharedUserPosition'
import { ICAL_URL_KEY, TRAVEL_BUFFER_MIN_KEY, EVENTS_ENABLED_KEY } from './utils/storageKeys'
import { STORAGE_KEYS } from './utils/storage'

function loadStoredBuildingFilters(): BuildingFiltersState {
  if (typeof window === 'undefined') return {}
  try {
    const configId = localStorage.getItem(STORAGE_KEYS.CONFIG_FILE) || 'default'
    const raw = localStorage.getItem(`${STORAGE_KEYS.BUILDING_FILTERS}:${configId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeArray(values: string[], sortLocale: string = 'fr'): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, sortLocale, { numeric: true }))
}

function filtersAreEqual(a?: BuildingFilterSettings, b?: BuildingFilterSettings) {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.visible !== b.visible) return false
  const aLevels = a.levels
  const bLevels = b.levels
  if (aLevels === 'all' || bLevels === 'all') {
    if (aLevels !== bLevels) return false
  } else {
    if (aLevels.length !== bLevels.length) return false
    for (let i = 0; i < aLevels.length; i++) {
      if (aLevels[i] !== bLevels[i]) return false
    }
  }
  if (a.tags.length !== b.tags.length) return false
  for (let i = 0; i < a.tags.length; i++) {
    if (a.tags[i] !== b.tags[i]) return false
  }
  return true
}

function sanitizeFilterForMeta(filter: BuildingFilterSettings, meta?: BuildingMeta): BuildingFilterSettings {
  const visible = !!filter.visible

  let levels: BuildingFilterSettings['levels']
  if (filter.levels === 'all' || !meta || meta.availableLevels.length === 0) {
    levels = 'all'
  } else {
    const allowed = new Set(meta.availableLevels)
    const deduped = normalizeArray(filter.levels.filter(level => allowed.has(level)))
    levels = deduped.length === meta.availableLevels.length ? 'all' : deduped
  }

  let tags: string[] = []
  if (!meta || meta.availableTags.length === 0) {
    tags = normalizeArray(filter.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean))
  } else {
    const allowedTags = new Set(meta.availableTags.map(tag => tag.toLowerCase()))
    tags = normalizeArray(
      filter.tags
        .map(tag => String(tag).toLowerCase().trim())
        .filter(tag => tag && allowedTags.has(tag))
    )
  }

  return { visible, levels, tags }
}

export default function App() {
  const [buildingFilters, setBuildingFilters] = useState<BuildingFiltersState>(() => loadStoredBuildingFilters())
  
  // Track GeolocateControl for shared position
  const [geolocateControl, setGeolocateControl] = useState<any>(null)
  const sharedUserPosition = useSharedUserPosition(geolocateControl)
  
  // Pass userPosition to useConfigData so it can be sent to the API for location lock verification
  const { levels, level, setLevel, loading, data, dataRef, buildingsMeta, activeConfig, rawConfig } = useConfigData(buildingFilters, sharedUserPosition)
  
  // Location lock hook - check if user is in allowed perimeter
  // Pass sharedUserPosition so it uses the button's position instead of requesting again
  const lockState = useLocationLock(rawConfig, sharedUserPosition)
  
  // Block data access if location lock is active and user is not inside
  const shouldBlockData = rawConfig?.locationLock && lockState.status !== 'inside' && lockState.status !== 'idle'
  const resolvedData = shouldBlockData ? null : (data ?? dataRef.current)
  const metaById = useMemo(() => {
    const map = new Map<string, BuildingMeta>()
    for (const meta of buildingsMeta || []) {
      map.set(meta.id, meta)
    }
    return map
  }, [buildingsMeta])
  const mapRef = useRef<any>(null)
  const prevCameraRef = useRef<any>(null)
  const [showPlanner, setShowPlanner] = useState(false)
  const [plannerDest, setPlannerDest] = useState<any | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [icalUrl, setIcalUrl] = useState<string>(() => {
    try { return localStorage.getItem(ICAL_URL_KEY) || '' } catch { return '' }
  })
  const [bufferMin, setBufferMin] = useState<number>(() => {
    try { const v = Number(localStorage.getItem(TRAVEL_BUFFER_MIN_KEY) || '10'); return Number.isFinite(v) ? v : 10 } catch { return 10 }
  })
  const graphRef = useRef<any | null>(null)
  const [eventsEnabled, setEventsEnabled] = useState<boolean>(() => {
    // Default to disabled unless explicitly enabled in localStorage
    try { const v = localStorage.getItem(EVENTS_ENABLED_KEY); return v === '1' } catch { return false }
  })
  // no selected event state needed; EventBar manages selection internally
  const [plannerStart, setPlannerStart] = useState<{ id: string, name: string } | null>(null)
  const [plannerEnd, setPlannerEnd] = useState<{ id: string, name: string } | null>(null)
  const { theme, themeMode, setThemeMode } = useTheme()
  const [navActive, setNavActive] = useState(false)
  const [editingAliasFeatureId, setEditingAliasFeatureId] = useState<string | number | null>(null)
  const [editingAliasOriginalName, setEditingAliasOriginalName] = useState<string>('')
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'route' | 'alias' | 'calendar' | 'buildings'>('general')

  // Route settings (stored in localStorage, read by RoutePlanner)
  const [excludeStairs, setExcludeStairs] = useState(false)
  const [coveredOnly, setCoveredOnly] = useState(false)
  const [showSecondary, setShowSecondary] = useState(true)

  // Settings modal draft states to avoid partial saves and allow cancel
  const { draftTheme, setDraftTheme, draftIcalUrl, setDraftIcalUrl, draftBufferMin, setDraftBufferMin, draftEventsEnabled, setDraftEventsEnabled, resetDraft } = useSettingsDraft({ theme: themeMode, icalUrl, bufferMin, eventsEnabled })

  function openSettings(initialTab: 'general' | 'route' | 'alias' | 'calendar' | 'buildings' = 'general') {
    resetDraft({ theme: themeMode, icalUrl, bufferMin, eventsEnabled })
    setSettingsInitialTab(initialTab)
    setShowSettings(true)
  }

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'auto'
      return 'light'
    })
  }, [setThemeMode])

  const handleApplyBuildingFilter = useCallback((buildingId: string, nextFilter: BuildingFilterSettings) => {
    setBuildingFilters(prev => {
      const meta = metaById.get(buildingId)
      if (!meta) return prev
      const sanitized = sanitizeFilterForMeta(nextFilter, meta)
      const current = prev[buildingId] ?? createDefaultFilterFromMeta(meta)
      if (filtersAreEqual(current, sanitized)) return prev
      return { ...prev, [buildingId]: sanitized }
    })
  }, [metaById])

  const handleResetBuildingFilter = useCallback((buildingId: string) => {
    setBuildingFilters(prev => {
      const meta = metaById.get(buildingId)
      if (!meta) return prev
      const defaults = createDefaultFilterFromMeta(meta)
      if (filtersAreEqual(prev[buildingId], defaults)) return prev
      return { ...prev, [buildingId]: defaults }
    })
  }, [metaById])

  const handleResetAllBuildingFilters = useCallback(() => {
    setBuildingFilters(prev => {
      if (!buildingsMeta || buildingsMeta.length === 0) return prev
      let mutated = false
      const next: BuildingFiltersState = { ...prev }
      for (const meta of buildingsMeta) {
        const defaults = createDefaultFilterFromMeta(meta)
        if (!filtersAreEqual(next[meta.id], defaults)) {
          next[meta.id] = defaults
          mutated = true
        }
      }
      return mutated ? next : prev
    })
  }, [buildingsMeta])

  // data is now managed by useConfigData

  // (optional) Preload graph for other features; EventBar loads its own
  useEffect(() => { (async () => { graphRef.current = await loadGraphFromConfigOrFallback() })() }, [])

  useEffect(() => {
    if (!buildingsMeta || buildingsMeta.length === 0) return
    setBuildingFilters(prev => {
      const next: BuildingFiltersState = { ...prev }
      let changed = false
      const metaIds = new Set(buildingsMeta.map(b => b.id))

      for (const meta of buildingsMeta) {
        if (!next[meta.id]) {
          next[meta.id] = createDefaultFilterFromMeta(meta)
          changed = true
        }
      }

      for (const key of Object.keys(next)) {
        if (!metaIds.has(key)) {
          delete next[key]
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [buildingsMeta])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const configId = activeConfig || localStorage.getItem(STORAGE_KEYS.CONFIG_FILE) || 'default'
    try {
      localStorage.setItem(`${STORAGE_KEYS.BUILDING_FILTERS}:${configId}`, JSON.stringify(buildingFilters))
    } catch {
      // ignore storage quota errors
    }
  }, [buildingFilters, activeConfig])

  // theme application handled in useTheme hook

  // Events now handled by EventBar; this state is kept to reset when disabling
  useEffect(() => {
    function onNav(e: any) {
      try {
        const active = !!(e?.detail)
        setNavActive(active)
        if (!active) {
          // On sortie de navigation, fermer le planner pour réafficher la barre de recherche
          setShowPlanner(false)
        }
      } catch { }
    }
    window.addEventListener('navigation:active', onNav as any)
    const onOpenSettings = () => openSettings()
    const onSetLevel = (e: any) => { try { const n = Number(e?.detail); if (!Number.isNaN(n)) setLevel(n) } catch { } }
    window.addEventListener('ui:open-settings', onOpenSettings as any)
    window.addEventListener('ui:set-level', onSetLevel as any)
    return () => {
      window.removeEventListener('navigation:active', onNav as any)
      window.removeEventListener('ui:open-settings', onOpenSettings as any)
      window.removeEventListener('ui:set-level', onSetLevel as any)
    }
  }, [])

  return (
    <>
      {/* Desktop level selector */}
      <LevelSelector levels={levels} level={level} loading={loading} onChange={(n) => { setLevel(n); try { window.dispatchEvent(new CustomEvent('ui:set-level', { detail: n })) } catch { } }} />

      {/* Mobile controls bar (level, geolocate, dark mode) - always visible on mobile, positions itself below SearchBar/NavigationBanner */}
      <MobileControlsBar
        map={mapRef.current}
        theme={theme}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        level={level}
        levels={levels}
        loading={loading}
        onLevelChange={(n) => { setLevel(n); try { window.dispatchEvent(new CustomEvent('ui:set-level', { detail: n })) } catch { } }}
      />

      {!navActive && !showPlanner && <SearchBar
        data={resolvedData}
        onSelect={(id, lvl) => {
          if (!mapRef.current) return
          // save camera before changing
          try { prevCameraRef.current = mapRef.current.getCamera() } catch { }
          if (lvl != null) {
            const n = typeof lvl === 'string' ? parseInt(lvl, 10) : lvl
            if (!Number.isNaN(n) && n !== level) setLevel(n)
          }
          if (mapRef.current && mapRef.current.selectFeatureById) mapRef.current.selectFeatureById(id)
        }}
        onRouteRequest={(feat) => {
          // open planner with destination prefilled
          setPlannerDest(feat)
          setShowPlanner(true)
        }}
        onClear={() => {
          if (!mapRef.current) return
          if (mapRef.current && mapRef.current.restoreInitialCamera) mapRef.current.restoreInitialCamera()
          if (mapRef.current && mapRef.current.clearSelection) mapRef.current.clearSelection()
        }}
        onOpenRoutePlanner={() => {
          setShowPlanner(true)
        }}
        onOpenAliasSettings={(featureId, originalName) => {
          setEditingAliasFeatureId(featureId)
          setEditingAliasOriginalName(originalName)
          openSettings('alias')
        }}
      />}
      <MapView 
        ref={mapRef} 
        data={resolvedData} 
        level={level} 
        theme={theme}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        lockState={lockState}
        perimeterCenter={rawConfig?.perimeterCenter}
        perimeterRadius={rawConfig?.perimeterRadius}
        onGeolocateControlReady={setGeolocateControl}
      />
      {showPlanner && <RoutePlanner
        mapRef={mapRef}
        data={resolvedData}
        initialDestination={plannerDest}
        initialStartId={plannerStart?.id}
        initialStartName={plannerStart?.name}
        initialEndId={plannerEnd?.id}
        initialEndName={plannerEnd?.name}
        onClose={() => {
          try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { }
          setShowPlanner(false); setPlannerDest(null); setPlannerStart(null); setPlannerEnd(null)
        }}
        onOpenRouteSettings={() => openSettings('route')}
      />}
      <SettingsButton onClick={openSettings} />

      {/* Event selector at bottom center (desktop); CSS positions; keep always mounted if events exist */}
      {!navActive && eventsEnabled && (
        <EventBar
          icalUrl={icalUrl}
          bufferMin={bufferMin}
          eventsEnabled={eventsEnabled}
          mapRef={mapRef}
          data={resolvedData}
          onOpenPlannerWithStartEnd={(s, e) => { setPlannerStart(s); setPlannerEnd(e); setShowPlanner(true) }}
          onOpenPlannerWithDest={(d) => { setPlannerDest(d); setPlannerStart(null); setPlannerEnd(null); setShowPlanner(true) }}
          onClearRoute={() => { try { mapRef.current?.clearRoute?.() } catch { } }}
        />
      )}

      {showSettings && (
        <SettingsModal
          theme={draftTheme}
          onChangeTheme={setDraftTheme}
          icalUrl={draftIcalUrl}
          onChangeIcalUrl={setDraftIcalUrl}
          bufferMin={draftBufferMin}
          onChangeBufferMin={setDraftBufferMin}
          eventsEnabled={draftEventsEnabled}
          onChangeEventsEnabled={setDraftEventsEnabled}
          excludeStairs={excludeStairs}
          onChangeExcludeStairs={setExcludeStairs}
          coveredOnly={coveredOnly}
          onChangeCoveredOnly={setCoveredOnly}
          showSecondary={showSecondary}
          onChangeShowSecondary={setShowSecondary}
          data={resolvedData}
          editingAliasFeatureId={editingAliasFeatureId}
          editingAliasOriginalName={editingAliasOriginalName}
          initialTab={settingsInitialTab}
          buildingsMeta={buildingsMeta}
          buildingFilters={buildingFilters}
          onChangeBuildingFilter={handleApplyBuildingFilter}
          onResetBuildingFilter={handleResetBuildingFilter}
          onResetAllBuildingFilters={handleResetAllBuildingFilters}
          onClose={() => {
            setThemeMode(draftTheme)
            setIcalUrl(draftIcalUrl)
            try { localStorage.setItem(ICAL_URL_KEY, draftIcalUrl || '') } catch { }
            setBufferMin(draftBufferMin)
            try { localStorage.setItem(TRAVEL_BUFFER_MIN_KEY, String(draftBufferMin)) } catch { }
            setEventsEnabled(draftEventsEnabled)
            try { localStorage.setItem(EVENTS_ENABLED_KEY, draftEventsEnabled ? '1' : '0') } catch { }
            if (!draftEventsEnabled) { try { mapRef.current?.clearRoute?.() } catch { } }
            setShowSettings(false)
            setEditingAliasFeatureId(null)
            setEditingAliasOriginalName('')
          }}
        />
      )}

      {/* Location lock message overlay */}
      <LocationLockMessage lockState={lockState} />
    </>
  )
}
