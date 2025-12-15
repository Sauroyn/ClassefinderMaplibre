import { useState } from 'react'
import type { ThemeMode } from '../theme/colors'

export function useSettingsDraft(initial: { theme: ThemeMode, icalUrl: string, bufferMin: number, eventsEnabled: boolean }) {
    const [draftTheme, setDraftTheme] = useState<ThemeMode>(initial.theme)
    const [draftIcalUrl, setDraftIcalUrl] = useState<string>(initial.icalUrl)
    const [draftBufferMin, setDraftBufferMin] = useState<number>(initial.bufferMin)
    const [draftEventsEnabled, setDraftEventsEnabled] = useState<boolean>(initial.eventsEnabled)

    function resetDraft(next: { theme: ThemeMode, icalUrl: string, bufferMin: number, eventsEnabled: boolean }) {
        setDraftTheme(next.theme)
        setDraftIcalUrl(next.icalUrl)
        setDraftBufferMin(next.bufferMin)
        setDraftEventsEnabled(next.eventsEnabled)
    }

    return {
        draftTheme, setDraftTheme,
        draftIcalUrl, setDraftIcalUrl,
        draftBufferMin, setDraftBufferMin,
        draftEventsEnabled, setDraftEventsEnabled,
        resetDraft
    }
}
