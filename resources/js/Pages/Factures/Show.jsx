import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Show({ facture, details }) {
    const { auth, flash = {} } = usePage().props;
    const money = (value) => value === null || value === undefined ? 'Non renseigne' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD' }).format(value);
    const amount = facture.montant ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', minimumFractionDigits: 2 }).format(facture.montant) : 'Montant indisponible';
    const service = facture.service ? `${facture.service.code} - ${facture.service.name}` : facture.service_reference || 'Service non associe';

    return (
        <AuthenticatedLayout header={<Header facture={facture} canAddDetail={auth.user.permissions.includes('articles.view') && auth.user.permissions.includes('articles.create')} />}>
            <Head title={`Facture ${facture.numero_facture || ''}`} />

            <div className="px-5 pb-14 pt-7 lg:px-10">
                <div className="mx-auto max-w-6xl space-y-6">
                    {flash.success && <p className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{flash.success}</p>}
                    {flash.error && <p className="rounded-xl bg-red-50 p-4 text-red-800">{flash.error}</p>}
                    <section className="overflow-hidden rounded-[2rem] bg-[#163d2e] text-white shadow-2xl shadow-[#12352a]/15">
                        <div className="relative grid gap-8 px-7 py-8 sm:px-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:py-10">
                            <div className="absolute -left-20 -top-28 h-72 w-72 rounded-full bg-[#2d7454]/60 blur-3xl" />
                            <div className="absolute -bottom-28 right-1/4 h-56 w-56 rounded-full border-[28px] border-[#e5ad45]/15" />
                            <div className="relative">
                                <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#e5ad45]" /><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/65">Facture importee</p></div>
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
                                <DataLine label="Code fournisseur" value={facture.code_fournisseur} />
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
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Header({ facture, canAddDetail }) {
    return <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-[#718177]">Comptabilite / Factures</p><p className="mt-1 text-xl font-bold text-[#173126]">Consultation de facture</p></div><div className="flex flex-wrap gap-3">{canAddDetail && <Link href={route('factures.details.create', facture.id)} className="btn-primary">Ajouter un detail</Link>}<Link href={route('factures.index')} className="rounded-xl border border-[#d5e1d6] bg-white px-4 py-2.5 text-sm font-semibold text-[#365246] shadow-sm transition hover:bg-[#f2f7f2]">Retour</Link>{facture.source === 'import' ? <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">Importée · lecture seule</span> : <Link href={route('factures.edit', facture.id)} className="rounded-xl bg-[#e5ad45] px-4 py-2.5 text-sm font-bold text-[#173126] shadow-sm transition hover:bg-[#f3c361]">Modifier</Link>}</div></div>;
}

function SectionTitle({ eyebrow, title }) { return <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#819087]">{eyebrow}</p><h2 className="mt-1 text-lg font-bold tracking-tight text-[#1b3328]">{title}</h2></div>; }
function Pill({ label, value }) { return <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-emerald-50"><span className="text-emerald-100/65">{label}: </span>{value || '-'}</span>; }
function DataLine({ label, value }) { return <div className="mb-5 last:mb-0"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#839187]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#294337]">{value || '-'}</p></div>; }
function DateCard({ label, corrected, source }) { return <div className="rounded-2xl border border-[#dce5dd] bg-[#fbfdfb] p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718177]">{label}</p><p className="mt-3 text-xl font-bold text-[#1b503a]">{formatDate(corrected)}</p><div className="mt-4 border-t border-[#e4ece5] pt-3"><p className="text-xs text-[#819087]">Valeur dans le fichier DBF</p><p className="mt-1 font-mono text-sm font-semibold text-[#5a6e60]">{source || '-'}</p></div></div>; }
function formatDate(value) { if (!value) return '-'; const [year, month, day] = value.split('-'); return day && month && year ? `${day}/${month}/${year}` : value; }
