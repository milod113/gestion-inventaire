import { KeyCombo } from '@/Components/Kbd';
import PageHeader from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { visibleShortcutGroups } from '@/shortcuts';
import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function Index() {
    const { auth } = usePage().props;
    const groups = useMemo(() => visibleShortcutGroups(auth.user), [auth.user]);
    const [query, setQuery] = useState('');

    const allItems = groups.flatMap((group) => group.items);
    const activeCount = allItems.filter((item) => item.available).length;

    const filteredGroups = useMemo(() => {
        const term = normalize(query.trim());
        if (!term) return groups;
        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => normalize([item.label, item.hint, item.context, item.keys.flat().join(' ')].filter(Boolean).join(' ')).includes(term)),
            }))
            .filter((group) => group.items.length > 0);
    }, [groups, query]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Centre d'aide"
                    title="Raccourcis clavier"
                    description="Naviguez et saisissez plus vite, sans quitter le clavier."
                    actions={
                        <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm shadow-sm">
                            <span className={`h-2 w-2 rounded-full ${activeCount ? 'bg-brand-500' : 'bg-amber-500'}`} />
                            <span className="font-semibold tabular-nums text-ink">{activeCount} / {allItems.length}</span>
                            <span className="text-muted">actifs</span>
                        </span>
                    }
                />
            }
        >
            <Head title="Aide · Raccourcis clavier" />

            <div className="space-y-6 px-5 pb-14 pt-7 lg:px-10">
                <Hero />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="space-y-6">
                        <div className="relative">
                            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Rechercher un raccourci : facture, enregistrer, Ctrl..."
                                className="block w-full rounded-2xl border border-line bg-surface py-3 pl-12 pr-4 text-sm text-ink shadow-card placeholder:text-muted/70 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                            />
                        </div>

                        {filteredGroups.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
                                <p className="text-sm font-semibold text-ink">Aucun raccourci ne correspond a « {query} »</p>
                                <button type="button" onClick={() => setQuery('')} className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">Effacer la recherche</button>
                            </div>
                        ) : (
                            filteredGroups.map((group) => <ShortcutGroup key={group.id} group={group} />)
                        )}
                    </div>

                    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                        <nav className="rounded-2xl border border-line bg-surface p-2 shadow-card">
                            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">Sommaire</p>
                            {groups.map((group) => (
                                <a key={group.id} href={`#${group.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-subtle">
                                    <span className="text-muted"><Icon name={group.icon} className="h-4 w-4" /></span>
                                    <span className="flex-1">{group.title}</span>
                                    <span className="rounded-md bg-subtle px-1.5 text-xs tabular-nums text-muted">{group.items.length}</span>
                                </a>
                            ))}
                        </nav>

                        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <svg className="h-4 w-4 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" /></svg>
                                Bon a savoir
                            </h2>
                            <ul className="mt-3 space-y-3 text-sm text-muted">
                                <Tip>Les raccourcis a une lettre sont ignores pendant que vous ecrivez dans un champ. Seuls <b className="text-ink">Ctrl + S</b> et <b className="text-ink">Echap</b> restent actifs.</Tip>
                                <Tip>Aucun raccourci n'utilise <b className="text-ink">Alt</b> : sur un clavier AZERTY, AltGr sert a taper @, # ou €.</Tip>
                                <Tip>Ctrl + N et Ctrl + T restent au navigateur (nouvelle fenetre, nouvel onglet).</Tip>
                                <Tip>Seuls les raccourcis autorises par votre role sont affiches.</Tip>
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Hero() {
    return (
        <section className="relative overflow-hidden rounded-2xl bg-brand-800 text-white shadow-card">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">Comment ca marche</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Deux facons de declencher un raccourci</h2>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <HowTo
                            title="Combinaison"
                            text="Maintenez la premiere touche, puis appuyez sur la seconde."
                            keys={[['Ctrl', 'K']]}
                        />
                        <HowTo
                            title="Sequence"
                            text="Appuyez sur une touche, relachez, puis appuyez sur la suivante."
                            keys={[['G'], ['D']]}
                        />
                    </div>
                </div>
                <div className="hidden text-center lg:block">
                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        {['G', 'A', 'F', 'N', 'S', '?'].map((key) => (
                            <span key={key} className="grid h-14 w-14 place-items-center rounded-xl border border-white/15 border-b-4 bg-white/10 text-lg font-semibold text-white shadow-inner">{key}</span>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-brand-100/70">Appuyez sur <span className="font-semibold text-white">?</span> depuis n'importe quelle page</p>
                </div>
            </div>
        </section>
    );
}

function HowTo({ title, text, keys }) {
    return (
        <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-100/75">{text}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {keys.map((step, stepIndex) => (
                    <span key={stepIndex} className="inline-flex items-center gap-1.5">
                        {stepIndex > 0 && <span className="text-[11px] font-medium text-brand-100/60">puis</span>}
                        {step.map((key, keyIndex) => (
                            <span key={key} className="inline-flex items-center gap-1">
                                {keyIndex > 0 && <span className="text-xs text-brand-100/60">+</span>}
                                <kbd className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-white/20 border-b-[3px] bg-white/10 px-2 font-sans text-sm font-semibold">{key}</kbd>
                            </span>
                        ))}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ShortcutGroup({ group }) {
    return (
        <section id={group.id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <header className="flex items-center gap-3 border-b border-line px-6 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <Icon name={group.icon} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-ink">{group.title}</h2>
                    <p className="text-xs text-muted">{group.description}</p>
                </div>
            </header>
            <ul className="divide-y divide-line">
                {group.items.map((item) => (
                    <li key={item.label} className="flex flex-col gap-3 px-6 py-3.5 transition hover:bg-subtle sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-ink">{item.label}</span>
                                {item.context && <span className="rounded-md bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-muted">{item.context}</span>}
                                {!item.available && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Bientot</span>}
                            </div>
                            {item.hint && <p className="mt-0.5 text-xs text-muted">{item.hint}</p>}
                        </div>
                        <div className={`shrink-0 ${item.available ? '' : 'opacity-60'}`}>
                            <KeyCombo keys={item.keys} />
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Tip({ children }) {
    return (
        <li className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
            <span>{children}</span>
        </li>
    );
}

const iconPaths = {
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
    bolt: <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />,
    cursor: <><path d="M4 4l7 17 2.5-7.5L21 11 4 4Z" /></>,
};

function Icon({ name, className = 'h-5 w-5' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {iconPaths[name]}
        </svg>
    );
}
