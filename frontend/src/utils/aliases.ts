/**
 * Module de gestion des alias de features GeoJSON
 * 
 * Permet d'attribuer des noms alternatifs aux features (avec ou sans nom),
 * avec stockage persistant et intégration dans toute l'application
 * (recherche, itinéraires, affichage carte, etc.)
 */

import { safeGetItem, safeSetItem, getScopedKey } from './storage'
import { normalizedFeatureId } from './featureId'

/**
 * Représente un alias pour une feature
 */
export interface FeatureAlias {
    /** ID normalisé de la feature (index dans la FeatureCollection) */
    featureId: number | string
    /** Nom original de la feature (peut être vide pour les features sans nom) */
    originalName: string
    /** Alias/nom de remplacement */
    aliasName: string
    /** Si true, l'ancien nom reste visible dans les recherches */
    showOriginalInSearch: boolean
    /** Timestamp de création */
    createdAt: number
    /** Timestamp de dernière modification */
    updatedAt: number
}

/**
 * Clé de stockage pour les alias (scopé par config)
 */
const ALIASES_STORAGE_KEY = 'cf:aliases'

/**
 * Cache en mémoire des alias pour éviter les lectures répétées
 */
let aliasCache: Map<string | number, FeatureAlias> | null = null

/**
 * Récupère tous les alias depuis le stockage
 */
function loadAliases(): Map<string | number, FeatureAlias> {
    if (aliasCache) return aliasCache

    try {
        const key = getScopedKey(ALIASES_STORAGE_KEY)
        const raw = safeGetItem(key)
        if (!raw) {
            aliasCache = new Map()
            return aliasCache
        }

        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
            aliasCache = new Map()
            return aliasCache
        }

        aliasCache = new Map()
        for (const item of parsed) {
            if (item && typeof item === 'object' && item.featureId != null && item.aliasName) {
                aliasCache.set(item.featureId, item as FeatureAlias)
            }
        }
        return aliasCache
    } catch (error) {
        console.error('[Aliases] Erreur lors du chargement des alias:', error)
        aliasCache = new Map()
        return aliasCache
    }
}

/**
 * Sauvegarde les alias dans le stockage
 */
function saveAliases(aliases: Map<string | number, FeatureAlias>): boolean {
    try {
        const key = getScopedKey(ALIASES_STORAGE_KEY)
        const array = Array.from(aliases.values())
        const success = safeSetItem(key, JSON.stringify(array))
        if (success) {
            // Émettre un événement pour notifier les autres composants
            try {
                window.dispatchEvent(new CustomEvent('aliases:updated'))
            } catch { }
        }
        return success
    } catch (error) {
        console.error('[Aliases] Erreur lors de la sauvegarde des alias:', error)
        return false
    }
}

/**
 * Invalide le cache (utile lors du changement de config)
 */
export function invalidateAliasCache(): void {
    aliasCache = null
}

/**
 * Récupère l'alias d'une feature par son ID normalisé
 */
export function getAlias(featureId: number | string): FeatureAlias | null {
    const aliases = loadAliases()
    return aliases.get(featureId) || null
}

/**
 * Récupère tous les alias
 */
export function getAllAliases(): FeatureAlias[] {
    const aliases = loadAliases()
    return Array.from(aliases.values())
}

/**
 * Crée ou met à jour un alias
 */
export function setAlias(
    featureId: number | string,
    originalName: string,
    aliasName: string,
    showOriginalInSearch: boolean = true
): boolean {
    if (!aliasName || aliasName.trim().length === 0) {
        console.warn('[Aliases] Impossible de créer un alias vide')
        return false
    }

    const aliases = loadAliases()
    const now = Date.now()

    const existing = aliases.get(featureId)
    const alias: FeatureAlias = {
        featureId,
        originalName: originalName || '',
        aliasName: aliasName.trim(),
        showOriginalInSearch,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now
    }

    aliases.set(featureId, alias)
    return saveAliases(aliases)
}

/**
 * Supprime un alias
 */
export function deleteAlias(featureId: number | string): boolean {
    const aliases = loadAliases()
    const existed = aliases.has(featureId)

    if (existed) {
        aliases.delete(featureId)
        return saveAliases(aliases)
    }

    return false
}

/**
 * Supprime tous les alias
 */
export function clearAllAliases(): boolean {
    const aliases = new Map<string | number, FeatureAlias>()
    aliasCache = aliases
    return saveAliases(aliases)
}

/**
 * Récupère le nom effectif d'une feature (alias ou nom original)
 * Utilisé partout dans l'app pour obtenir le bon nom à afficher
 */
export function getEffectiveName(featureId: number | string, originalName: string): string {
    const alias = getAlias(featureId)
    return alias ? alias.aliasName : originalName
}

/**
 * Recherche des features par nom (inclut les alias)
 * Retourne un tableau d'objets avec l'ID et le nom effectif
 */
export function searchWithAliases(
    features: GeoJSON.FeatureCollection | null,
    query: string,
    includeOriginalNames: boolean = true
): Array<{ id: number | string; name: string; isAlias: boolean; originalName?: string; level?: number | string }> {
    if (!features || !query) return []

    const qn = query.trim().toLowerCase()
    const results: Array<{ id: number | string; name: string; isAlias: boolean; originalName?: string; level?: number | string }> = []
    const aliases = loadAliases()

    const feats = (features.features as any[]) || []
    for (let i = 0; i < feats.length; i++) {
        const f = feats[i]
        const id = normalizedFeatureId(f, i)
        const originalName = (f.properties?.name ?? '') as string
        const level = f.properties?.level
        const alias = aliases.get(id)

        if (alias) {
            // La feature a un alias
            // Toujours rechercher dans l'alias
            if (alias.aliasName.toLowerCase().includes(qn)) {
                results.push({
                    id,
                    name: alias.aliasName,
                    isAlias: true,
                    originalName: originalName,
                    level
                })
                continue
            }

            // Si on inclut les noms originaux ET que l'alias autorise l'affichage
            if (includeOriginalNames && alias.showOriginalInSearch && originalName && originalName.toLowerCase().includes(qn)) {
                results.push({
                    id,
                    name: originalName,
                    isAlias: false,
                    originalName: originalName,
                    level
                })
            }
        } else {
            // Pas d'alias, recherche normale
            if (originalName && originalName.toLowerCase().includes(qn)) {
                results.push({
                    id,
                    name: originalName,
                    isAlias: false,
                    level
                })
            }
        }
    }

    return results
}

/**
 * Récupère toutes les features avec leurs noms effectifs (pour l'autocomplétion, etc.)
 */
export function getAllFeaturesWithAliases(
    features: GeoJSON.FeatureCollection | null
): Array<{ id: number | string; name: string; originalName: string; isAlias: boolean; level?: number | string }> {
    if (!features) return []

    const aliases = loadAliases()
    const results: Array<{ id: number | string; name: string; originalName: string; isAlias: boolean; level?: number | string }> = []

    const feats = (features.features as any[]) || []
    for (let i = 0; i < feats.length; i++) {
        const f = feats[i]
        const id = normalizedFeatureId(f, i)
        const originalName = (f.properties?.name ?? '') as string
        const level = f.properties?.level
        const alias = aliases.get(id)

        results.push({
            id,
            name: alias ? alias.aliasName : originalName,
            originalName,
            isAlias: !!alias,
            level
        })
    }

    return results
}

/**
 * Récupère les noms disponibles pour le sélecteur d'alias
 * Filtre les features qui ont déjà un alias pour éviter les alias d'alias
 */
export function getAvailableNamesForAliasSelector(
    features: GeoJSON.FeatureCollection | null
): Array<{ id: number | string; name: string; level?: number | string }> {
    if (!features) return []

    const aliases = loadAliases()
    const results: Array<{ id: number | string; name: string; level?: number | string }> = []

    const feats = (features.features as any[]) || []
    for (let i = 0; i < feats.length; i++) {
        const f = feats[i]
        const id = normalizedFeatureId(f, i)
        const originalName = (f.properties?.name ?? '') as string
        const level = f.properties?.level

        // Ne pas inclure les features qui ont déjà un alias (pas d'alias d'alias)
        if (aliases.has(id)) continue

        // Inclure toutes les features (avec ou sans nom)
        const displayName = originalName || `Zone ${id}`
        results.push({
            id,
            name: displayName,
            level
        })
    }

    return results
}
