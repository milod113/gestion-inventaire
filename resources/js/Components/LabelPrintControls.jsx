import { useState } from 'react';

const fieldClass = 'rounded-xl border-[#d5e1d6] bg-[#fbfdfb] py-2.5 text-sm focus:border-[#2f7654] focus:ring-[#2f7654]';

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
        <label className="flex items-center gap-1 text-xs font-semibold text-[#5c7163]">Copies<input type="number" min="1" max="50" value={copies} onChange={(event) => setCopies(event.target.value)} className={`w-16 ${fieldClass}`} /></label>
        {format === 'a4' && <label className="flex items-center gap-1 text-xs font-semibold text-[#5c7163]" title="Position de la premiere etiquette sur la planche (pour reutiliser une planche entamee)">Départ<input type="number" min="1" max="24" value={start} onChange={(event) => setStart(event.target.value)} className={`w-16 ${fieldClass}`} /></label>}
        <a href={disabled ? undefined : route('articles.labels', query)} target="_blank" rel="noreferrer" aria-disabled={disabled} className={`rounded-xl px-5 py-3 text-sm font-bold ${disabled ? 'cursor-not-allowed bg-[#edf1ed] text-[#a1aaa3]' : 'bg-[#e5ad45] text-[#173126] hover:bg-[#d89d33]'}`}>{label}</a>
    </div>;
}
