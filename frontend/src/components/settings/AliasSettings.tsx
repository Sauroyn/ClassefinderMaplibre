import AliasManager from './AliasManager'

type Props = {
    data: GeoJSON.FeatureCollection | null
    editingFeatureId?: string | number | null
    editingOriginalName?: string
}

export default function AliasSettings({ data, editingFeatureId, editingOriginalName }: Props) {
    return (
        <div>
            <h2 className="mt-0 mb-2 text-[22px] font-bold text-gray-900 dark:text-gray-100">Alias de zones</h2>
            <p className="mt-0 mb-6 text-sm opacity-80 leading-relaxed text-gray-900 dark:text-gray-100">
                Renommez des zones pour les retrouver plus facilement. Les alias sont enregistrés localement
                dans votre navigateur.
            </p>
            <AliasManager
                data={data}
                editingFeatureId={editingFeatureId}
                editingOriginalName={editingOriginalName}
            />
        </div>
    )
}
