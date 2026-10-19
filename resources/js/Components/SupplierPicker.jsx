import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { inputClass } from '@/Components/FormKit';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';

const CREATE = '__create__';
const looksLikeCode = (value) => /^[A-Z]{2,}[.\s-]?\d+$/i.test(value.trim());

// Recherche un fournisseur par code ou appellation ; s'il n'existe pas, propose de le creer sans quitter la facture.
export default function SupplierPicker({ value, initial = null, onChange, error, canCreate }) {
    const [selected, setSelected] = useState(() => initial ?? (value ? { code: value, appellation: null } : null));
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(null);
    const request = useRef(0);

    useEffect(() => {
        const term = query.trim();
        if (term === '') {
            setResults([]);
            return undefined;
        }
        const id = ++request.current;
        setLoading(true);
        const timer = setTimeout(() => {
            window.axios.get(route('factures.fournisseurs.search'), { params: { q: term } })
                .then(({ data }) => { if (id === request.current) setResults(data); })
                .finally(() => { if (id === request.current) setLoading(false); });
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const choose = (fournisseur) => {
        if (fournisseur === CREATE) {
            const term = query.trim();
            setCreating(looksLikeCode(term) ? { code: term.toUpperCase(), appellation: '' } : { code: '', appellation: term });
            return;
        }
        setSelected(fournisseur);
        onChange(fournisseur?.code ?? '');
    };

    const term = query.trim();
    const exactMatch = results.some((fournisseur) => fournisseur.code.toLowerCase() === term.toLowerCase());
    const unknown = selected && !selected.appellation;

    return (
        <>
            <Combobox value={selected} onChange={choose} onClose={() => setQuery('')} immediate by={(a, b) => (a && b && typeof a === 'object' && typeof b === 'object' ? a.code === b.code : a === b)}>
                <div className="relative">
                    <ComboboxInput
                        id="code_fournisseur"
                        className={`${inputClass(error)} pr-10`}
                        placeholder="Rechercher par code (PR.401) ou par nom..."
                        displayValue={(fournisseur) => (fournisseur ? [fournisseur.code, fournisseur.appellation].filter(Boolean).join(' · ') : '')}
                        onChange={(event) => setQuery(event.target.value)}
                        autoComplete="off"
                    />
                    {selected && (
                        <button type="button" onClick={() => choose(null)} className="absolute inset-y-0 right-0 mr-2 grid w-7 place-items-center text-muted hover:text-ink" aria-label="Retirer le fournisseur">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
                        </button>
                    )}
                </div>
                <ComboboxOptions anchor="bottom start" className="z-50 mt-1 max-h-80 w-[var(--input-width)] overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl empty:invisible">
                    {term !== '' && loading && results.length === 0 && <div className="px-3 py-2.5 text-sm text-muted">Recherche...</div>}
                    {term !== '' && !loading && results.length === 0 && <div className="px-3 py-2.5 text-sm text-muted">Aucun fournisseur trouve pour « {term} ».</div>}
                    {results.map((fournisseur) => (
                        <ComboboxOption key={fournisseur.id} value={fournisseur} className="group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[focus]:bg-subtle">
                            <span className="w-20 shrink-0 pt-0.5 font-mono text-xs text-muted">{fournisseur.code}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{fournisseur.appellation}</span>
                                {fournisseur.telephone && <span className="block truncate text-xs text-muted">Tel. {fournisseur.telephone}</span>}
                            </span>
                        </ComboboxOption>
                    ))}
                    {canCreate && term !== '' && !loading && !exactMatch && (
                        <ComboboxOption value={CREATE} className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border-t border-line px-3 py-2.5 text-sm font-semibold text-brand-700 data-[focus]:bg-brand-50 dark:text-brand-300 dark:data-[focus]:bg-brand-950">
                            <span className="text-base leading-none">+</span> Creer le fournisseur « {term} »
                        </ComboboxOption>
                    )}
                </ComboboxOptions>
            </Combobox>

            {selected?.appellation && (
                <div className="mt-2 rounded-xl border border-line bg-subtle px-3.5 py-2.5 text-xs text-muted">
                    <p className="font-semibold text-ink">{selected.appellation}</p>
                    {[selected.adresse, selected.telephone && `Tel. ${selected.telephone}`].filter(Boolean).join(' · ') || 'Fiche a completer (adresse, telephone).'}
                </div>
            )}
            {unknown && (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Le code {selected.code} n a pas de fiche fournisseur.
                    {canCreate && <> <button type="button" onClick={() => setCreating({ code: selected.code, appellation: '' })} className="font-semibold underline">Creer la fiche</button></>}
                </p>
            )}

            <QuickCreateModal initial={creating} onClose={() => setCreating(null)} onCreated={(fournisseur) => { setCreating(null); choose(fournisseur); }} />
        </>
    );
}

function QuickCreateModal({ initial, onClose, onCreated }) {
    const [form, setForm] = useState({ code: '', appellation: '', telephone: '' });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (initial) {
            setForm({ code: initial.code, appellation: initial.appellation, telephone: '' });
            setErrors({});
        }
    }, [initial]);

    // Pas de <form> ici : la fenetre est rendue a l'interieur du formulaire de facture,
    // un submit remonterait jusqu'a lui. On valide donc au clic ou avec Entree.
    const save = () => {
        if (processing) return;
        setProcessing(true);
        window.axios.post(route('factures.fournisseurs.store'), form)
            .then(({ data }) => onCreated(data))
            .catch((exception) => setErrors(Object.fromEntries(Object.entries(exception.response?.data?.errors ?? { appellation: ['Creation impossible, reessayez.'] }).map(([key, messages]) => [key, messages[0]]))))
            .finally(() => setProcessing(false));
    };
    const field = (name) => ({
        id: `fournisseur_${name}`,
        value: form[name],
        onChange: (event) => setForm((current) => ({ ...current, [name]: event.target.value })),
        onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); save(); } },
        className: inputClass(errors[name]),
    });

    return (
        <Modal show={Boolean(initial)} onClose={onClose} maxWidth="md">
            <div className="space-y-4 p-6">
                <div>
                    <h2 className="text-base font-semibold text-ink">Nouveau fournisseur</h2>
                    <p className="mt-1 text-sm text-muted">Il sera cree puis selectionne sur la facture. La fiche complete (adresse, RC, banque) pourra etre completee plus tard.</p>
                </div>
                <div>
                    <label htmlFor="fournisseur_code" className="mb-1.5 block text-sm font-medium text-ink">Code<span className="ml-0.5 text-red-500">*</span></label>
                    <input {...field('code')} placeholder="ex. PR.873" className={`${inputClass(errors.code)} font-mono`} autoFocus={!form.code} />
                    <InputError message={errors.code} className="mt-1.5" />
                </div>
                <div>
                    <label htmlFor="fournisseur_appellation" className="mb-1.5 block text-sm font-medium text-ink">Appellation<span className="ml-0.5 text-red-500">*</span></label>
                    <input {...field('appellation')} placeholder="ex. Ste FOUATIH Freres" autoFocus={Boolean(form.code)} />
                    <InputError message={errors.appellation} className="mt-1.5" />
                </div>
                <div>
                    <label htmlFor="fournisseur_telephone" className="mb-1.5 block text-sm font-medium text-ink">Telephone <span className="font-normal text-muted">(facultatif)</span></label>
                    <input {...field('telephone')} />
                    <InputError message={errors.telephone} className="mt-1.5" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
                    <button type="button" onClick={save} disabled={processing} className="btn-primary">{processing ? 'Creation...' : 'Creer et selectionner'}</button>
                </div>
            </div>
        </Modal>
    );
}
