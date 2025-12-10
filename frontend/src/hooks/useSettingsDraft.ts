import { useState } from 'react'

export function useSettingsDraft(initial: { theme: 'light' | 'dark', icalUrl: string, bufferMin: number, eventsEnabled: boolean }) {
    const [draftTheme, setDraftTheme] = useState<'light' | 'dark'>(initial.theme)
    const [draftIcalUrl, setDraftIcalUrl] = useState<string>(initial.icalUrl)
    const [draftBufferMin, setDraftBufferMin] = useState<number>(initial.bufferMin)
    const [draftEventsEnabled, setDraftEventsEnabled] = useState<boolean>(initial.eventsEnabled)

    function resetDraft(next: { theme: 'light' | 'dark', icalUrl: string, bufferMin: number, eventsEnabled: boolean }) {
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
