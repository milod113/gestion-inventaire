import { Link } from '@inertiajs/react';

// Building blocks shared by the settings pages (Administration > Parametres).

export const fieldClass = 'w-full rounded-xl border-line bg-canvas px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:ring-brand-500 dark:focus:border-brand-400 dark:focus:ring-brand-400';

export const accentColors = [['#c2410c', 'Orange'], ['#1b503a', 'Vert'], ['#1d4ed8', 'Bleu'], ['#9f1239', 'Bordeaux'], ['#374151', 'Gris']];

const tabs = [['pdf', 'PDF (fiche d inventaire)', 'admin.settings.pdf'], ['excel', 'Export Excel', 'admin.settings.excel']];

export function SettingsTabs({ current }) {
    return (
        <nav className="mb-6 flex gap-1 rounded-2xl border border-line bg-surface p-1 shadow-sm sm:w-fit" aria-label="Paramètres">
            {tabs.map(([key, label, routeName]) => (
                <Link key={key} href={route(routeName)} aria-current={current === key ? 'page' : undefined} className={`flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition sm:flex-none ${current === key ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600' : 'text-muted hover:bg-subtle hover:text-ink'}`}>{label}</Link>
            ))}
        </nav>
    );
}

export function Card({ title, description, children }) {
    return (
        <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            <header className="border-b border-line bg-subtle px-5 py-4">
                <h2 className="text-base font-bold text-ink">{title}</h2>
                <p className="mt-0.5 text-xs text-muted">{description}</p>
            </header>
            <div className="space-y-4 p-5">{children}</div>
        </section>
    );
}

export function Field({ label, error, children }) {
    // A div, not a label: a label would forward clicks on its text to the first button inside (e.g. the first colour swatch).
    return <div className="text-sm font-semibold text-ink"><span>{label}</span><div className="mt-1.5 font-normal">{children}</div><FieldError message={error} /></div>;
}

export function FieldError({ message }) {
    return message ? <p className="mt-1 text-xs font-semibold text-red-600">{message}</p> : null;
}

export function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
            <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-line'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            {label}
        </label>
    );
}

export function IconButton({ title, onClick, disabled = false, children }) {
    return <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink transition hover:bg-subtle disabled:opacity-30">{children}</button>;
}

export function ColorPicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {accentColors.map(([color, name]) => <button key={color} type="button" title={name} onClick={() => onChange(color)} className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-surface transition ${value.toLowerCase() === color ? 'ring-2 ring-ink' : ''}`} style={{ backgroundColor: color }} aria-label={name} />)}
            <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-12 cursor-pointer rounded-lg border border-line bg-transparent" title="Autre couleur" />
        </div>
    );
}

/** Checkbox, editable heading and up/down buttons for each column. */
export function ColumnsEditor({ columns, names, onChange, note = null }) {
    const set = (index, column) => onChange(columns.map((item, i) => (i === index ? column : item)));
    const move = (index, delta) => {
        const target = index + delta;
        if (target < 0 || target >= columns.length) return;
        const next = [...columns];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {columns.map((column, index) => (
                <li key={column.key} className={`flex items-center gap-3 px-3 py-2 ${column.enabled ? '' : 'bg-subtle/60'}`}>
                    <input type="checkbox" checked={column.enabled} onChange={(event) => set(index, { ...column, enabled: event.target.checked })} className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-500" aria-label={`Inclure ${names[column.key]}`} />
                    <input value={column.label} onChange={(event) => set(index, { ...column, label: event.target.value })} disabled={!column.enabled} className={`${fieldClass} py-1.5 disabled:opacity-50`} aria-label={`Titre de la colonne ${names[column.key]}`} />
                    {note?.(column)}
                    <div className="flex shrink-0 gap-1">
                        <IconButton title="Monter" onClick={() => move(index, -1)} disabled={index === 0}>↑</IconButton>
                        <IconButton title="Descendre" onClick={() => move(index, 1)} disabled={index === columns.length - 1}>↓</IconButton>
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Sticky bar with the save state and the save / cancel / reset buttons. */
export function SaveBar({ isDirty, processing, lastUpdate, onReset, onCancel, dirtyMessage }) {
    return (
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 px-5 py-4 shadow-lg backdrop-blur">
            <p className="text-sm text-muted">
                {isDirty ? <span className="font-semibold text-amber-700 dark:text-amber-300">{dirtyMessage}</span>
                    : lastUpdate ? `Enregistré le ${new Date(lastUpdate.at).toLocaleString('fr-FR')}${lastUpdate.by ? ` par ${lastUpdate.by}` : ''}.` : 'Réglages par défaut.'}
            </p>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onReset} className="btn-secondary">Remettre par défaut</button>
                <button type="button" onClick={onCancel} disabled={!isDirty} className="btn-secondary disabled:opacity-50">Annuler les modifications</button>
                <button type="submit" disabled={processing || !isDirty} className="btn-primary disabled:opacity-50">{processing ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
        </div>
    );
}

/** Chooses which articles the preview uses. */
export function ServicePicker({ services, value, onChange }) {
    return (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={`form-select w-auto ${fieldClass} py-2`} aria-label="Articles de l aperçu">
            <option value="">Articles récents, tous services</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.code} — {service.name} ({service.articles_count})</option>)}
        </select>
    );
}

/** Updates a nested value ("page.font_size") in a settings object, returning a new object. */
export function setPath(object, path, value) {
    const next = structuredClone(object);
    const keys = path.split('.');
    keys.slice(0, -1).reduce((node, key) => node[key], next)[keys.at(-1)] = value;
    return next;
}
