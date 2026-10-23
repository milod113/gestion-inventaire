import AuditInfo from '@/Components/AuditInfo';
import { RecordReminders } from '@/Components/Reminders';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const money = (value) => value === null || value === undefined || value === '' ? 'Non renseigne' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD' }).format(value);

export default function Show({ facture, details, historique = [], serviceNames = {}, rappels = [] }) {
    const { auth, flash = {} } = usePage().props;
    const [tab, setTab] = useState(() => (typeof window !== 'undefined' && window.location.hash === '#historique' ? 'historique' : 'facture'));
    const amount = facture.montant ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', minimumFractionDigits: 2 }).format(facture.montant) : 'Montant indisponible';
    const service = facture.service ? `${facture.service.code} - ${facture.service.name}` : facture.service_reference || 'Service non associe';
    const can = (permission) => auth.user.permissions.includes(permission);
    const chooseTab = (value) => { setTab(value); window.history.replaceState(null, '', value === 'historique' ? '#historique' : window.location.pathname + window.location.search); };

    return (
        <AuthenticatedLayout header={<Header facture={facture} canAddDetail={can('articles.view') && can('articles.create')} canCorrect={can('factures.update') && can('factures.correct_import')} />}>
            <Head title={`Facture ${facture.numero_facture || ''}`} />

            <div className="px-5 pb-14 pt-7 lg:px-10">
                <div className="mx-auto max-w-6xl space-y-6">
                    {flash.success && <p className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{flash.success}</p>}
                    {flash.error && <p className="rounded-xl bg-red-50 p-4 text-red-800">{flash.error}</p>}
                    <AuditInfo record={facture} />
                    <RecordReminders rappels={rappels} fiche={{ type: 'facture', id: facture.id, label: `Facture ${facture.numero_facture || `#${facture.id}`}` }} />
                    <section className="overflow-hidden rounded-[2rem] bg-[#163d2e] text-white shadow-2xl shadow-[#12352a]/15">
                        <div className="relative grid gap-8 px-7 py-8 sm:px-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:py-10">
                            <div className="absolute -left-20 -top-28 h-72 w-72 rounded-full bg-[#2d7454]/60 blur-3xl" />
                            <div className="absolute -bottom-28 right-1/4 h-56 w-56 rounded-full border-[28px] border-[#e5ad45]/15" />
                            <div className="relative">
                                <div className="flex flex-wrap items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#e5ad45]" /><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/65">Facture</p>{facture.corrigee_at && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-900">Corrigée le {formatDateTime(facture.corrigee_at)}</span>}</div>
                                <h1 className="mt-5 break-words text-4xl font-bold tracking-tight sm:text-5xl">{facture.numero_facture || 'Sans numero'}</h1>
                                <div className="mt-5 flex flex-wrap gap-3 text-sm"><Pill label="N. bon" value={facture.n_bon} /><Pill label="Date facture" value={formatDate(facture.date_facture)} /></div>
                            </div>
                            <div className="relative rounded-3xl border border-white/10 bg-white/[0.08] p-6 backdrop-blur-sm">
                                <p className="text-sm font-medium text-emerald-100/70">Montant engage</p>
                                <p className="mt-3 break-words text-3xl font-bold tracking-tight text-[#f5c86c] sm:text-4xl">{amount}</p>
                                <div className="mt-6 border-t border-white/10 pt-4"><p className="text-xs uppercase tracking-[0.14em] text-emerald-100/55">Mandat</p><p className="mt-1 text-sm font-semibold">{facture.n_mandat || 'Non renseigne'}</p></div>
                            </div>
                        </div>
                    </section>

                    <div className="flex gap-1 rounded-2xl border border-[#dce5dd] bg-white p-1 shadow-sm sm:w-fit" role="tablist" aria-label="Sections de la facture">
                        <TabButton active={tab === 'facture'} onClick={() => chooseTab('facture')}>Facture</TabButton>
                        <TabButton active={tab === 'historique'} onClick={() => chooseTab('historique')}>Historique<span className="ml-2 rounded-full bg-[#edf1ed] px-2 py-0.5 text-xs text-[#5a6e60]">{historique.length}</span></TabButton>
                    </div>

                    {tab === 'historique' ? <History facture={facture} historique={historique} serviceNames={serviceNames} canViewArticles={can('articles.view')} /> : <>

                    <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
                            <SectionTitle eyebrow={`${details.total} article(s)`} title="Details de la facture" />
                            {auth.user.permissions.includes('articles.view') && auth.user.permissions.includes('articles.create') && <Link href={route('factures.details.create', facture.id)} className="btn-primary">Ajouter un detail de facture</Link>}
                        </div>
                        {details.data.length === 0 ? <p className="p-6 text-muted">Aucun article associe a cette facture.</p> : <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-subtle"><tr>{['Article', 'Inventaire', 'Mouvement', 'Entree', 'Sortie', 'Prix unitaire', 'Actions'].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
                                <tbody>{details.data.map(({ id, article }) => <tr key={id} className="border-t border-line">
                                    <td className="p-4 font-semibold">{article.description}</td>
                                    <td className="p-4">{article.numero_inventaire || '-'}</td>
                                    <td className="p-4">{article.mouvement || '-'}</td>
                                    <td className="p-4">{article.quantite_entree ?? '-'}</td>
                                    <td className="p-4">{article.quantite_sortie ?? '-'}</td>
                                    <td className="p-4 whitespace-nowrap">{money(article.prix_unitaire)}</td>
                                    <td className="p-4"><div className="flex gap-3">
                                        {auth.user.permissions.includes('articles.view') && <Link href={route('articles.show', article.id)} className="text-brand-600">Voir</Link>}
                                        {auth.user.permissions.includes('articles.view') && auth.user.permissions.includes('articles.update') && <Link href={route('articles.edit', article.id)} className="text-brand-600">Modifier</Link>}
                                    </div></td>
                                </tr>)}</tbody>
                            </table>
                        </div>}
                        {details.last_page > 1 && <div className="flex flex-wrap gap-2 p-4">{details.links.map((link, index) => link.url ? <Link key={index} href={link.url} className={`rounded-lg px-3 py-2 ${link.active ? 'bg-brand-600 text-white' : 'bg-subtle'}`} dangerouslySetInnerHTML={{ __html: link.label }} /> : <span key={index} className="px-3 py-2 text-muted" dangerouslySetInnerHTML={{ __html: link.label }} />)}</div>}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-[1fr_1.65fr]">
                        <div className="rounded-[2rem] border border-[#dce5dd] bg-white p-6 shadow-xl shadow-[#173126]/5 sm:p-8">
                            <SectionTitle eyebrow="Affectation" title="Service concerne" />
                            <div className="mt-7 rounded-2xl bg-[#edf6ef] p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b503a] text-sm font-bold text-white">{facture.service?.code || '--'}</div><p className="mt-4 break-words text-base font-bold leading-6 text-[#1b3328]">{service}</p></div>
                            <div className="mt-5 border-t border-[#e7ede7] pt-5"><DataLine label="Reference source" value={facture.service_reference} /><DataLine label="Imputation" value={facture.imputation} /></div>
                        </div>

                        <div className="overflow-hidden rounded-[2rem] border border-[#dce5dd] bg-white shadow-xl shadow-[#173126]/5">
                            <div className="border-b border-[#e7ede7] bg-[#f7faf7] px-6 py-5 sm:px-8"><SectionTitle eyebrow="Pieces comptables" title="Informations de reference" /></div>
                            <div className="grid gap-x-10 gap-y-6 p-6 sm:grid-cols-2 sm:p-8">
                                <DataLine label="Numero de bon" value={facture.n_bon} />
                                <DataLine label="Numero journal" value={facture.n_journal} />
                                <DataLine label="Fournisseur" value={facture.fournisseur ? <>{facture.fournisseur.code} · {can('fournisseurs.view') ? <Link href={route('fournisseurs.show', facture.fournisseur.id)} className="text-brand-600 hover:underline">{facture.fournisseur.appellation}</Link> : facture.fournisseur.appellation}</> : facture.code_fournisseur} />
                                <DataLine label="Numero inventaire" value={facture.n_inventaire} />
                                <DataLine label="CFAC" value={facture.cfac} />
                                <DataLine label="Numero mandat" value={facture.n_mandat} />
                            </div>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[2rem] border border-[#dce5dd] bg-white shadow-xl shadow-[#173126]/5">
                        <div className="flex flex-col gap-3 border-b border-[#e7ede7] bg-[#f7faf7] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><SectionTitle eyebrow="Controle import" title="Dates et correction DBF" /><span className="w-fit rounded-full bg-[#fff2d8] px-3 py-1 text-xs font-bold text-[#9a6416]">Valeurs source conservees</span></div>
                        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
                            <DateCard label="Date de facture" corrected={facture.date_facture} source={facture.date_facture_source} />
                            <DateCard label="Date de mandat" corrected={facture.date_mandat} source={facture.date_mandat_source} />
                        </div>
                    </section>
                    </>}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Header({ facture, canAddDetail, canCorrect }) {
    const editButton = 'rounded-xl bg-[#e5ad45] px-4 py-2.5 text-sm font-bold text-[#173126] shadow-sm transition hover:bg-[#f3c361]';
    return <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-[#718177]">Comptabilite / Factures</p><p className="mt-1 text-xl font-bold text-[#173126]">Consultation de facture</p></div><div className="flex flex-wrap gap-3">{canAddDetail && <Link href={route('factures.details.create', facture.id)} className="btn-primary">Ajouter un detail</Link>}<Link href={route('factures.index')} className="rounded-xl border border-[#d5e1d6] bg-white px-4 py-2.5 text-sm font-semibold text-[#365246] shadow-sm transition hover:bg-[#f2f7f2]">Retour</Link>{facture.source !== 'import' ? <Link href={route('factures.edit', facture.id)} className={editButton}>Modifier</Link> : canCorrect ? <Link href={route('factures.edit', facture.id)} className={editButton}>Corriger</Link> : <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">Lecture seule</span>}</div></div>;
}

const FIELD_LABELS = {
    service_id: 'Service', n_bon: 'N° bon', service_reference: 'Reference service', imputation: 'Imputation',
    n_journal: 'N° journal', numero_facture: 'N° facture', date_facture: 'Date facture', montant: 'Montant',
    code_fournisseur: 'Code fournisseur', n_inventaire: 'N° inventaire', cfac: 'CFAC', n_mandat: 'N° mandat',
    date_mandat: 'Date mandat', source: 'Origine',
};
const EVENTS = {
    created: ['Création', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
    updated: ['Modification', 'bg-blue-50 text-blue-800 border-blue-200'],
    correction: ['Correction', 'bg-sky-50 text-sky-800 border-sky-200'],
    article_added: ['Article ajouté', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
    article_removed: ['Article retiré', 'bg-red-50 text-red-800 border-red-200'],
    deleted: ['Suppression', 'bg-red-50 text-red-800 border-red-200'],
};

function History({ facture, historique, serviceNames, canViewArticles }) {
    const origine = facture.valeurs_origine || {};
    const format = (field, value) => {
        if (value === null || value === undefined || value === '') return 'vide';
        if (field === 'service_id') return serviceNames[value] || `#${value}`;
        if (field === 'montant') return money(value);
        if (field.startsWith('date_')) return formatDate(value);
        return String(value);
    };

    return <div className="space-y-6">
        {Object.keys(origine).length > 0 && <section className="overflow-hidden rounded-[2rem] border border-sky-200 bg-white shadow-xl shadow-[#173126]/5">
            <div className="border-b border-sky-100 bg-sky-50 px-6 py-5 sm:px-8"><SectionTitle eyebrow="Correction" title="Valeurs d'origine conservées" /></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead className="bg-subtle"><tr><th className="p-4">Champ</th><th className="p-4">Valeur d'origine</th><th className="p-4">Valeur actuelle</th></tr></thead>
                <tbody>{Object.entries(origine).map(([field, value]) => <tr key={field} className="border-t border-line">
                    <td className="p-4 font-semibold">{FIELD_LABELS[field] || field}</td>
                    <td className="p-4 text-[#5a6e60]">{format(field, value)}</td>
                    <td className="p-4 font-semibold text-[#1b503a]">{format(field, facture[field])}</td>
                </tr>)}</tbody>
            </table></div>
        </section>}

        <section className="overflow-hidden rounded-[2rem] border border-[#dce5dd] bg-white shadow-xl shadow-[#173126]/5">
            <div className="border-b border-[#e7ede7] bg-[#f7faf7] px-6 py-5 sm:px-8"><SectionTitle eyebrow="Traçabilité" title="Historique des modifications" /></div>
            <ol className="divide-y divide-[#edf1ed]">
                {historique.map((log) => <HistoryEntry key={log.id} log={log} format={format} canViewArticles={canViewArticles} />)}
                                {historique.length === 0 && <li className="px-6 py-10 text-center text-sm text-[#718177]">Aucune modification enregistrée.</li>}
            </ol>
        </section>
    </div>;
}

function HistoryEntry({ log, format, canViewArticles }) {
    const kind = log.event === 'updated' && log.motif ? 'correction' : log.event;
    const [label, tone] = EVENTS[kind] || [log.event, 'bg-slate-50 text-slate-700 border-slate-200'];
    const isArticle = log.event === 'article_added' || log.event === 'article_removed';
    const article = isArticle ? (log.new_values || log.old_values || {}) : null;
    const fields = isArticle ? [] : Array.from(new Set([...Object.keys(log.old_values || {}), ...Object.keys(log.new_values || {})]));

    return <li className="px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}>{label}</span>
            <p className="text-sm font-semibold text-[#243d30]">{log.user_name || 'Système'}</p>
            <p className="text-xs text-[#718177]">{formatDateTime(log.created_at)}</p>
        </div>
        {log.motif && <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm text-sky-900"><span className="font-bold">Motif : </span>{log.motif}</p>}
        {isArticle && <p className="mt-3 text-sm text-[#294337]">
            {canViewArticles && article.article_id ? <Link href={route('articles.show', article.article_id)} className="font-semibold text-brand-600">{article.article || `Article #${article.article_id}`}</Link> : <span className="font-semibold">{article.article || `Article #${article.article_id}`}</span>}
            {article.numero_inventaire && <span className="ml-2 font-mono text-xs text-[#718177]">Inv. {article.numero_inventaire}</span>}
        </p>}
        {fields.length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{fields.map((field) => <li key={field} className="flex flex-wrap gap-x-2">
            <span className="font-semibold text-[#294337]">{FIELD_LABELS[field] || field} :</span>
            {log.event === 'updated' && <><span className="text-red-700 line-through">{format(field, log.old_values?.[field])}</span><span className="text-[#819087]">→</span></>}
            <span className={log.event === 'deleted' ? 'text-red-700' : 'text-emerald-800'}>{format(field, (log.event === 'deleted' ? log.old_values : log.new_values)?.[field])}</span>
        </li>)}</ul>}
    </li>;
}

function TabButton({ active, onClick, children }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex flex-1 items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold transition sm:flex-none ${active ? 'bg-[#1b503a] text-white shadow-sm' : 'text-[#5c7163] hover:bg-[#edf4ee]'}`}>{children}</button>; }
function formatDateTime(value) { return value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-'; }

function SectionTitle({ eyebrow, title }) { return <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#819087]">{eyebrow}</p><h2 className="mt-1 text-lg font-bold tracking-tight text-[#1b3328]">{title}</h2></div>; }
function Pill({ label, value }) { return <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-emerald-50"><span className="text-emerald-100/65">{label}: </span>{value || '-'}</span>; }
function DataLine({ label, value }) { return <div className="mb-5 last:mb-0"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#839187]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#294337]">{value || '-'}</p></div>; }
function DateCard({ label, corrected, source }) { return <div className="rounded-2xl border border-[#dce5dd] bg-[#fbfdfb] p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718177]">{label}</p><p className="mt-3 text-xl font-bold text-[#1b503a]">{formatDate(corrected)}</p><div className="mt-4 border-t border-[#e4ece5] pt-3"><p className="text-xs text-[#819087]">Valeur dans le fichier DBF</p><p className="mt-1 font-mono text-sm font-semibold text-[#5a6e60]">{source || '-'}</p></div></div>; }
function formatDate(value) { if (!value) return '-'; const [year, month, day] = value.split('-'); return day && month && year ? `${day}/${month}/${year}` : value; }
