import { useState } from 'react';

const fieldClass = 'rounded-xl border-line bg-canvas py-2.5 text-sm text-ink focus:border-brand-500 focus:ring-brand-500 dark:focus:border-brand-400 dark:focus:ring-brand-400';

export default function LabelPrintControls({ params, label = 'Imprimer étiquettes', disabled = false }) {
    const [format, setFormat] = useState('a4');
    const [copies, setCopies] = useState(1);
    const [start, setStart] = useState(1);
    const query = { ...params, format, copies, ...(format === 'a4' ? { start } : {}) };

    return <div className="flex flex-wrap items-center justify-end gap-2">
        <select value={format} onChange={(event) => setFormat(event.target.value)} className={`form-select ${fieldClass}`} title="Format d etiquette">
            <option value="a4">Planche A4 (3×8, 70×37 mm)</option>
            <option value="thermique">Thermique (50×25 mm)</option>
        </select>
        <label className="flex items-center gap-1 text-xs font-semibold text-muted">Copies<input type="number" min="1" max="50" value={copies} onChange={(event) => setCopies(event.target.value)} className={`w-16 ${fieldClass}`} /></label>
        {format === 'a4' && <label className="flex items-center gap-1 text-xs font-semibold text-muted" title="Position de la premiere etiquette sur la planche (pour reutiliser une planche entamee)">Départ<input type="number" min="1" max="24" value={start} onChange={(event) => setStart(event.target.value)} className={`w-16 ${fieldClass}`} /></label>}
        <a href={disabled ? undefined : route('articles.labels', query)} target="_blank" rel="noreferrer" aria-disabled={disabled} className={`inline-flex items-center rounded-xl px-5 py-3 text-sm font-bold transition ${disabled ? 'cursor-not-allowed bg-subtle text-muted opacity-60' : 'bg-gold-400 text-slate-900 shadow-sm hover:bg-gold-300'}`}>{label}</a>
    </div>;
}
