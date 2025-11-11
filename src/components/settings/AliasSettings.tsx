import AliasManager from './AliasManager'

type Props = {
    data: GeoJSON.FeatureCollection | null
    editingFeatureId?: string | number | null
    editingOriginalName?: string
}

export default function AliasSettings({ data, editingFeatureId, editingOriginalName }: Props) {
    return (
        <div>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Alias de zones</h2>
            <p style={{ marginTop: 0, marginBottom: 24, fontSize: 14, opacity: 0.8, lineHeight: 1.5 }}>
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
