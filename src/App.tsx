import { useEffect, useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView'
import LevelSelector from './components/LevelSelector'
import SearchBar from './components/SearchBar'
import RoutePlanner from './components/RoutePlanner'
import SettingsButton from './components/SettingsButton'
import EventBar from './components/events/EventBar'
import { loadGraphFromConfigOrFallback } from './utils/graph'
import SettingsModal from './components/settings/SettingsModal.tsx'
import { useConfigData } from './hooks/useConfigData'
import { useTheme } from './hooks/useTheme'
import { useSettingsDraft } from './hooks/useSettingsDraft'
import { ICAL_URL_KEY, TRAVEL_BUFFER_MIN_KEY, EVENTS_ENABLED_KEY } from './utils/storageKeys'

export default function App() {
  const { levels, level, setLevel, loading, dataRef } = useConfigData()
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
  const { theme, setTheme } = useTheme()
  const [navActive, setNavActive] = useState(false)

  // Settings modal draft states to avoid partial saves and allow cancel
  const { draftTheme, setDraftTheme, draftIcalUrl, setDraftIcalUrl, draftBufferMin, setDraftBufferMin, draftEventsEnabled, setDraftEventsEnabled, resetDraft } = useSettingsDraft({ theme, icalUrl, bufferMin, eventsEnabled })

  function openSettings() { resetDraft({ theme, icalUrl, bufferMin, eventsEnabled }); setShowSettings(true) }

  // data is now managed by useConfigData

  // (optional) Preload graph for other features; EventBar loads its own
  useEffect(() => { (async () => { graphRef.current = await loadGraphFromConfigOrFallback() })() }, [])

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
      <LevelSelector levels={levels} level={level} loading={loading} onChange={(n) => { setLevel(n); try { window.dispatchEvent(new CustomEvent('ui:set-level', { detail: n })) } catch { } }} />
      {!navActive && !showPlanner && <SearchBar
        data={dataRef.current}
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
      />}
      <MapView ref={mapRef} data={dataRef.current} level={level} theme={theme} onThemeChange={setTheme} />
      {showPlanner && <RoutePlanner
        mapRef={mapRef}
        data={dataRef.current}
        initialDestination={plannerDest}
        initialStartId={plannerStart?.id}
        initialStartName={plannerStart?.name}
        initialEndId={plannerEnd?.id}
        initialEndName={plannerEnd?.name}
        onClose={() => {
          try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { }
          setShowPlanner(false); setPlannerDest(null); setPlannerStart(null); setPlannerEnd(null)
        }} />}
      <SettingsButton onClick={openSettings} />

      {/* Event selector at bottom center (desktop); CSS positions; keep always mounted if events exist */}
      {!navActive && eventsEnabled && (
        <EventBar
          icalUrl={icalUrl}
          bufferMin={bufferMin}
          eventsEnabled={eventsEnabled}
          mapRef={mapRef}
          data={dataRef.current}
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
          onCancel={() => setShowSettings(false)}
          onSave={() => {
            setTheme(draftTheme)
            setIcalUrl(draftIcalUrl)
            try { localStorage.setItem(ICAL_URL_KEY, draftIcalUrl || '') } catch { }
            setBufferMin(draftBufferMin)
            try { localStorage.setItem(TRAVEL_BUFFER_MIN_KEY, String(draftBufferMin)) } catch { }
            setEventsEnabled(draftEventsEnabled)
            try { localStorage.setItem(EVENTS_ENABLED_KEY, draftEventsEnabled ? '1' : '0') } catch { }
            if (!draftEventsEnabled) { try { mapRef.current?.clearRoute?.() } catch { } }
            setShowSettings(false)
          }}
        />
      )}
    </>
  )
}
