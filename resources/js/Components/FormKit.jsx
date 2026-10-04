import InputError from '@/Components/InputError';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const inputClass = (error) =>
    `block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-muted/70 focus:outline-none focus:ring-4 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : 'border-line focus:border-brand-500 focus:ring-brand-500/15'}`;

// Two-column form page: sections on the left, sticky summary + actions on the right,
// and a fixed action bar below xl.
export function FormLayout({ onSubmit, summary, errors, processing, isDirty, submitLabel, cancelHref, children }) {
    return (
        <form onSubmit={onSubmit} data-shortcut-save className="grid gap-6 px-5 pb-28 pt-7 lg:px-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:pb-12">
            <div className="space-y-6">{children}</div>

            <aside className="xl:sticky xl:top-24 xl:self-start">
                <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                    {summary}
                    <div className="hidden gap-2 border-t border-line p-4 xl:grid">
                        <SubmitButton processing={processing} label={submitLabel} />
                        <Link href={cancelHref} data-shortcut-cancel className="btn-secondary w-full">Annuler</Link>
                    </div>
                </div>
                {Object.keys(errors).length > 0 && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        Veuillez corriger les champs signales avant d'enregistrer.
                    </div>
                )}
            </aside>

            <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-end gap-2 border-t border-line bg-surface/90 px-5 py-3 backdrop-blur-md xl:hidden">
                {isDirty && <span className="mr-auto hidden text-xs text-muted sm:block">Modifications non enregistrees</span>}
                <Link href={cancelHref} className="btn-secondary">Annuler</Link>
                <SubmitButton processing={processing} label={submitLabel} />
            </div>
        </form>
    );
}

export function SummaryHeader({ label, children }) {
    return (
        <div className="relative overflow-hidden bg-brand-800 px-6 py-6 text-white">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-400/25 blur-2xl" />
            <p className="relative text-xs font-medium uppercase tracking-wider text-brand-100/70">{label}</p>
            <div className="relative mt-1">{children}</div>
        </div>
    );
}

export function SummaryList({ children }) {
    return <dl className="divide-y divide-line px-6 text-sm">{children}</dl>;
}

export function SummaryRow({ label, value, mono = false }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className={`min-w-0 text-right font-medium ${value ? 'text-ink' : 'text-muted/60'} ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
        </div>
    );
}

export function Section({ number, title, description, children }) {
    return (
        <section className="rounded-2xl border border-line bg-surface shadow-card">
            <header className="flex items-center gap-3 border-b border-line px-6 py-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{number}</span>
                <div>
                    <h2 className="text-sm font-semibold text-ink">{title}</h2>
                    <p className="text-xs text-muted">{description}</p>
                </div>
            </header>
            <div className="grid gap-x-5 gap-y-5 p-6 md:grid-cols-2">{children}</div>
        </section>
    );
}

export function Field({ label, name, error, hint, wide = false, required = false, children }) {
    return (
        <div className={wide ? 'md:col-span-2' : ''}>
            <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink">
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {children}
            {error ? <InputError message={error} className="mt-1.5" /> : hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
        </div>
    );
}

// Native date picker when the value is ISO (or empty); plain text otherwise so legacy imported values are never lost.
export function DateInput(props) {
    return <input {...props} type={!props.value || ISO_DATE.test(props.value) ? 'date' : 'text'} />;
}

export function ServicePicker({ services, value, onChange, error }) {
    const [query, setQuery] = useState('');
    const selected = services.find((service) => String(service.id) === String(value)) || null;
    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return (term ? services.filter((service) => `${service.code} ${service.name}`.toLowerCase().includes(term)) : services).slice(0, 50);
    }, [query, services]);

    return (
        <Combobox value={selected} onChange={(service) => onChange(service?.id ?? '')} onClose={() => setQuery('')} immediate>
            <div className="relative">
                <ComboboxInput
                    id="service_id"
                    className={`${inputClass(error)} pr-20`}
                    placeholder="Rechercher par code ou nom..."
                    displayValue={(service) => (service ? `${service.code} · ${service.name}` : '')}
                    onChange={(event) => setQuery(event.target.value)}
                    autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                    {selected && (
                        <button type="button" onClick={() => onChange('')} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label="Retirer le service">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
                        </button>
                    )}
                    <ComboboxButton className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8 9 4-4 4 4M16 15l-4 4-4-4" /></svg>
                    </ComboboxButton>
                </div>
            </div>
            <ComboboxOptions anchor="bottom start" className="z-50 mt-1 max-h-72 w-[var(--input-width)] overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl empty:invisible">
                {filtered.length === 0 && query !== '' ? (
                    <div className="px-3 py-2.5 text-sm text-muted">Aucun service trouve.</div>
                ) : (
                    filtered.map((service) => (
                        <ComboboxOption key={service.id} value={service} className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[focus]:bg-subtle">
                            <span className="w-12 shrink-0 font-mono text-xs text-muted">{service.code}</span>
                            <span className="flex-1 truncate">{service.name}</span>
                            <svg className="invisible h-4 w-4 text-brand-600 group-data-[selected]:visible dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg>
                        </ComboboxOption>
                    ))
                )}
            </ComboboxOptions>
        </Combobox>
    );
}

export function SubmitButton({ processing, label }) {
    return (
        <button type="submit" disabled={processing} className="btn-primary w-full sm:w-auto xl:w-full">
            {processing ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" className="opacity-75" /></svg>
            ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg>
            )}
            {processing ? 'Enregistrement...' : label}
        </button>
    );
}

export function formatDate(value) {
    if (!value) return null;
    if (!ISO_DATE.test(value)) return value;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
