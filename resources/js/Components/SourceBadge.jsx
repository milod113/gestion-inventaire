export default function SourceBadge({ source }) {
    if (source !== 'import') return null;
    return <span className="ml-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">Importé</span>;
}

export function SourceSelect({ value, onChange, className = '' }) {
    return (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={className}>
            <option value="">Toutes les origines</option>
            <option value="import">Importés</option>
            <option value="saisie">Saisis</option>
        </select>
    );
}

export function FlashError({ message }) {
    return message ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">{message}</div> : null;
}
