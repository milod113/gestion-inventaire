import PageHeader from '@/Components/PageHeader';
import { BellIcon, daysUntil, EmptyState, openReminder, PlusIcon, ReminderItem } from '@/Components/Reminders';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

const TABS = [
    ['a_venir', 'A venir'],
    ['retard', 'En retard'],
    ['termines', 'Termines'],
];

const VIEWS = [
    ['moi', 'Pour moi', 'Ce que je dois faire'],
    ['assignes', 'Confies a des collegues', 'Ce que j ai demande'],
];

const EMPTY = {
    a_venir: ['Rien de prevu', 'Ajoutez un rappel pour ne rien oublier : une relance, une verification, un inventaire...'],
    retard: ['Aucun retard', 'Bravo, tous vos rappels sont a jour.'],
    termines: ['Aucun rappel termine', 'Les rappels que vous cochez apparaitront ici.'],
};

// "A venir" : regroupe par proximite de l'echeance.
function groupUpcoming(rappels) {
    const groups = [
        ["Aujourd'hui", (days) => days <= 0],
        ['Demain', (days) => days === 1],
        ['Cette semaine', (days) => days > 1 && days < 7],
        ['Plus tard', (days) => days >= 7],
    ];
    return groups
        .map(([label, test]) => ({ label, items: rappels.filter((rappel) => test(daysUntil(rappel.echeance))) }))
        .filter((group) => group.items.length > 0);
}

export default function Index({ rappels, onglet, vue, compteurs }) {
    const groups = onglet === 'a_venir' ? groupUpcoming(rappels) : [{ label: null, items: rappels }];
    const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow={today}
                    title="Mes rappels"
                    description="Les travaux a effectuer plus tard, pour vous ou pour vos collegues."
                    actions={<button type="button" onClick={() => openReminder()} className="btn-primary"><PlusIcon />Nouveau rappel</button>}
                />
            }
        >
            <Head title="Mes rappels" />

            <div className="px-5 pb-14 pt-7 lg:px-10">
                <div className="mx-auto max-w-4xl space-y-6">
                    <section className="grid gap-3 sm:grid-cols-3">
                        <Stat label="A venir" value={compteurs.a_venir} tone="brand" active={onglet === 'a_venir'} href={route('rappels.index', { vue, onglet: 'a_venir' })} />
                        <Stat label="En retard" value={compteurs.retard} tone="red" active={onglet === 'retard'} href={route('rappels.index', { vue, onglet: 'retard' })} />
                        <Stat label="Termines" value={compteurs.termines} tone="muted" active={onglet === 'termines'} href={route('rappels.index', { vue, onglet: 'termines' })} />
                    </section>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="inline-flex rounded-xl border border-line bg-surface p-1 shadow-card" role="tablist" aria-label="Vue">
                            {VIEWS.map(([value, label, hint]) => (
                                <Link key={value} href={route('rappels.index', { vue: value, onglet })} preserveScroll role="tab" aria-selected={vue === value} title={hint}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${vue === value ? 'bg-brand-600 text-white shadow-sm' : 'text-muted hover:text-ink'}`}>
                                    {label}
                                </Link>
                            ))}
                        </div>
                        <nav className="flex gap-1 overflow-x-auto" aria-label="Onglets">
                            {TABS.map(([value, label]) => (
                                <Link key={value} href={route('rappels.index', { vue, onglet: value })} preserveScroll aria-current={onglet === value ? 'page' : undefined}
                                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${onglet === value ? 'bg-subtle text-ink' : 'text-muted hover:text-ink'}`}>
                                    {label}
                                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${value === 'retard' && compteurs.retard ? 'bg-red-500 text-white' : 'bg-surface text-muted ring-1 ring-line'}`}>{compteurs[value]}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {rappels.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-line bg-surface">
                            <EmptyState
                                title={EMPTY[onglet][0]}
                                text={vue === 'assignes' && onglet === 'a_venir' ? 'Vous n avez confie aucun rappel en cours a un collegue.' : EMPTY[onglet][1]}
                                action={onglet !== 'termines' && <button type="button" onClick={() => openReminder()} className="btn-primary"><PlusIcon />Nouveau rappel</button>}
                            />
                        </div>
                    ) : (
                        <div className="space-y-7">
                            {groups.map((group) => (
                                <section key={group.label ?? 'all'}>
                                    {group.label && (
                                        <div className="mb-3 flex items-center gap-3">
                                            <h2 className={`text-xs font-semibold uppercase tracking-wider ${group.label === "Aujourd'hui" ? 'text-gold-500' : 'text-muted'}`}>{group.label}</h2>
                                            <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">{group.items.length}</span>
                                            <span className="h-px flex-1 bg-line" />
                                        </div>
                                    )}
                                    <div className="space-y-2.5">
                                        {group.items.map((rappel) => <ReminderItem key={rappel.id} rappel={rappel} />)}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Stat({ label, value, tone, active, href }) {
    const tones = {
        brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
        red: value ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-subtle text-muted',
        muted: 'bg-subtle text-muted',
    };
    return (
        <Link href={href} preserveScroll className={`group flex items-center gap-4 rounded-2xl border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-brand-300 ring-4 ring-brand-500/10 dark:border-brand-500/50' : 'border-line hover:border-brand-200'}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><BellIcon className="h-5 w-5" /></span>
            <span>
                <span className="block text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</span>
                <span className="block text-xs font-medium text-muted">{label}</span>
            </span>
        </Link>
    );
}
