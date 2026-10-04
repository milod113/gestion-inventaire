import { KeyCombo } from '@/Components/Kbd';
import PageHeader from '@/Components/PageHeader';
import { shortcutKeys } from '@/shortcuts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

const number = new Intl.NumberFormat('fr-FR');
const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

const statCards = [
    { key: 'articles', label: 'Articles', detail: "Lignes d'inventaire", href: 'articles.index', icon: 'boxes' },
    { key: 'services', label: 'Services', detail: 'Unites referencees', href: 'services.index', icon: 'building' },
    { key: 'fournisseurs', label: 'Fournisseurs', detail: 'Partenaires enregistres', href: 'fournisseurs.index', icon: 'users' },
    { key: 'factures', label: 'Factures', detail: 'Engagements suivis', href: 'factures.index', icon: 'receipt' },
];

const quickActions = [
    { label: 'Ajouter un article', href: 'articles.create', icon: 'boxes', permission: 'articles.create' },
    { label: 'Saisir une facture', href: 'factures.create', icon: 'receipt', permission: 'factures.create' },
    { label: 'Ajouter un fournisseur', href: 'fournisseurs.create', icon: 'users', permission: 'fournisseurs.create' },
    { label: 'Ajouter un service', href: 'services.create', icon: 'building', permission: 'services.create' },
];

export default function Dashboard({ stats, recentFactures }) {
    const user = usePage().props.auth.user;
    const allowedActions = quickActions.filter((action) => user.permissions?.includes(action.permission));
    const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow={today}
                    title={`Bonjour, ${user.name.split(' ')[0]}`}
                    description="Voici l'etat actuel de l'inventaire et de la comptabilite."
                />
            }
        >
            <Head title="Tableau de bord" />

            <div className="space-y-6 px-5 pb-12 pt-7 lg:px-10">
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map((card) => (
                        <Link
                            key={card.key}
                            href={route(card.href)}
                            className="group rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-600"
                        >
                            <div className="flex items-start justify-between">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                                    <Icon name={card.icon} />
                                </span>
                                <svg className="h-4 w-4 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M8 7h9v9" /></svg>
                            </div>
                            <p className="mt-5 text-sm font-medium text-muted">{card.label}</p>
                            <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">{number.format(stats[card.key])}</p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="text-xs text-muted">{card.detail}</p>
                                {shortcutKeys(card.href) && <span className="opacity-0 transition group-hover:opacity-100"><KeyCombo keys={shortcutKeys(card.href)} size="sm" /></span>}
                            </div>
                        </Link>
                    ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-3">
                    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card xl:col-span-2">
                        <div className="flex items-center justify-between border-b border-line px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-ink">Dernieres factures</h2>
                                <p className="text-xs text-muted">Les 5 derniers engagements enregistres</p>
                            </div>
                            <Link href={route('factures.index')} className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">Tout voir</Link>
                        </div>
                        {recentFactures.length === 0 ? (
                            <p className="px-6 py-12 text-center text-sm text-muted">Aucune facture enregistree pour le moment.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-medium text-muted">
                                            <th className="px-6 py-3 font-medium">Facture</th>
                                            <th className="px-6 py-3 font-medium">Service</th>
                                            <th className="px-6 py-3 font-medium">Fournisseur</th>
                                            <th className="px-6 py-3 text-right font-medium">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {recentFactures.map((facture) => (
                                            <tr key={facture.id} className="transition hover:bg-subtle">
                                                <td className="whitespace-nowrap px-6 py-3.5">
                                                    <Link href={route('factures.show', facture.id)} className="font-semibold text-ink hover:text-brand-600">
                                                        N° {facture.numero_facture || '—'}
                                                    </Link>
                                                    <p className="text-xs text-muted">{facture.date_facture || 'Date inconnue'}</p>
                                                </td>
                                                <td className="max-w-[16rem] truncate px-6 py-3.5 text-ink">{facture.service?.name || '—'}</td>
                                                <td className="whitespace-nowrap px-6 py-3.5">
                                                    <span className="rounded-md bg-subtle px-2 py-1 font-mono text-xs text-muted">{facture.code_fournisseur || '—'}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-3.5 text-right font-semibold text-ink">{currency.format(facture.montant || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="relative overflow-hidden rounded-2xl bg-brand-800 p-6 text-white shadow-card">
                            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/20 blur-2xl" />
                            <p className="relative text-sm font-medium text-brand-100/80">Montant total facture</p>
                            <p className="relative mt-2 text-3xl font-semibold tracking-tight tabular-nums">{compactCurrency.format(stats.montant_factures)} <span className="text-lg text-brand-100/70">DZD</span></p>
                            <p className="relative mt-1 text-xs text-brand-100/70">{currency.format(stats.montant_factures)} sur {number.format(stats.factures)} factures</p>
                        </div>

                        {allowedActions.length > 0 && <div className="rounded-2xl border border-line bg-surface p-2 shadow-card">
                            <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted">Actions rapides</p>
                            {allowedActions.map((action) => (
                                <Link key={action.href} href={route(action.href)} className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition hover:bg-subtle">
                                    <span className="text-muted group-hover:text-brand-600 dark:group-hover:text-brand-300"><Icon name={action.icon} /></span>
                                    <span className="flex-1">{action.label}</span>
                                    {shortcutKeys(action.href) && <span className="hidden opacity-70 transition group-hover:opacity-100 sm:inline-flex"><KeyCombo keys={shortcutKeys(action.href)} size="sm" /></span>}
                                    <svg className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
                                </Link>
                            ))}
                        </div>}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}

const iconPaths = {
    building: <><path d="M4 21h16M6 21V5l6-3 6 3v16M9 9h.01M9 13h.01M15 9h.01M15 13h.01" /><path d="M10 21v-4h4v4" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a5 5 0 0 1 10 0v2M16 11a3 3 0 1 0-1.7-5.5M17 16a5 5 0 0 1 4 4v1" /></>,
    boxes: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
};

function Icon({ name }) {
    return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {iconPaths[name]}
        </svg>
    );
}
