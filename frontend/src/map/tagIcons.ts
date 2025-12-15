/**
 * Maps tag keywords to icon identifiers for intelligent icon selection
 */

export type TagIconMapping = {
  keywords: string[]
  icon: string
  text?: string  // fallback text if icon not available
}

export const TAG_ICON_MAPPINGS: TagIconMapping[] = [
  // Exit/Sortie
  {
    keywords: ['sortie', 'exit', 'evacuation'],
    icon: 'exit',
    text: '🚪'
  },
  // Elevator/Ascenseur
  {
    keywords: ['ascenseur', 'elevator', 'lift'],
    icon: 'elevator',
    text: '🛗'
  },
  // Parking
  {
    keywords: ['parking', 'stationnement', 'garage'],
    icon: 'parking',
    text: 'P'
  },
  // Reception/Accueil
  {
    keywords: ['accueil', 'reception', 'welcome', 'desk'],
    icon: 'reception',
    text: 'ℹ️'
  },
  // Stairs/Escalier
  {
    keywords: ['escalier', 'stairs', 'stairway', 'staircase'],
    icon: 'stairs',
    text: '🪜'
  },
  // Restroom/Toilettes
  {
    keywords: ['toilette', 'wc', 'restroom', 'bathroom'],
    icon: 'restroom',
    text: '🚻'
  },
  // Restaurant/Cafeteria
  {
    keywords: ['restaurant', 'cafeteria', 'cantine', 'food', 'dining'],
    icon: 'restaurant',
    text: '🍽️'
  },
  // Library/Bibliothèque
  {
    keywords: ['bibliotheque', 'library'],
    icon: 'library',
    text: '📚'
  },
  // Office/Bureau
  {
    keywords: ['bureau', 'office'],
    icon: 'office',
    text: '🏢'
  },
  // Lab/Laboratoire
  {
    keywords: ['laboratoire', 'lab', 'laboratory'],
    icon: 'lab',
    text: '🔬'
  },
  // Classroom/Salle
  {
    keywords: ['salle', 'classroom', 'room', 'amphitheatre', 'amphi'],
    icon: 'classroom',
    text: '🎓'
  }
]

/**
 * Determines the best icon for a given tag value
 * @param tag - The tag value from the GeoJSON feature
 * @returns Icon identifier or fallback text
 */
export function getIconForTag(tag: string | undefined | null): { icon: string; text: string } | null {
  if (!tag) return null
  
  const normalized = String(tag).toLowerCase().trim()
  if (!normalized) return null

  // Find first matching mapping
  for (const mapping of TAG_ICON_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword)) {
        return { icon: mapping.icon, text: mapping.text || normalized.charAt(0).toUpperCase() }
      }
    }
  }

  // Default: use first letter of tag
  return { icon: 'default-poi', text: normalized.charAt(0).toUpperCase() }
}

/**
 * Creates a MapLibre expression that maps tags to icons dynamically
 */
export function createTagIconExpression(): any {
  const cases: any[] = []
  
  for (const mapping of TAG_ICON_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      // For each keyword, add a case: if tags contains keyword, use icon
      cases.push(
        ['in', keyword, ['downcase', ['coalesce', ['get', 'tags'], '']]],
        mapping.icon
      )
    }
  }
  
  // Default fallback
  cases.push('default-poi')
  
  return ['case', ...cases]
}

/**
 * Load icon images into MapLibre map
 * This should be called during map initialization
 */
export async function loadTagIcons(map: any): Promise<void> {
  const iconsToLoad = [
    ...TAG_ICON_MAPPINGS.map(m => ({ id: m.icon, fallback: m.text })),
    { id: 'default-poi', fallback: '📍' }
  ]

  for (const { id, fallback } of iconsToLoad) {
    if (map.hasImage(id)) continue

    // Try to load from public/icons/ directory
    const iconPath = `/icons/${id}.png`
    
    try {
      const response = await fetch(iconPath)
      if (response.ok) {
        const blob = await response.blob()
        const img = await createImageBitmap(blob)
        map.addImage(id, img, { sdf: false })
        continue
      }
    } catch (err) {
      console.warn(`[tagIcons] Could not load ${iconPath}, using text fallback`)
    }

    // Fallback: create a simple canvas-based icon with text
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Draw circle background
      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(16, 16, 15, 0, 2 * Math.PI)
      ctx.fill()

      // Draw text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(fallback || '?', 16, 16)

      map.addImage(id, canvas, { sdf: false })
    }
  }
}
