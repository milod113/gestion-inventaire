import { formatDate } from '@/Components/FormKit';
import PageHeader from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const number = new Intl.NumberFormat('fr-FR');
const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 });

const severities = {
    error: { label: 'Erreur', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
    warning: { label: 'A verifier', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
    info: { label: 'Information', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
};

// Field to highlight in the detail table for each check.
const highlight = {
    articles_sans_service: 'service',
    articles_sans_quantite: 'quantite',
    inventaire_doublon: 'inventaire',
    inventaire_manquant: 'inventaire',
    inventaire_non_numerique: 'inventaire',
    factures_sans_date: 'date',
    factures_montant_nul: 'montant',
    factures_sans_fournisseur: 'fournisseur',
    factures_sans_service: 'service',
};

export default function Index({ checks, selected, rows, totals, unknownServiceCodes }) {
    const { flash = {}, auth } = usePage().props;
    const permissions = auth.user.permissions || [];
    const current = checks.find((check) => check.key === selected);
    const errorCount = checks.filter((check) => check.severity === 'error').reduce((total, check) => total + check.count, 0);
    const warningCount = checks.filter((check) => check.severity !== 'error').reduce((total, check) => total + check.count, 0);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Pilotage"
                    title="Qualite des donnees"
                    description="Anomalies detectees dans les articles et les factures, notamment apres les imports d'archives."
                    actions={<>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="font-semibold tabular-nums text-ink">{number.format(errorCount)}</span>
                            <span className="text-muted">erreurs</span>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="font-semibold tabular-nums text-ink">{number.format(warningCount)}</span>
                            <span className="text-muted">a verifier</span>
                        </span>
                    </>}
                />
            }
        >
            <Head title="Qualite des donnees" />

            <div className="space-y-6 px-5 pb-14 pt-7 lg:px-10">
                {flash.success && (
                    <div className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-sm font-medium text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">{flash.success}</div>
                )}

                <div className="grid gap-6 xl:grid-cols-2">
                    <CheckGroup title="Articles" total={totals.articles} checks={checks.filter((check) => check.entity === 'article')} selected={selected} />
                    <CheckGroup title="Factures" total={totals.factures} checks={checks.filter((check) => check.entity === 'facture')} selected={selected} />
                </div>

                {current && (
                    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                        <header className="flex flex-col gap-3 border-b border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-semibold text-ink">{current.label}</h2>
                                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${severities[current.severity].badge}`}>{severities[current.severity].label}</span>
                                </div>
                                <p className="mt-0.5 text-sm text-muted">{current.description}</p>
                            </div>
                            <p className="shrink-0 text-sm text-muted"><span className="font-semibold tabular-nums text-ink">{number.format(current.count)}</span> {current.entity === 'article' ? 'articles' : 'factures'}</p>
                        </header>

                        {selected === 'articles_sans_service' && unknownServiceCodes.length > 0 && (
                            <ServiceCodes codes={unknownServiceCodes} canRelink={permissions.includes('articles.update')} canCreate={permissions.includes('services.create')} />
                        )}

                        {rows.data.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg>
                                </span>
                                <p className="mt-4 text-sm font-semibold text-ink">Aucune anomalie</p>
                                <p className="mt-1 text-sm text-muted">Ce controle ne signale aucune donnee a corriger.</p>
                            </div>
                        ) : current.entity === 'article' ? (
                            <ArticleTable rows={rows.data} field={highlight[selected]} canEdit={permissions.includes('articles.update')} />
                        ) : (
                            <FactureTable rows={rows.data} field={highlight[selected]} canEdit={permissions.includes('factures.update')} />
                        )}

                        {rows.last_page > 1 && (
                            <footer className="flex flex-col items-center justify-between gap-3 border-t border-line px-6 py-4 sm:flex-row">
                                <p className="text-xs text-muted">{rows.from} a {rows.to} sur {number.format(rows.total)}</p>
                                <div className="flex flex-wrap gap-1">
                                    {rows.links.map((link, index) => (
                                        <Link
                                            key={`${link.label}-${index}`}
                                            href={link.url || '#'}
                                            preserveScroll
                                            preserveState
                                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${link.active ? 'bg-brand-700 text-white dark:bg-brand-600' : link.url ? 'text-muted hover:bg-subtle hover:text-ink' : 'pointer-events-none text-muted/40'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </footer>
                        )}
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function CheckGroup({ title, total, checks, selected }) {
    const affected = checks.reduce((sum, check) => sum + check.count, 0);
    return (
        <section className="rounded-2xl border border-line bg-surface p-2 shadow-card">
            <header className="flex items-baseline justify-between px-4 pb-2 pt-3">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                <p className="text-xs text-muted">{number.format(total)} enregistrements · {number.format(affected)} signalements</p>
            </header>
            <div className="space-y-1">
                {checks.map((check) => {
                    const active = check.key === selected;
                    const share = total ? (check.count / total) * 100 : 0;
                    return (
                        <Link
                            key={check.key}
                            href={route('quality.index', { check: check.key })}
                            preserveScroll
                            preserveState
                            only={['selected', 'rows', 'unknownServiceCodes']}
                            className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition ${active ? 'bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30' : 'hover:bg-subtle'}`}
                        >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${check.count ? severities[check.severity].dot : 'bg-brand-500'}`} />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-ink">{check.label}</span>
                                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-subtle">
                                    <span className={`block h-full rounded-full ${check.count ? severities[check.severity].dot : ''}`} style={{ width: `${Math.max(check.count ? 1 : 0, Math.min(share, 100))}%` }} />
                                </span>
                            </span>
                            <span className="w-20 shrink-0 text-right">
                                <span className={`block text-sm font-semibold tabular-nums ${check.count ? 'text-ink' : 'text-brand-600 dark:text-brand-300'}`}>{check.count ? number.format(check.count) : 'OK'}</span>
                                {check.count > 0 && <span className="block text-[11px] text-muted">{share < 1 ? '<1' : Math.round(share)} %</span>}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function ServiceCodes({ codes, canRelink, canCreate }) {
    const [relinking, setRelinking] = useState(false);
    const linkable = codes.filter((code) => code.linkable).reduce((total, code) => total + code.total, 0);

    const relink = () => {
        router.post(route('quality.relink-services'), {}, {
            preserveScroll: true,
            onStart: () => setRelinking(true),
            onFinish: () => setRelinking(false),
        });
    };

    return (
        <div className="border-b border-line bg-subtle/50 px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">Codes service introuvables dans le referentiel</p>
                    <p className="text-xs text-muted">Creez les services manquants avec ces codes, puis reliez les articles automatiquement.</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {codes.map((code) => (
                            <span key={code.code ?? 'vide'} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${code.linkable ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200' : 'border-line bg-surface text-ink'}`}>
                                <span className="font-mono font-semibold">{code.code ?? 'vide'}</span>
                                <span className="text-muted">{number.format(code.total)}</span>
                                {code.linkable && <span className="font-semibold">· pret</span>}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    {canCreate && <Link href={route('services.create')} className="btn-secondary">Creer un service</Link>}
                    {canRelink && (
                        <button type="button" onClick={relink} disabled={relinking || linkable === 0} className="btn-primary" title={linkable === 0 ? 'Aucun code ne correspond encore a un service existant' : undefined}>
                            {relinking ? 'Rattachement...' : linkable ? `Relier ${number.format(linkable)} articles` : 'Relier automatiquement'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Cell({ children, flagged, mono = false, align = 'left' }) {
    const empty = children === null || children === undefined || children === '';
    return (
        <td className={`whitespace-nowrap px-4 py-3 ${align === 'right' ? 'text-right tabular-nums' : ''} ${mono ? 'font-mono text-xs' : ''}`}>
            {flagged ? (
                <span className="rounded-md bg-red-50 px-1.5 py-0.5 font-medium text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30">{empty ? 'manquant' : children}</span>
            ) : (
                <span className={empty ? 'text-muted/50' : 'text-ink'}>{empty ? '—' : children}</span>
            )}
        </td>
    );
}

function RowAction({ href, canEdit }) {
    return (
        <td className="whitespace-nowrap px-6 py-3 text-right">
            <Link href={href} className={canEdit ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-secondary px-3 py-1.5 text-xs'}>{canEdit ? 'Corriger' : 'Voir'}</Link>
        </td>
    );
}

function Head_({ children }) {
    return <th className="px-4 py-3 text-left text-xs font-medium text-muted first:pl-6">{children}</th>;
}

function ArticleTable({ rows, field, canEdit }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr>
                        <Head_>N° inventaire</Head_>
                        <Head_>Designation</Head_>
                        <Head_>Mvt</Head_>
                        <Head_>Quantite</Head_>
                        <Head_>Service</Head_>
                        <Head_>Date</Head_>
                        <th className="px-6 py-3"><span className="sr-only">Action</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((article) => {
                        const quantity = Number(article.quantite_entree) ? `+${number.format(article.quantite_entree)}` : Number(article.quantite_sortie) ? `−${number.format(article.quantite_sortie)}` : null;
                        return (
                            <tr key={article.id} className="transition hover:bg-subtle">
                                <td className="whitespace-nowrap py-3 pl-6 pr-4 font-mono text-xs">
                                    {field === 'inventaire'
                                        ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">{article.numero_inventaire || 'vide'}</span>
                                        : <span className="text-ink">{article.numero_inventaire || '—'}</span>}
                                </td>
                                <td className="max-w-xs truncate px-4 py-3 font-medium text-ink" title={article.description}>{article.description}</td>
                                <Cell mono>{article.mouvement}</Cell>
                                <Cell flagged={field === 'quantite'} align="right">{quantity}</Cell>
                                <Cell flagged={field === 'service'}>
                                    {article.service ? `${article.service.code} · ${article.service.name}` : field === 'service' ? `code ${article.service_code_source ?? '?'}` : null}
                                </Cell>
                                <Cell>{formatDate(article.date_mouvement?.slice(0, 10))}</Cell>
                                <RowAction href={canEdit ? route('articles.edit', article.id) : route('articles.show', article.id)} canEdit={canEdit} />
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function FactureTable({ rows, field, canEdit }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr>
                        <Head_>N° facture</Head_>
                        <Head_>Date</Head_>
                        <Head_>Fournisseur</Head_>
                        <Head_>Service</Head_>
                        <Head_>Imputation</Head_>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted">Montant</th>
                        <th className="px-6 py-3"><span className="sr-only">Action</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((facture) => (
                        <tr key={facture.id} className="transition hover:bg-subtle">
                            <td className="whitespace-nowrap py-3 pl-6 pr-4 font-mono text-xs font-semibold text-ink">{facture.numero_facture || '—'}</td>
                            <Cell flagged={field === 'date'}>{formatDate(facture.date_facture)}</Cell>
                            <Cell flagged={field === 'fournisseur'} mono>{facture.code_fournisseur}</Cell>
                            <Cell flagged={field === 'service'}>{facture.service ? facture.service.name : facture.service_reference}</Cell>
                            <Cell mono>{facture.imputation}</Cell>
                            <Cell flagged={field === 'montant'} align="right">{facture.montant === null ? null : currency.format(facture.montant)}</Cell>
                            <RowAction href={canEdit ? route('factures.edit', facture.id) : route('factures.show', facture.id)} canEdit={canEdit} />
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
