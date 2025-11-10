/**
 * Module de gestion des labels de features GeoJSON
 * 
 * Ce module fournit une API simple et modulaire pour afficher les noms
 * des features sur une carte MapLibre GL.
 * 
 * @example
 * ```typescript
 * import { createFeatureLabels } from '@/map/labels'
 * 
 * const labels = createFeatureLabels(map)
 * labels.update(level, theme)
 * ```
 */

export { FeatureLabels, createFeatureLabels, type LabelStyle } from './FeatureLabels'
