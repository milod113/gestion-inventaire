const format = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';

export default function AuditInfo({ record, className = '' }) {
    const created = record.creator ? `Saisi par ${record.creator.name} le ${format(record.created_at)}` : record.source === 'import' ? 'Importé depuis l\'ancien système' : null;
    const edited = record.editor && record.updated_by !== record.created_by ? `Dernière modification par ${record.editor.name} le ${format(record.updated_at)}` : null;
    if (!created && !edited) return null;
    return <p className={`text-xs font-medium text-[#718177] ${className}`}>{[created, edited].filter(Boolean).join(' · ')}</p>;
}
