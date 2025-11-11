type Props = {
    icalUrl: string
    onChangeIcalUrl: (v: string) => void
    bufferMin: number
    onChangeBufferMin: (n: number) => void
    eventsEnabled: boolean
    onChangeEventsEnabled: (v: boolean) => void
}

export default function CalendarSettings({
    icalUrl,
    onChangeIcalUrl,
    bufferMin,
    onChangeBufferMin,
    eventsEnabled,
    onChangeEventsEnabled
}: Props) {
    return (
        <div>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 22, fontWeight: 700 }}>
                Connexion calendrier
            </h2>
            <p style={{ marginTop: 0, marginBottom: 24, fontSize: 14, opacity: 0.8, lineHeight: 1.5 }}>
                Connectez votre calendrier iCal pour afficher vos événements sur la carte et recevoir des
                alertes de départ.
            </p>

            {/* Enable/disable events */}
            <div style={{ marginBottom: 32 }}>
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <input
                        type="checkbox"
                        checked={eventsEnabled}
                        onChange={(e) => onChangeEventsEnabled(e.target.checked)}
                        style={{
                            width: 20,
                            height: 20,
                            cursor: 'pointer'
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Activer les événements</div>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                            Afficher les événements de votre calendrier sur la carte
                        </div>
                    </div>
                </label>
            </div>

            {/* iCal URL */}
            <div style={{ marginBottom: 24 }}>
                <label
                    htmlFor="ical-url"
                    style={{
                        display: 'block',
                        marginBottom: 8,
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--panel-fg, #111)'
                    }}
                >
                    URL iCal
                </label>
                <input
                    id="ical-url"
                    type="url"
                    value={icalUrl}
                    onChange={(e) => onChangeIcalUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/..."
                    disabled={!eventsEnabled}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--panel-border, #ddd)',
                        background: eventsEnabled ? 'var(--panel-bg, white)' : 'var(--muted, #f8f9fa)',
                        color: 'var(--panel-fg, #111)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        opacity: eventsEnabled ? 1 : 0.6,
                        cursor: eventsEnabled ? 'text' : 'not-allowed'
                    }}
                />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                    L'URL de votre calendrier au format iCal (.ics)
                </div>
            </div>

            {/* Buffer minutes */}
            <div style={{ marginBottom: 24 }}>
                <label
                    htmlFor="buffer-min"
                    style={{
                        display: 'block',
                        marginBottom: 8,
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--panel-fg, #111)'
                    }}
                >
                    Temps de trajet supplémentaire
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                        id="buffer-min"
                        type="number"
                        min={0}
                        max={60}
                        value={bufferMin}
                        onChange={(e) => onChangeBufferMin(Number(e.target.value))}
                        disabled={!eventsEnabled}
                        style={{
                            width: 80,
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--panel-border, #ddd)',
                            background: eventsEnabled ? 'var(--panel-bg, white)' : 'var(--muted, #f8f9fa)',
                            color: 'var(--panel-fg, #111)',
                            fontSize: 14,
                            fontFamily: 'inherit',
                            opacity: eventsEnabled ? 1 : 0.6,
                            cursor: eventsEnabled ? 'text' : 'not-allowed'
                        }}
                    />
                    <span style={{ fontSize: 14, opacity: 0.8 }}>minutes</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                    Temps de marge ajouté avant le début de vos événements
                </div>
            </div>

            {/* Info box */}
            <div
                style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'rgba(0, 122, 255, 0.05)',
                    border: '1px solid rgba(0, 122, 255, 0.2)',
                    marginTop: 24
                }}
            >
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    <strong>💡 Comment obtenir votre URL iCal ?</strong>
                    <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                        <li style={{ marginBottom: 4 }}>
                            <strong>Google Calendar :</strong> Paramètres → Intégrer l'agenda → Adresse secrète
                            au format iCal
                        </li>
                        <li>
                            <strong>Autres calendriers :</strong> Recherchez l'option d'export/partage iCal dans
                            les paramètres
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
