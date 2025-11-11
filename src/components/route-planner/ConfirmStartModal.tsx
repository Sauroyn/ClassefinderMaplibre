

export default function ConfirmStartModal({ open, distance, onCancel, onAdjust }: { open: boolean, distance: number, onCancel: () => void, onAdjust: () => void }) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/35">
            <div className="max-w-[380px] w-[90%] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-4 shadow-2xl">
                <div className="font-bold text-base mb-2">Point de départ éloigné</div>
                <div className="text-sm opacity-90 mb-3.5">
                    Le trajet doit commencer près de votre position. Le point de départ actuel est à environ {Math.round(distance)} m.
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        OK
                    </button>
                    <button
                        onClick={onAdjust}
                        className="px-3 py-2.5 rounded-lg border-none bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                    >
                        Mettre le départ à ma position
                    </button>
                </div>
            </div>
        </div>
    )
}
