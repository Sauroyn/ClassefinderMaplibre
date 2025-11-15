import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizedFeatureId, coerceLevel, findByNormalizedId } from '../utils/featureId'
import SearchList from './search/SearchList'
import SearchSelected from './search/SearchSelected'
import { STORAGE_KEYS, getScopedKey, safeGetItem, safeSetItem } from '../utils/storage'
import { searchWithAliases, getAlias } from '../utils/aliases'
import { Magnifier, Xmark, ArrowLeft, Route as RouteIcon } from '@gravity-ui/icons'

type Props = {
    data: GeoJSON.FeatureCollection | null
    onSelect: (id: number | string, level?: number | string) => void
    onRouteRequest?: (feature: any) => void
    onClear?: () => void
    onOpenRoutePlanner?: () => void
    onOpenAliasSettings?: (featureId: string | number, originalName: string) => void
}

export default function SearchBar({ data, onSelect, onClear, onRouteRequest, onOpenRoutePlanner, onOpenAliasSettings }: Props) {
    const [q, setQ] = useState('')
    const [focused, setFocused] = useState(false)
    const [showBack, setShowBack] = useState(false)
    type RecentItem = { id: string | number, name: string, level?: string | number, buildingLabel?: string }
    const [recent, setRecent] = useState<RecentItem[]>(() => {
        try {
            const key = getScopedKey(STORAGE_KEYS.RECENT_SEARCHES_BASE)
            const raw = JSON.parse(safeGetItem(key) || '[]')
            if (Array.isArray(raw)) return raw.map((r: any) => typeof r === 'string' ? { id: r, name: r } : { id: r.id ?? r.name, name: r.name, level: r.level, buildingLabel: r.buildingLabel })
        } catch (e) { }
        return []
    })
    const [selected, setSelected] = useState<RecentItem | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const blurTimeout = useRef<number | null>(null)
    // Group navigation state
    const [groupView, setGroupView] = useState<{ title: string, items: Array<{ id: number | string, name: string, level?: number | string, buildingLabel?: string }> } | null>(null)
    // Force re-render when aliases are updated
    const [aliasVersion, setAliasVersion] = useState(0)

    const flatItems = useMemo(() => {
        if (!data) return []

        // Utiliser searchWithAliases pour obtenir tous les résultats avec alias
        const qn = q.trim()
        if (qn.length > 0) {
            // Mode recherche: utiliser la fonction de recherche avec alias
            return searchWithAliases(data, qn, true).map(item => {
                // Récupérer le building label depuis la feature originale
                const feature = data.features.find((f: any, idx) => normalizedFeatureId(f, idx) === item.id)
                const buildingLabel = (feature as any)?.properties?.__buildingLabel
                return {
                    id: item.id,
                    name: item.name,
                    level: item.level,
                    buildingLabel,
                    isAlias: item.isAlias,
                    originalName: item.originalName
                }
            })
        } else {
            // Mode liste complète (sans recherche): afficher toutes les features avec leurs alias
            const list: Array<{ id: number; name: string; level?: number | string; buildingLabel?: string; isAlias?: boolean; originalName?: string }> = []
            const feats = (data.features as any[]) || []
            for (let i = 0; i < feats.length; i++) {
                const f = feats[i]
                const originalName = (f.properties?.name ?? '') as string
                // Ne pas filtrer ici, on laisse les features sans nom aussi
                if (typeof originalName === 'string' && originalName.trim().length > 0) {
                    const id = normalizedFeatureId(f, i)
                    const level = coerceLevel(f.properties?.level)
                    const buildingLabel = f.properties?.__buildingLabel
                    const alias = getAlias(id)
                    list.push({
                        id,
                        name: alias ? alias.aliasName : originalName,
                        level,
                        buildingLabel,
                        isAlias: !!alias,
                        originalName
                    })
                }
            }
            return list
        }
    }, [data, q, aliasVersion])

    // Build grouped entries only when searching (q non vide). Recent list remains flat.
    const groupedEntries = useMemo(() => {
        if (!q) return [] as any[]
        const byName = new Map<string, Array<{ id: number | string; name: string; level?: number | string; buildingLabel?: string; isAlias?: boolean; originalName?: string }>>()
        for (const it of flatItems) {
            const arr = byName.get(it.name) || []
            arr.push(it)
            byName.set(it.name, arr)
        }
        const entries: any[] = []
        for (const [name, arr] of byName.entries()) {
            if (arr.length === 1) entries.push({ type: 'single', item: arr[0] })
            else entries.push({ type: 'group', name, items: arr })
        }
        return entries
    }, [flatItems, q])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Tab' && flatItems.length === 1) {
                e.preventDefault()
                const it = flatItems[0]
                // Use pick() to ensure proper ID resolution and highlight
                pick(it.id, it.name)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [flatItems])

    // respond to map clicks when they dispatch a feature click event
    useEffect(() => {
        function onMapFeatureClick(e: any) {
            const feat = e.detail as any
            if (!feat) return

            // Use the feature's id directly from the map (should be the normalized id)
            let id = feat.id
            if (id == null) {
                // Fallback: try to find in flatItems
                const originalName = feat.properties?.name ?? feat.properties?.title ?? (feat.id != null ? `Zone ${feat.id}` : 'Zone')
                const match = flatItems.find(it => it.name === originalName)
                id = match ? match.id : originalName
            }

            // Vérifier si cette feature a un alias
            const alias = getAlias(id)
            const name = alias ? alias.aliasName : (feat.properties?.name ?? feat.properties?.title ?? (id != null ? `Zone ${id}` : 'Zone'))

            // mimic a user pick
            pick(id, name)
            // do not auto-open route planner here; RoutePlanner listens separately when open
        }
        window.addEventListener('map:feature-click', onMapFeatureClick as any)
        return () => { window.removeEventListener('map:feature-click', onMapFeatureClick as any) }
    }, [flatItems])

    // Listen for highlight clear events from the map (e.g., clicking outside features)
    useEffect(() => {
        function onHighlightCleared() {
            // Only clear UI state, do NOT call onClear() to avoid unwanted zoom reset
            setSelected(null)
            setShowBack(false)
        }
        window.addEventListener('map:highlight-clear', onHighlightCleared as any)
        return () => { window.removeEventListener('map:highlight-clear', onHighlightCleared as any) }
    }, [])

    // Listen for alias updates to refresh search results
    useEffect(() => {
        function onAliasesUpdated() {
            setAliasVersion(v => v + 1)
        }
        window.addEventListener('aliases:updated', onAliasesUpdated as any)
        return () => { window.removeEventListener('aliases:updated', onAliasesUpdated as any) }
    }, [])

    const pick = (id: string | number, name: string) => {
        // Always bind selection to the normalized numeric id to avoid collisions on duplicate names
        let resolved: number | string = id
        // try to coerce to number when possible (ids are numeric in map source)
        const n = parseInt(String(id), 10)
        if (Number.isFinite(n)) resolved = n
        // derive level from the feature matched by normalized id
        const feat = findByNormalizedId(data as any, resolved as number)
        const lvl = coerceLevel(feat?.properties?.level)
        const buildingLabel = feat?.properties?.__buildingLabel

        setQ(name)
        // update recent as objects
        setRecent(r => {
            const next = [{ id: resolved, name, level: lvl, buildingLabel }, ...r.filter(x => String(x.id) !== String(resolved))].slice(0, 5)
            const key = getScopedKey(STORAGE_KEYS.RECENT_SEARCHES_BASE)
            safeSetItem(key, JSON.stringify(next))
            return next
        })
        // apply selection
        const item = { id: resolved, name, level: lvl, buildingLabel }
        setSelected(item)
        setShowBack(true)
        setFocused(false)
        onSelect(resolved, lvl)
        // Emit highlight event
        try { window.dispatchEvent(new CustomEvent('map:highlight-feature', { detail: resolved })) } catch { }
    }

    // Limiter à 6 entrées top-level pour l'UI
    const list = (() => {
        // Si on est dans une vue de groupe, afficher uniquement les items du groupe
        if (groupView) {
            return groupView.items.map(it => ({ type: 'single', item: it }))
        }
        // Sinon, afficher les résultats normaux
        return (q ? groupedEntries : recent.map(r => ({ type: 'single', item: r })) as any).slice(0, 6)
    })()

    // Cacher les suggestions si un élément est sélectionné
    const showList = (!selected) && (focused || q.length > 0 || groupView) && list.length > 0

    // Détermine si on doit afficher la forme pillule (fermée) ou les arrondis normaux (ouverte)
    const isSearchClosed = !showList && !selected && !q && !focused

    // Ne pas masquer la liste lors d'une sélection, sauf si on sort du champ
    // On ne masque la liste que si on clique sur retour ou qu'on sort du focus sans texte
    // On ne force plus setSelected(null) sur focus input, pour permettre la sélection ET la liste
    return (
        <div className={`searchbar absolute left-3 right-3 top-[15px] md:left-3 md:right-auto md:top-3 z-search w-auto md:w-[360px] max-w-[calc(100vw-24px)] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-0 shadow-lg border-none transition-[width,height,background-color,box-shadow] duration-100 overflow-hidden ${isSearchClosed ? 'rounded-full' : 'rounded-[15px]'}`}>
            <div className="flex gap-1 items-center px-3 py-2">
                {/* left icon: back | clear | search */}
                {showBack || groupView ? (
                    <button
                        onClick={() => {
                            if (groupView) {
                                // Si on est dans une vue de groupe, revenir à la liste de recherche
                                setGroupView(null)
                                try { window.dispatchEvent(new CustomEvent('map:hover-clear')) } catch { }
                            } else {
                                // Sinon, réinitialiser complètement
                                setQ('')
                                setFocused(false)
                                setShowBack(false)
                                setSelected(null)
                                try { window.dispatchEvent(new CustomEvent('map:highlight-clear')) } catch { }
                                if ((onClear)) onClear()
                            }
                        }}
                        className="w-8 h-8 md:w-9 md:h-9 rounded-lg border border-transparent bg-transparent text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                ) : q.length > 0 ? (
                    <button
                        onClick={() => {
                            if (blurTimeout.current) { clearTimeout(blurTimeout.current); blurTimeout.current = null }
                            setQ('')
                            setSelected(null)
                            setFocused(true)
                            if (inputRef.current) inputRef.current.focus()
                        }}
                        className="w-8 h-8 md:w-9 md:h-9 rounded-lg border border-transparent bg-transparent text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center flex-shrink-0"
                    >
                        <Xmark className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={() => { const el = document.querySelector('.searchbar input') as HTMLInputElement | null; if (el) el.focus() }}
                        className="w-8 h-8 md:w-9 md:h-9 bg-transparent border border-transparent rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors flex items-center justify-center flex-shrink-0"
                        aria-label="search"
                    >
                        <Magnifier className="w-5 h-5" />
                    </button>
                )}
                <input
                    ref={inputRef}
                    className="search-input flex-1 px-2 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-none rounded-full outline-none transition-all text-sm md:text-base"
                    value={q}
                    onChange={e => { setQ(e.target.value); if (selected) setSelected(null); setFocused(true) }}
                    placeholder="Rechercher une salle..."
                    onFocus={() => {
                        if (blurTimeout.current) { clearTimeout(blurTimeout.current); blurTimeout.current = null }
                        setFocused(true)
                        // Ne pas forcer setSelected(null) ici
                    }}
                    onBlur={() => {
                        if (blurTimeout.current) clearTimeout(blurTimeout.current)
                        blurTimeout.current = window.setTimeout(() => {
                            setFocused(false)
                            // Si pas de texte, on peut masquer la sélection
                            if (!q) setSelected(null)
                        }, 50)
                    }}
                />
                {/* Bouton accès direct itinéraire à droite de l'input */}
                {(!focused && !q) && (
                    <button
                        onClick={() => { if (typeof onOpenRoutePlanner === 'function') { onOpenRoutePlanner(); } }}
                        className="w-8 h-8 md:w-9 md:h-9 ml-0.5 rounded-lg border-none bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center justify-center flex-shrink-0"
                        title="Itinéraire"
                        aria-label="Itinéraire"
                    >
                        <RouteIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            {showList && (
                <div className="max-h-[220px] md:max-h-[260px] overflow-auto">
                    {groupView && (
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 font-bold text-sm">
                            {groupView.title} ({groupView.items.length})
                        </div>
                    )}
                    <SearchList items={list as any} onPick={(id, name) => {
                        // Clear hover to mirror map click behavior
                        try { window.dispatchEvent(new CustomEvent('map:hover-clear')) } catch { }
                        pick(id, name)
                        setFocused(false)
                        setGroupView(null) // Clear group view after selection
                    }} onOpenGroup={(name, items) => {
                        setGroupView({ title: name, items })
                        setFocused(true) // Keep focus to show the list
                    }} />
                </div>
            )}

            {/* Selected details */}
            <SearchSelected selected={selected as any} onRoute={(feat: any) => { if (onRouteRequest) onRouteRequest(feat) }} data={data} onOpenAliasSettings={onOpenAliasSettings} />
        </div>
    )
}
