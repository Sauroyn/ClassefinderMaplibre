type Props = {
    excludeStairs: boolean
    onChangeExcludeStairs: (v: boolean) => void
    coveredOnly: boolean
    onChangeCoveredOnly: (v: boolean) => void
    showSecondary: boolean
    onChangeShowSecondary: (v: boolean) => void
}

export default function RouteSettings({
    excludeStairs,
    onChangeExcludeStairs,
    coveredOnly,
    onChangeCoveredOnly,
    showSecondary,
    onChangeShowSecondary,
}: Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-4">Paramètres d'itinéraire</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Configurez les options de calcul d'itinéraire selon vos préférences.
                </p>
            </div>

            <div className="space-y-4">
                {/* Exclude stairs */}
                <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={excludeStairs}
                        onChange={(e) => onChangeExcludeStairs(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                        <div className="font-medium">Exclure les escaliers</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Privilégier les rampes et ascenseurs
                        </div>
                    </div>
                </label>

                {/* Covered only */}
                <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={coveredOnly}
                        onChange={(e) => onChangeCoveredOnly(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                        <div className="font-medium">Passages couverts uniquement</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Éviter les passages extérieurs
                        </div>
                    </div>
                </label>

                {/* Show secondary routes */}
                <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={showSecondary}
                        onChange={(e) => onChangeShowSecondary(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                        <div className="font-medium">Afficher les itinéraires alternatifs</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Proposer plusieurs options de trajet
                        </div>
                    </div>
                </label>
            </div>
        </div>
    )
}
