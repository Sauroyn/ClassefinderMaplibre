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
            <h2 className="mt-0 mb-2 text-[22px] font-bold">
                Connexion calendrier
            </h2>
            <p className="mt-0 mb-6 text-sm opacity-80 leading-relaxed">
                Connectez votre calendrier iCal pour afficher vos événements sur la carte et recevoir des
                alertes de départ.
            </p>

            {/* Enable/disable events */}
            <div className="mb-8">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={eventsEnabled}
                        onChange={(e) => onChangeEventsEnabled(e.target.checked)}
                        className="w-5 h-5 cursor-pointer"
                    />
                    <div>
                        <div className="font-semibold text-sm">Activer les événements</div>
                        <div className="text-xs opacity-70 mt-0.5">
                            Afficher les événements de votre calendrier sur la carte
                        </div>
                    </div>
                </label>
            </div>

            {/* iCal URL */}
            <div className="mb-6">
                <label
                    htmlFor="ical-url"
                    className="block mb-2 font-semibold text-sm text-gray-900 dark:text-gray-100"
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
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-inherit ${eventsEnabled
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-text'
                            : 'bg-gray-100 dark:bg-gray-700 opacity-60 cursor-not-allowed'
                        }`}
                />
                <div className="mt-1.5 text-xs opacity-70">
                    L'URL de votre calendrier au format iCal (.ics)
                </div>
            </div>

            {/* Buffer minutes */}
            <div className="mb-6">
                <label
                    htmlFor="buffer-min"
                    className="block mb-2 font-semibold text-sm text-gray-900 dark:text-gray-100"
                >
                    Temps de trajet supplémentaire
                </label>
                <div className="flex items-center gap-3">
                    <input
                        id="buffer-min"
                        type="number"
                        min={0}
                        max={60}
                        value={bufferMin}
                        onChange={(e) => onChangeBufferMin(Number(e.target.value))}
                        disabled={!eventsEnabled}
                        className={`w-20 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-inherit ${eventsEnabled
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-text'
                                : 'bg-gray-100 dark:bg-gray-700 opacity-60 cursor-not-allowed'
                            }`}
                    />
                    <span className="text-sm opacity-80">minutes</span>
                </div>
                <div className="mt-1.5 text-xs opacity-70">
                    Temps de marge ajouté avant le début de vos événements
                </div>
            </div>

            {/* Info box */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mt-6">
                <div className="text-sm leading-relaxed">
                    <strong>💡 Comment obtenir votre URL iCal ?</strong>
                    <ul className="mt-2 mb-0 pl-5">
                        <li className="mb-1">
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
