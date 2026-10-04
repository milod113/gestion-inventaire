import PageHeader, { HeaderStat, PlusIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
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
        setData('search', '');
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

                <div className="mb-6 rounded-2xl border border-[#dce5dd] bg-white p-4 shadow-sm sm:p-5">
                    <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#718177]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
                            <input
                                type="search"
                                value={data.search}
                                onChange={(event) => setData('search', event.target.value)}
                                placeholder="Rechercher par code ou nom du service..."
                                className="w-full rounded-xl border-[#d5e1d6] bg-[#fbfdfb] py-3 pl-11 pr-4 text-sm text-[#20392c] placeholder:text-[#8b998f] focus:border-[#2f7654] focus:ring-[#2f7654]"
                            />
                        </div>
                        <button type="submit" disabled={processing} className="rounded-xl bg-[#1b503a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#12352a] disabled:opacity-60">Rechercher</button>
                        {filters.search && <button type="button" onClick={clearSearch} className="rounded-xl px-4 py-3 text-sm font-semibold text-[#5c7163] transition hover:bg-[#edf4ee]">Effacer</button>}
                    </form>
                </div>

                <div className="overflow-hidden rounded-3xl border border-[#dce5dd] bg-white shadow-xl shadow-[#173126]/5">
                    {services.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-20 text-center">
                            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16v12H4zM8 8V5h8v3" /></svg></div>
                            <h2 className="mt-5 text-lg font-bold text-[#1b3328]">Aucun service</h2>
                            <p className="mt-1 text-sm text-[#718177]">Commencez par ajouter un service a l'hopital.</p>
                            <Link href={route('services.create')} className="mt-6 rounded-xl bg-[#1b503a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#12352a]">Ajouter un service</Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#e7ede7]">
                                <thead className="bg-[#f7faf7]"><tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.13em] text-[#718177]">Code</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.13em] text-[#718177]">Service</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.13em] text-[#718177]">Articles</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.13em] text-[#718177]">Factures</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.13em] text-[#718177]">Actions</th>
                                </tr></thead>
                                <tbody className="divide-y divide-[#edf1ed]">
                                    {services.data.map((service) => (
                                        <tr key={service.id} className="transition hover:bg-[#f4f9f4]">
                                            <td className="px-6 py-4"><span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{service.code}</span></td>
                                            <td className="px-6 py-4 text-sm font-semibold text-[#243d30]">{service.name}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-[#1b503a]">{service.articles_count}</td>
                                            <td className="px-6 py-4 text-right text-sm font-semibold text-[#62766a]">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(service.factures_sum_montant || 0)}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right"><div className="flex justify-end gap-2">
                                                <Link href={route('services.show', service.id)} className="inline-flex items-center rounded-lg bg-[#1b503a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#12352a]">Stats</Link>
                                                <Link href={route('services.edit', service.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#e9f3ec] px-3 py-2 text-sm font-semibold text-[#1b503a] transition hover:bg-[#d8eadd]">
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
                        <p className="text-sm text-[#718177]">Affichage de {services.from} a {services.to} sur {services.total} services</p>
                        <div className="flex items-center gap-2">
                            {services.links.map((link, index) => (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${link.active ? 'bg-[#1b503a] text-white' : link.url ? 'bg-white text-[#31513d] shadow-sm ring-1 ring-[#dce5dd] hover:bg-[#edf4ee]' : 'cursor-not-allowed bg-[#edf1ed] text-[#a1aaa3]'}`}
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
