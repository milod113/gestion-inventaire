import PageHeader, { HeaderStat, PlusIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SourceBadge, { FlashError, SourceSelect } from '@/Components/SourceBadge';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';

export default function Index({ factures, filters, serviceReferences, summary }) {
    const { flash = {} } = usePage().props;
    const { data, setData, get, processing } = useForm({
        search: filters.search || '', service_reference: filters.service_reference || '',
        date_from: filters.date_from || '', date_to: filters.date_to || '', source: filters.source || '',
        sort: filters.sort || 'date', direction: filters.direction || 'desc',
    });
    const submit = (event) => { event.preventDefault(); get(route('factures.index'), { preserveState: true, replace: true }); };
    const reset = () => router.get(route('factures.index'), {}, { preserveState: true, replace: true });
    const destroy = (facture) => { if (window.confirm('Supprimer cette facture ?')) router.delete(route('factures.destroy', facture.id)); };

    return (
        <AuthenticatedLayout header={<Header total={summary.count} />}>
            <Head title="Factures" />
            <div className="px-5 pb-14 pt-7 lg:px-10">
                {flash.success && <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">{flash.success}</div>}
                <FlashError message={flash.error} />

                <section className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-3xl border border-[#dce5dd] bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#819087]">Resultats filtres</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><p className="text-3xl font-bold tracking-tight text-[#1b3328]">{summary.count} <span className="text-base font-medium text-[#718177]">factures</span></p><p className="text-sm font-bold text-[#1b503a]">{formatMoney(summary.amount)}</p></div></div>
                    <div className="rounded-3xl bg-[#e5ad45] p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#73511c]">Periode active</p><p className="mt-3 text-lg font-bold text-[#173126]">{filters.date_from || filters.date_to ? `${formatDate(filters.date_from) || 'Debut'} - ${formatDate(filters.date_to) || 'Aujourd hui'}` : 'Toutes les periodes'}</p></div>
                </section>

                <section className="mb-6 rounded-3xl border border-[#dce5dd] bg-white p-5 shadow-sm sm:p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#718177]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg><input type="search" value={data.search} onChange={(event) => setData('search', event.target.value)} placeholder="Rechercher un bon, une facture ou un service..." className="w-full rounded-xl border-[#d5e1d6] bg-[#fbfdfb] py-3 pl-11 pr-4 text-sm focus:border-[#2f7654] focus:ring-[#2f7654]" /></div><button type="submit" disabled={processing} className="rounded-xl bg-[#1b503a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#12352a] disabled:opacity-60">Appliquer les filtres</button><button type="button" onClick={reset} className="rounded-xl px-4 py-3 text-sm font-semibold text-[#5c7163] transition hover:bg-[#edf4ee]">Reinitialiser</button></div>
                        <div className="grid gap-4 border-t border-[#e7ede7] pt-5 sm:grid-cols-2 lg:grid-cols-6"><Filter label="Origine"><SourceSelect value={data.source} onChange={(value) => setData('source', value)} className={selectClass} /></Filter><Filter label="Reference service"><select value={data.service_reference} onChange={(event) => setData('service_reference', event.target.value)} className={selectClass}><option value="">Toutes les references</option>{serviceReferences.map((reference) => <option key={reference} value={reference}>{reference}</option>)}</select></Filter><Filter label="Du"><input type="date" value={data.date_from} onChange={(event) => setData('date_from', event.target.value)} className={inputClass} /></Filter><Filter label="Au"><input type="date" value={data.date_to} onChange={(event) => setData('date_to', event.target.value)} className={inputClass} /></Filter><Filter label="Trier par"><select value={data.sort} onChange={(event) => setData('sort', event.target.value)} className={selectClass}><option value="date">Date facture</option><option value="amount">Montant</option><option value="number">Numero facture</option></select></Filter><Filter label="Ordre"><select value={data.direction} onChange={(event) => setData('direction', event.target.value)} className={selectClass}><option value="desc">Decroissant</option><option value="asc">Croissant</option></select></Filter></div>
                    </form>
                </section>

                <section className="overflow-hidden rounded-3xl border border-[#dce5dd] bg-white shadow-xl shadow-[#173126]/5">
                    {factures.data.length === 0 ? <EmptyState /> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-[#e7ede7]"><thead className="bg-[#f7faf7]"><tr><Th>Facture</Th><Th>Reference source</Th><Th>Bon / journal</Th><Th>Montant</Th><Th align="right">Actions</Th></tr></thead><tbody className="divide-y divide-[#edf1ed]">{factures.data.map((facture) => <tr key={facture.id} className="transition hover:bg-[#f4f9f4]"><td className="px-6 py-4"><p className="text-sm font-bold text-[#243d30]">{facture.numero_facture || '-'}<SourceBadge source={facture.source} /></p><p className="mt-1 text-xs text-[#718177]">{formatDate(facture.date_facture) || 'Sans date'}</p></td><td className="px-6 py-4 text-sm font-semibold text-[#243d30]">{facture.service_reference || '-'}</td><td className="px-6 py-4 text-sm text-[#4e6457]"><p>{facture.n_bon || '-'}</p><p className="mt-1 text-xs text-[#718177]">Journal: {facture.n_journal || '-'}</p></td><td className="px-6 py-4 text-sm font-bold text-[#1b503a]">{formatMoney(facture.montant)}</td><td className="whitespace-nowrap px-6 py-4 text-right"><div className="flex justify-end gap-2"><Link href={route('factures.show', facture.id)} className="rounded-lg bg-[#eef2f9] px-3 py-2 text-sm font-semibold text-[#36558a] hover:bg-[#dfe8f7]">Voir</Link>{facture.source !== 'import' && <><Link href={route('factures.edit', facture.id)} className="rounded-lg bg-[#e9f3ec] px-3 py-2 text-sm font-semibold text-[#1b503a] hover:bg-[#d8eadd]">Modifier</Link><button type="button" onClick={() => destroy(facture)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Supprimer</button></>}</div></td></tr>)}</tbody></table></div>}
                </section>
                <Pagination factures={factures} />
            </div>
        </AuthenticatedLayout>
    );
}

const inputClass = 'mt-2 block w-full rounded-xl border-[#d5e1d6] bg-[#fbfdfb] px-3 py-2.5 text-sm text-[#294337] focus:border-[#2f7654] focus:ring-[#2f7654]';
const selectClass = `${inputClass} form-select`;
function Header({ total }) { return <PageHeader eyebrow="Comptabilite" title="Factures" description="Recherche, filtrage et suivi des engagements." actions={<><HeaderStat value={total} label="resultats" /><Link href={route('factures.create')} className="btn-primary"><PlusIcon />Ajouter une facture</Link></>} />; }
function Filter({ label, children }) { return <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#718177]">{label}{children}</label>; }
function Th({ children, align = 'left' }) { return <th className={`px-6 py-4 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-bold uppercase tracking-[0.13em] text-[#718177]`}>{children}</th>; }
function EmptyState() { return <div className="px-6 py-20 text-center"><h2 className="text-lg font-bold text-[#1b3328]">Aucune facture trouvee</h2><p className="mt-2 text-sm text-[#718177]">Modifiez vos filtres ou ajoutez une nouvelle facture.</p><Link href={route('factures.create')} className="mt-6 inline-block rounded-xl bg-[#1b503a] px-5 py-3 text-sm font-bold text-white">Ajouter une facture</Link></div>; }
function Pagination({ factures }) { if (factures.last_page <= 1) return null; return <div className="mt-6 flex flex-col justify-between gap-4 text-sm text-[#718177] sm:flex-row sm:items-center"><p>Affichage de {factures.from} a {factures.to} sur {factures.total} factures</p><div className="flex gap-2">{factures.links.map((link, index) => <Link key={`${link.label}-${index}`} href={link.url || '#'} preserveScroll className={`rounded-xl px-3 py-2 font-semibold ${link.active ? 'bg-[#1b503a] text-white' : link.url ? 'bg-white text-[#31513d] shadow-sm ring-1 ring-[#dce5dd]' : 'cursor-not-allowed bg-[#edf1ed] text-[#a1aaa3]'}`} dangerouslySetInnerHTML={{ __html: link.label }} />)}</div></div>; }
function formatDate(value) { if (!value) return ''; const [year, month, day] = value.split('-'); return day && month && year ? `${day}/${month}/${year}` : value; }
function formatMoney(value) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', minimumFractionDigits: 2 }).format(value || 0); }
