import PageHeader, { HeaderStat, PlusIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FlashError } from '@/Components/SourceBadge';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';

export default function Index({ services, filters }) {
    const { flash = {} } = usePage().props;
    const { data, setData, get, processing } = useForm({
        search: filters.search || '',
    });

    const search = (event) => {
        event.preventDefault();
        get(route('services.index'), {
            preserveState: true,
            replace: true,
        });
    };

    const clearSearch = () => {
        setData({ search: '', source: '' });
        router.get(route('services.index'), {}, { preserveState: true, replace: true });
    };

    const destroy = (service) => {
        if (window.confirm(`Supprimer le service "${service.name}" ?`)) {
            router.delete(route('services.destroy', service.id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Referentiel"
                    title="Services"
                    description="Gerez l'ensemble des services de l'hopital"
                    actions={<>
                        <HeaderStat value={services.total} label="services" />
                        <Link href={route('services.create')} className="btn-primary"><PlusIcon />Ajouter un service</Link>
                    </>}
                />
            }
        >
            <Head title="Services" />

            <div className="px-5 pb-12 pt-7 lg:px-10">
                {flash.success && (
                    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-sm">
                        <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z" clipRule="evenodd" /></svg>
                        {flash.success}
                    </div>
                )}

                <FlashError message={flash.error} />

                <div className="mb-6 rounded-2xl border border-[#eadfd7] bg-white p-4 shadow-sm sm:p-5">
                    <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#807872]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
                            <input
                                type="search"
                                value={data.search}
                                onChange={(event) => setData('search', event.target.value)}
                                placeholder="Rechercher par code ou nom du service..."
                                className="w-full rounded-xl border-[#e7d9cf] bg-[#fefcfa] py-3 pl-11 pr-4 text-sm text-[#382a21] placeholder:text-[#9a908a] focus:border-[#ea580c] focus:ring-[#ea580c]"
                            />
                        </div>
                        <button type="submit" disabled={processing} className="rounded-xl bg-[#c2410c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#7c2d12] disabled:opacity-60">Rechercher</button>
                        {filters.search &&<button type="button" onClick={clearSearch} className="rounded-xl px-4 py-3 text-sm font-semibold text-[#70655d] transition hover:bg-[#fff7ed]">Effacer</button>}
                    </form>
                </div>

                <div className="overflow-hidden rounded-3xl border border-[#eadfd7] bg-white shadow-xl shadow-[#431407]/5">
                    {services.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-20 text-center">
                            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600"><svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16v12H4zM8 8V5h8v3" /></svg></div>
                            <h2 className="mt-5 text-lg font-bold text-[#32251c]">Aucun service</h2>
                            <p className="mt-1 text-sm text-[#807872]">Commencez par ajouter un service a l'hopital.</p>
                            <Link href={route('services.create')} className="mt-6 rounded-xl bg-[#c2410c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#7c2d12]">Ajouter un service</Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#f0e9e4]">
                                <thead className="bg-[#fbf8f6]"><tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.13em] text-[#807872]">Code</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.13em] text-[#807872]">Service</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.13em] text-[#807872]">Articles</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.13em] text-[#807872]">Factures</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.13em] text-[#807872]">Actions</th>
                                </tr></thead>
                                <tbody className="divide-y divide-[#f3eeeb]">
                                    {services.data.map((service) => (
                                        <tr key={service.id} className="transition hover:bg-[#fff7ed]">
                                            <td className="px-6 py-4"><span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">{service.code}</span></td>
                                            <td className="px-6 py-4 text-sm font-semibold text-[#3c2e25]">{service.name}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-[#c2410c]">{service.articles_count}</td>
                                            <td className="px-6 py-4 text-right text-sm font-semibold text-[#756a63]">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(service.factures_sum_montant || 0)}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right"><div className="flex justify-end gap-2">
                                                <Link href={route('services.show', service.id)} className="inline-flex items-center rounded-lg bg-[#c2410c] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#7c2d12]">Stats</Link>
                                                <Link href={route('services.edit', service.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffedd5] px-3 py-2 text-sm font-semibold text-[#c2410c] transition hover:bg-[#fed7aa]">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m16.9 3.5 3.6 3.6M4 20l4.4-1.2L19.5 7.8a2.6 2.6 0 0 0-3.7-3.6L4.8 15.2 4 20Z" /></svg><span className="hidden sm:inline">Modifier</span>
                                                </Link>
                                                <button type="button" onClick={() => destroy(service)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16m-10 4v5m4-5v5M6 7l1 13h10l1-13M9 7V4h6v3" /></svg><span className="hidden sm:inline">Supprimer</span>
                                                </button>
                                            </div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {services.last_page > 1 && (
                    <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <p className="text-sm text-[#807872]">Affichage de {services.from} a {services.to} sur {services.total} services</p>
                        <div className="flex items-center gap-2">
                            {services.links.map((link, index) => (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${link.active ? 'bg-[#c2410c] text-white' : link.url ? 'bg-white text-[#4f3e33] shadow-sm ring-1 ring-[#eadfd7] hover:bg-[#fff7ed]' : 'cursor-not-allowed bg-[#f3eeeb] text-[#aaa5a1]'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
