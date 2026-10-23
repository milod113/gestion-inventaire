import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { inputClass } from '@/Components/FormKit';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const OPEN_EVENT = 'rappel:open';
const FICHE_LABELS = { facture: 'Facture', article: 'Article', fournisseur: 'Fournisseur' };

/** Ouvre la fenetre de rappel : openReminder() / openReminder({ fiche }) / openReminder({ rappel }) pour modifier. */
export const openReminder = (detail = {}) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }));

// ---------------------------------------------------------------- dates

const pad = (value) => String(value).padStart(2, '0');
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseIso = (value) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (date, days) => { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; };
const startOfToday = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); };
export const daysUntil = (iso) => Math.round((parseIso(iso) - startOfToday()) / 86400000);
const shortDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

function quickDates() {
    const today = startOfToday();
    const monday = addDays(today, ((8 - today.getDay()) % 7) || 7);
    return [
        ["Aujourd'hui", toIso(today)],
        ['Demain', toIso(addDays(today, 1))],
        ['Lundi prochain', toIso(monday)],
        ['Dans 1 semaine', toIso(addDays(today, 7))],
    ];
}

/** Libelle et couleur de l'echeance : "En retard · 3 j", "Aujourd'hui · 14:30", "Demain", "lun. 26 oct.". */
export function dueInfo(rappel) {
    const time = rappel.heure ? ` · ${rappel.heure}` : '';
    if (rappel.termine_at) return { label: `Fait le ${shortDate.format(new Date(rappel.termine_at))}`, tone: 'done' };
    const days = daysUntil(rappel.echeance);
    if (days < 0) return { label: days === -1 ? `Hier${time}` : `En retard · ${-days} j`, tone: 'late' };
    if (days === 0) return { label: `Aujourd'hui${time}`, tone: 'today' };
    if (days === 1) return { label: `Demain${time}`, tone: 'soon' };
    return { label: `${shortDate.format(parseIso(rappel.echeance))}${time}`, tone: 'later' };
}

const DUE_TONES = {
    late: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
    today: 'bg-gold-400/15 text-gold-500 ring-gold-400/40 dark:text-gold-300',
    soon: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/30',
    later: 'bg-subtle text-muted ring-line',
    done: 'bg-subtle text-muted ring-line',
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');

export function Avatar({ name, size = 'sm', className = '' }) {
    const sizes = { xs: 'h-5 w-5 text-[9px]', sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs' };
    return <span title={name} className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white ring-2 ring-surface ${sizes[size]} ${className}`}>{initials(name)}</span>;
}

// ---------------------------------------------------------------- actions

const visitOptions = (onDone) => ({ preserveScroll: true, preserveState: true, onSuccess: () => onDone?.() });
const toggleDone = (rappel, onDone) => router.patch(route('rappels.terminer', rappel.id), {}, visitOptions(onDone));
const postpone = (rappel, jours, onDone) => router.patch(route('rappels.reporter', rappel.id), { jours }, visitOptions(onDone));
const remove = (rappel, onDone) => { if (window.confirm('Supprimer ce rappel ?')) router.delete(route('rappels.destroy', rappel.id), visitOptions(onDone)); };

// ---------------------------------------------------------------- carte de rappel

/**
 * Une ligne de rappel. compact : version de la cloche et du tableau de bord.
 * hideFiche : masque le lien vers la fiche (encadre affiche sur la fiche elle-meme).
 */
export function ReminderItem({ rappel, compact = false, hideFiche = false, onChange }) {
    const { auth } = usePage().props;
    const [leaving, setLeaving] = useState(false);
    const due = dueInfo(rappel);
    const done = Boolean(rappel.termine_at);
    const forSomeoneElse = rappel.assigne && rappel.assigne.id !== auth.user.id;
    const fromSomeoneElse = rappel.auteur && rappel.auteur.id !== auth.user.id;

    const check = () => {
        if (!rappel.peut_terminer) return;
        setLeaving(!done);
        // Laisse l'animation de la coche se jouer avant de recharger la liste.
        setTimeout(() => toggleDone(rappel, onChange), done ? 0 : 350);
    };

    return (
        <div className={`group relative flex gap-3 transition-all duration-300 ${compact ? 'rounded-xl px-3 py-2.5 hover:bg-subtle' : 'rounded-2xl border border-line bg-surface p-4 shadow-card hover:border-brand-200 dark:hover:border-brand-500/40'} ${leaving ? 'scale-[0.98] opacity-50' : ''} ${due.tone === 'late' && !compact ? 'border-l-4 border-l-red-400' : ''}`}>
            <button
                type="button"
                onClick={check}
                disabled={!rappel.peut_terminer}
                aria-label={done ? 'Rouvrir le rappel' : 'Marquer comme fait'}
                title={done ? 'Rouvrir' : 'Marquer comme fait'}
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${done || leaving ? 'border-brand-600 bg-brand-600 text-white' : 'border-line text-transparent hover:border-brand-500 hover:text-brand-500'} disabled:cursor-not-allowed disabled:opacity-50`}
            >
                <svg className={`h-3 w-3 transition ${leaving ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg>
            </button>

            <div className="min-w-0 flex-1">
                <p className={`whitespace-pre-line break-words text-sm leading-snug ${done || leaving ? 'text-muted line-through decoration-muted/60' : 'text-ink'} ${compact ? 'line-clamp-2' : ''}`}>{rappel.texte}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${DUE_TONES[due.tone]}`}>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">{due.tone === 'done' ? <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /> : <><circle cx="12" cy="12" r="8.5" /><path strokeLinecap="round" d="M12 7.5V12l3 2" /></>}</svg>
                        {due.label}
                    </span>
                    {rappel.fiche && !hideFiche && <FicheChip fiche={rappel.fiche} />}
                    {forSomeoneElse && <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-muted ring-1 ring-line"><Avatar name={rappel.assigne.name} size="xs" />Pour {rappel.assigne.name}</span>}
                    {fromSomeoneElse && <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-muted ring-1 ring-line"><Avatar name={rappel.auteur.name} size="xs" />De {rappel.auteur.name}</span>}
                    {done && rappel.termine_par && !compact && <span className="text-[11px] text-muted">par {rappel.termine_par}</span>}
                </div>
            </div>

            {!done && (rappel.peut_terminer || rappel.peut_modifier) && <ReminderMenu rappel={rappel} onChange={onChange} />}
            {done && rappel.peut_modifier && !compact && (
                <button type="button" onClick={() => remove(rappel, onChange)} className="self-start rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10" aria-label="Supprimer">
                    <TrashIcon />
                </button>
            )}
        </div>
    );
}

function FicheChip({ fiche }) {
    const content = <><FicheIcon type={fiche.type} /><span className="max-w-[14rem] truncate">{fiche.label}</span></>;
    const className = 'inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink ring-1 ring-line';
    return fiche.url
        ? <Link href={fiche.url} className={`${className} transition hover:text-brand-700 hover:ring-brand-300 dark:hover:text-brand-200`} title={`Ouvrir : ${fiche.label}`}>{content}</Link>
        : <span className={className}>{content}</span>;
}

function ReminderMenu({ rappel, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-subtle';
    const run = (action) => { setOpen(false); action(); };

    return (
        <div ref={ref} className="relative self-start">
            <button type="button" onClick={() => setOpen((value) => !value)} className={`rounded-lg p-1.5 text-muted transition hover:bg-subtle hover:text-ink ${open ? 'bg-subtle text-ink' : 'opacity-60 group-hover:opacity-100'}`} aria-label="Actions du rappel" aria-expanded={open}>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
            {open && (
                <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-line bg-surface p-1 shadow-xl">
                    {rappel.peut_terminer && <>
                        <button type="button" className={item} onClick={() => run(() => postpone(rappel, 1, onChange))}><ClockIcon />Reporter a demain</button>
                        <button type="button" className={item} onClick={() => run(() => postpone(rappel, 7, onChange))}><ClockIcon />Reporter d une semaine</button>
                    </>}
                    {rappel.peut_modifier && <>
                        <button type="button" className={item} onClick={() => run(() => openReminder({ rappel }))}><PencilIcon />Modifier</button>
                        <div className="my-1 h-px bg-line" />
                        <button type="button" className={`${item} text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10`} onClick={() => run(() => remove(rappel, onChange))}><TrashIcon />Supprimer</button>
                    </>}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------- fenetre de creation / modification

/** Monte une seule fois dans le layout : ecoute openReminder() et affiche la fenetre + un toast de confirmation. */
export function ReminderHost() {
    const { auth } = usePage().props;
    const [state, setState] = useState(null);
    const [users, setUsers] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    useEffect(() => {
        const open = (event) => setState({ ...event.detail, key: Date.now() });
        window.addEventListener(OPEN_EVENT, open);
        return () => { window.removeEventListener(OPEN_EVENT, open); clearTimeout(toastTimer.current); };
    }, []);

    useEffect(() => {
        if (state && users === null) window.axios.get(route('rappels.utilisateurs')).then(({ data }) => setUsers(data)).catch(() => setUsers([]));
    }, [state, users]);

    const notify = (message) => {
        setToast(message);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
    };

    return (
        <>
            <Modal show={Boolean(state)} onClose={() => setState(null)} maxWidth="lg">
                {state && <ReminderForm key={state.key} initial={state} me={auth.user} users={users ?? []} onClose={() => setState(null)} onSaved={notify} />}
            </Modal>
            {toast && (
                <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" role="status">
                    <p className="flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-2xl dark:bg-surface dark:text-ink dark:ring-1 dark:ring-line">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/25 text-emerald-200 dark:text-emerald-400"><svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg></span>
                        {toast}
                    </p>
                </div>
            )}
        </>
    );
}

function ReminderForm({ initial, me, users, onClose, onSaved }) {
    const editing = initial.rappel ?? null;
    const fiche = editing?.fiche ?? initial.fiche ?? null;
    const [linked, setLinked] = useState(Boolean(fiche));
    const { data, setData, post, put, processing, errors, transform } = useForm({
        texte: editing?.texte ?? '',
        echeance: editing?.echeance ?? toIso(addDays(startOfToday(), 1)),
        heure: editing?.heure ?? '',
        assigne_a: editing?.assigne?.id ?? me.id,
        rappelable_type: fiche?.type ?? '',
        rappelable_id: fiche?.id ?? '',
    });
    const colleagues = users.filter((user) => user.id !== me.id);
    const forColleague = Number(data.assigne_a) !== me.id;
    const chips = quickDates();

    transform((values) => ({ ...values, heure: values.heure || null, rappelable_type: linked ? values.rappelable_type || null : null, rappelable_id: linked ? values.rappelable_id || null : null }));

    const save = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { onClose(); onSaved(editing ? 'Rappel modifie' : forColleague ? 'Rappel envoye a votre collegue' : 'Rappel cree'); },
        };
        editing ? put(route('rappels.update', editing.id), options) : post(route('rappels.store'), options);
    };

    return (
        <form onSubmit={save}>
            <div className="relative overflow-hidden bg-brand-800 px-6 py-5 text-white">
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold-400/25 blur-2xl" />
                <div className="relative flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><BellIcon className="h-5 w-5" /></span>
                    <div>
                        <h2 className="text-base font-semibold">{editing ? 'Modifier le rappel' : 'Nouveau rappel'}</h2>
                        <p className="text-xs text-brand-100/75">{data.echeance ? `Pour le ${longDate.format(parseIso(data.echeance))}${data.heure ? ` a ${data.heure}` : ''}` : 'Choisissez une date'}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-5 p-6">
                <div>
                    <label htmlFor="rappel_texte" className="mb-1.5 block text-sm font-medium text-ink">Que faut-il faire ?</label>
                    <textarea id="rappel_texte" value={data.texte} onChange={(event) => setData('texte', event.target.value)} rows="3" maxLength={1000} autoFocus
                        onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) save(event); }}
                        placeholder="ex. Relancer le fournisseur pour le bon de livraison" className={`${inputClass(errors.texte)} resize-none`} />
                    <InputError message={errors.texte} className="mt-1.5" />
                </div>

                {fiche && (
                    <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${linked ? 'border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/10' : 'border-dashed border-line'}`}>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${linked ? 'bg-brand-600 text-white' : 'bg-subtle text-muted'}`}><FicheIcon type={fiche.type} /></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{linked ? 'Lie a' : 'Non lie'} · {FICHE_LABELS[fiche.type]}</p>
                            <p className={`truncate text-sm font-medium ${linked ? 'text-ink' : 'text-muted line-through'}`}>{fiche.label}</p>
                        </div>
                        <button type="button" onClick={() => setLinked((value) => !value)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface hover:text-ink">{linked ? 'Retirer' : 'Relier'}</button>
                    </div>
                )}
                <InputError message={errors.rappelable_id} />

                <div>
                    <p className="mb-1.5 text-sm font-medium text-ink">Quand ?</p>
                    <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {chips.map(([label, value]) => (
                            <button key={label} type="button" onClick={() => setData('echeance', value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${data.echeance === value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-subtle text-muted ring-line hover:text-ink hover:ring-brand-300'}`}>{label}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input type="date" value={data.echeance} onChange={(event) => setData('echeance', event.target.value)} className={inputClass(errors.echeance)} aria-label="Date" />
                        <input type="time" value={data.heure} onChange={(event) => setData('heure', event.target.value)} className={`${inputClass(errors.heure)} w-32`} aria-label="Heure (facultatif)" title="Heure (facultatif)" />
                    </div>
                    <InputError message={errors.echeance || errors.heure} className="mt-1.5" />
                </div>

                <div>
                    <p className="mb-1.5 text-sm font-medium text-ink">Pour qui ?</p>
                    <div className="inline-flex rounded-xl border border-line bg-subtle p-1" role="radiogroup" aria-label="Pour qui">
                        {[['Moi', true], ['Un collegue', false]].map(([label, mine]) => {
                            const active = mine ? !forColleague : forColleague;
                            return (
                                <button key={label} type="button" role="radio" aria-checked={active} disabled={!mine && colleagues.length === 0}
                                    onClick={() => setData('assigne_a', mine ? me.id : (colleagues[0]?.id ?? me.id))}
                                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    {forColleague && (
                        <div className="mt-2.5 flex items-center gap-2.5">
                            <Avatar name={colleagues.find((user) => user.id === Number(data.assigne_a))?.name ?? ''} size="md" />
                            <select value={data.assigne_a} onChange={(event) => setData('assigne_a', Number(event.target.value))} className={`${inputClass(errors.assigne_a)} form-select`}>
                                {colleagues.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </select>
                        </div>
                    )}
                    <InputError message={errors.assigne_a} className="mt-1.5" />
                    {forColleague && <p className="mt-1.5 text-xs text-muted">Votre collegue le verra dans sa cloche, et vous saurez quand il l aura termine.</p>}
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line bg-subtle/60 px-6 py-4">
                <span className="hidden text-[11px] text-muted sm:block">Ctrl + Entree pour enregistrer</span>
                <div className="ml-auto flex gap-2">
                    <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
                    <button type="submit" disabled={processing} className="btn-primary">{processing ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer le rappel'}</button>
                </div>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------- cloche

export function ReminderBell() {
    const { rappels_a_echeance: count = 0 } = usePage().props;
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(null);
    const ref = useRef(null);

    const load = () => window.axios.get(route('rappels.cloche')).then(({ data }) => setItems(data.rappels)).catch(() => setItems([]));

    useEffect(() => { if (open) load(); }, [open]);
    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => { if (!ref.current?.contains(event.target) && !event.target.closest?.('#modal')) setOpen(false); };
        const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
    }, [open]);

    const late = items?.filter((rappel) => daysUntil(rappel.echeance) < 0).length ?? 0;

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={`Rappels${count ? ` : ${count} a traiter` : ''}`} title="Mes rappels"
                className={`relative grid h-9 w-9 place-items-center rounded-lg transition hover:bg-subtle hover:text-ink ${open ? 'bg-subtle text-ink' : 'text-muted'}`}>
                <BellIcon className={`h-5 w-5 ${count ? 'origin-top animate-bell' : ''}`} />
                {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-canvas">{count > 99 ? '99+' : count}</span>}
            </button>

            {open && (
                <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-ink">Mes rappels</p>
                            <p className="text-xs text-muted">{count === 0 ? 'Rien a traiter aujourd hui' : `${count} a traiter${late ? ` · ${late} en retard` : ''}`}</p>
                        </div>
                        <button type="button" onClick={() => { setOpen(false); openReminder(); }} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700">
                            <PlusIcon />Nouveau
                        </button>
                    </div>
                    <div className="max-h-[22rem] overflow-y-auto p-1.5">
                        {items === null ? <SkeletonList /> : items.length === 0 ? (
                            <EmptyState compact title="Tout est a jour" text="Aucun rappel dans les 7 prochains jours." />
                        ) : items.map((rappel) => <ReminderItem key={rappel.id} rappel={rappel} compact onChange={load} />)}
                    </div>
                    <Link href={route('rappels.index')} onClick={() => setOpen(false)} className="block border-t border-line bg-subtle/60 px-4 py-2.5 text-center text-xs font-semibold text-brand-700 transition hover:bg-subtle dark:text-brand-300">
                        Voir tous mes rappels
                    </Link>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------- encadre sur une fiche

export function RecordReminders({ rappels = [], fiche, className = '' }) {
    return (
        <section className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-card ${className}`}>
            <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${rappels.length ? 'bg-gold-400/15 text-gold-500 dark:text-gold-300' : 'bg-subtle text-muted'}`}><BellIcon className="h-[18px] w-[18px]" /></span>
                    <div>
                        <p className="text-sm font-semibold text-ink">{rappels.length ? `${rappels.length} rappel${rappels.length > 1 ? 's' : ''} en cours` : 'Rappels'}</p>
                        <p className="text-xs text-muted">{rappels.length ? 'Sur cette fiche' : 'Aucun rappel sur cette fiche'}</p>
                    </div>
                </div>
                <button type="button" onClick={() => openReminder({ fiche })} className="btn-secondary !py-2 text-xs"><PlusIcon />Creer un rappel</button>
            </div>
            {rappels.length > 0 && <div className="space-y-1 border-t border-line p-2">{rappels.map((rappel) => <ReminderItem key={rappel.id} rappel={rappel} compact hideFiche />)}</div>}
        </section>
    );
}

// ---------------------------------------------------------------- elements communs

export function EmptyState({ title, text, compact = false, action = null }) {
    return (
        <div className={`flex flex-col items-center text-center ${compact ? 'px-6 py-8' : 'px-6 py-16'}`}>
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <BellIcon className="h-6 w-6" />
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-surface text-brand-600 ring-2 ring-surface dark:text-brand-300"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg></span>
            </span>
            <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 max-w-xs text-xs text-muted">{text}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

function SkeletonList() {
    return <div className="space-y-2 p-2">{[0, 1, 2].map((index) => <div key={index} className="flex gap-3"><span className="h-5 w-5 animate-pulse rounded-full bg-subtle" /><div className="flex-1 space-y-2"><span className="block h-3 w-4/5 animate-pulse rounded bg-subtle" /><span className="block h-3 w-1/3 animate-pulse rounded bg-subtle" /></div></div>)}</div>;
}

export function BellIcon({ className = 'h-5 w-5' }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
}
export function PlusIcon() {
    return <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}
function ClockIcon() { return <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><path strokeLinecap="round" d="M12 7.5V12l3 2" /></svg>; }
function PencilIcon() { return <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>; }
function TrashIcon() { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>; }
function FicheIcon({ type }) {
    const paths = {
        facture: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
        article: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
        fournisseur: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a5 5 0 0 1 10 0v2M16 11a3 3 0 1 0-1.7-5.5M17 16a5 5 0 0 1 4 4v1" /></>,
    };
    return <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}
