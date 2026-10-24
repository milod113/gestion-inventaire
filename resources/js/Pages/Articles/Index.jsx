import LabelPrintControls from '@/Components/LabelPrintControls';
import PageHeader, { HeaderStat, PlusIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const fieldClass = 'rounded-xl border-line bg-canvas py-3 text-sm text-ink focus:border-brand-500 focus:ring-brand-500 dark:focus:border-brand-400 dark:focus:ring-brand-400';
const checkboxClass = 'h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-500 disabled:opacity-30';

export default function Index({ articles, summary, services, filters }) {
    const { flash = {} } = usePage().props;
    const { data, setData, get, processing } = useForm({ search: filters.search || '', service_code: filters.service_code || '' });
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selected, setSelected] = useState([]);
    const selectableIds = articles.data.filter((article) => article.numero_inventaire).map((article) => article.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));
    const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    const toggleAll = () => setSelected(allSelected ? [] : selectableIds);
    const hasFilters = Boolean(filters.search || filters.service_code);

    useEffect(() => {
        const term = data.search.trim();
        if (term.length < 2) { setSuggestions([]); return undefined; }
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            fetch(route('articles.suggestions', { q: term }), { headers: { Accept: 'application/json' }, signal: controller.signal })
                .then((response) => response.ok ? response.json() : [])
                .then(setSuggestions)
                .catch((error) => { if (error.name !== 'AbortError') setSuggestions([]); });
        }, 250);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [data.search]);

    const submit = (event) => { event.preventDefault(); get(route('articles.index'), { preserveState: true, replace: true }); };
    const chooseSuggestion = (article) => {
        setData('search', article.search_value);
        setShowSuggestions(false);
        setSuggestions([]);
        router.get(route('articles.index'), { search: article.search_value, service_code: data.service_code }, { preserveState: true, replace: true });
    };
    const destroy = (article) => { if (window.confirm(`Supprimer l article "${article.description}" ?`)) router.delete(route('articles.destroy', article.id)); };

    return <AuthenticatedLayout header={<Header total={summary.total} />}>
        <Head title="Articles" />
        <div className="px-5 pb-14 pt-7 lg:px-10"><div className="mx-auto max-w-7xl space-y-6">
            {flash.success && <Alert tone="success">{flash.success}</Alert>}
            {flash.error && <Alert tone="error">{flash.error}</Alert>}

            <section className="grid gap-4 sm:grid-cols-2">
                <Metric label={hasFilters ? 'Articles filtrés' : 'Articles'} value={summary.total} tone="green" />
                <Metric label="Avec numéro d inventaire" value={summary.with_inventory} hint={percent(summary.with_inventory, summary.total)} tone="blue" />
            </section>

            <section className="rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5">
                <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_260px_190px_auto_auto]">
                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input type="search" value={data.search} onFocus={() => setShowSuggestions(true)} onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)} onChange={(event) => { setData('search', event.target.value); setShowSuggestions(true); }} placeholder="Désignation, inventaire, bon ou code service..." autoComplete="off" className={`w-full pl-10 pr-4 ${fieldClass}`} />
                        {showSuggestions && data.search.trim().length >= 2 && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-auto rounded-xl border border-line bg-surface py-1 shadow-xl">
                            {suggestions.length ? suggestions.map((article) => <button key={article.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(article)} className="block w-full px-4 py-3 text-left transition hover:bg-subtle">
                                <span className="block text-sm font-semibold text-ink">{article.description}</span>
                                <span className="mt-1 block text-xs text-muted">{article.numero_inventaire ? `Inventaire : ${article.numero_inventaire}` : ''}{article.service ? ` · Service : ${article.service}` : ''}</span>
                            </button>) : <p className="px-4 py-3 text-sm text-muted">Aucun article trouvé.</p>}
                        </div>}
                    </div>
                    <select value={data.service_code} onChange={(event) => setData('service_code', event.target.value)} className={`form-select px-3 ${fieldClass}`}><option value="">Tous les services</option>{services.map((service) => <option key={service.code} value={service.code}>{service.code} - {service.name}</option>)}</select>
                    <button type="submit" disabled={processing} className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-60 dark:bg-brand-600 dark:hover:bg-brand-700">Rechercher</button>
                    <Link href={route('articles.index')} className="rounded-xl px-3 py-3 text-center text-sm font-semibold text-muted transition hover:bg-subtle">Effacer</Link>
                </form>
            </section>

            <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-[#431407]/5">
                <div className="flex flex-col gap-4 border-b border-line bg-subtle px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.16em] text-muted">Inventaire</p>
                        <h2 className="mt-1 text-xl font-bold text-ink">Lignes d inventaire</h2>
                        {selected.length > 0 && <p className="mt-1 text-sm text-brand-700 dark:text-brand-300"><span className="font-bold">{selected.length}</span> sélectionné{selected.length > 1 ? 's' : ''} pour les étiquettes · <button type="button" onClick={() => setSelected([])} className="font-semibold underline">Désélectionner</button></p>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <LabelPrintControls params={selected.length ? { ids: selected } : filters} label={selected.length ? `Étiquettes (${selected.length})` : 'Étiquettes (filtre)'} />
                        <a href={route('articles.print', filters)} target="_blank" rel="noreferrer" className="btn-secondary py-3"><PrinterIcon />Imprimer la liste</a>
                    </div>
                </div>

                {articles.data.length === 0 ? <EmptyState hasFilters={hasFilters} /> : <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-line">
                        <thead className="bg-canvas"><tr>
                            <th className="w-12 py-4 pl-6"><input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectableIds.length === 0} title="Tout sélectionner (articles avec numéro d inventaire)" className={checkboxClass} /></th>
                            <Th>Article</Th><Th>Service</Th><Th>N° inventaire</Th><Th>Quantités</Th><Th align="right">Actions</Th>
                        </tr></thead>
                        <tbody className="divide-y divide-line">
                            {articles.data.map((article) => <tr key={article.id} className={`transition hover:bg-subtle ${selected.includes(article.id) ? 'bg-brand-50/60 dark:bg-brand-900/30' : ''}`}>
                                <td className="py-4 pl-6"><input type="checkbox" checked={selected.includes(article.id)} onChange={() => toggle(article.id)} disabled={!article.numero_inventaire} title={article.numero_inventaire ? 'Sélectionner pour les étiquettes' : 'Pas de numéro d inventaire'} className={checkboxClass} /></td>
                                <td className="max-w-md px-6 py-4">
                                    <Link href={route('articles.show', article.id)} className="text-sm font-bold text-ink hover:text-brand-700 dark:hover:text-brand-300">{article.description}</Link>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted"><MovementBadge value={article.mouvement} />{article.date_mouvement && <span>{formatDate(article.date_mouvement)}</span>}{article.numero_bon && <span>· Bon {article.numero_bon}</span>}</div>
                                </td>
                                <td className="px-6 py-4 text-sm">{article.service ? <><span className="font-bold text-ink">{article.service.code}</span><span className="block text-xs text-muted">{article.service.name}</span></> : <span className="text-muted">{article.service_code_source || '—'}</span>}</td>
                                <td className="px-6 py-4">{article.numero_inventaire ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-subtle px-2.5 py-1 font-mono text-xs font-semibold text-ink ring-1 ring-line"><BarcodeIcon />{article.numero_inventaire}</span> : <span className="text-sm text-muted">—</span>}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm"><span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">E {formatQuantity(article.quantite_entree)}</span><span className="ml-2 rounded-md bg-red-50 px-2 py-1 font-bold text-red-700 dark:bg-red-950 dark:text-red-200">S {formatQuantity(article.quantite_sortie)}</span></td>
                                <td className="whitespace-nowrap px-6 py-4 text-right"><div className="flex justify-end gap-1.5">
                                    <IconLink href={route('articles.show', article.id)} title="Voir" className="text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950"><EyeIcon /></IconLink>
                                    <IconLink href={route('articles.edit', article.id)} title="Modifier" className="text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900"><PencilIcon /></IconLink>
                                    <button type="button" onClick={() => destroy(article)} title="Supprimer" aria-label="Supprimer" className="rounded-lg p-2 text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"><TrashIcon /></button>
                                </div></td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>}
            </section>

            <Pagination articles={articles} />
        </div></div>
    </AuthenticatedLayout>;
}

function Header({ total }) { return <PageHeader eyebrow="Inventaire" title="Articles" description="Consultez, filtrez et étiquetez les lignes d inventaire." actions={<><HeaderStat value={formatNumber(total)} label="lignes" /><Link href={route('articles.create')} className="btn-primary"><PlusIcon />Ajouter un article</Link></>} />; }
function Metric({ label, value, hint, tone }) { const tones = { green: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200', blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200', gold: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200' }; return <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}><p className="text-xs font-bold uppercase tracking-[.14em] opacity-90">{label}</p><p className="mt-2 text-3xl font-bold">{formatNumber(value)}</p>{hint && <p className="mt-1 text-xs font-semibold opacity-75">{hint}</p>}</div>; }
function Alert({ tone, children }) { return <div className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'}`}>{children}</div>; }
function Th({ children, align = 'left' }) { return <th className={`px-6 py-4 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-bold uppercase tracking-[.13em] text-muted`}>{children}</th>; }
function MovementBadge({ value }) { const types = { E: ['Entrée', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'], S: ['Sortie', 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200'], R: ['Retour', 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'] }; const [label, tone] = types[value] || [value || 'Non précisé', 'bg-subtle text-muted']; return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</span>; }
function IconLink({ href, title, className, children }) { return <Link href={href} title={title} aria-label={title} className={`rounded-lg p-2 transition ${className}`}>{children}</Link>; }
function EmptyState({ hasFilters }) { return <div className="px-6 py-20 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-subtle text-muted"><SearchIcon className="h-6 w-6" /></span><p className="mt-4 text-lg font-bold text-ink">{hasFilters ? 'Aucun article ne correspond aux filtres' : 'Aucun article'}</p><p className="mt-1 text-sm text-muted">{hasFilters ? 'Modifiez la recherche ou effacez les filtres.' : 'Commencez par ajouter un article ou importer un fichier.'}</p><div className="mt-5 flex justify-center gap-2">{hasFilters && <Link href={route('articles.index')} className="btn-secondary">Effacer les filtres</Link>}<Link href={route('articles.create')} className="btn-primary"><PlusIcon />Ajouter un article</Link></div></div>; }
function Pagination({ articles }) { if (articles.last_page <= 1) return null; return <div className="flex flex-col items-center justify-between gap-4 sm:flex-row"><p className="text-sm text-muted">{formatNumber(articles.from)} à {formatNumber(articles.to)} sur {formatNumber(articles.total)} articles</p><div className="flex flex-wrap gap-2">{articles.links.map((link, index) => <Link key={`${link.label}-${index}`} href={link.url || '#'} preserveScroll className={`rounded-xl px-3 py-2 text-sm font-bold ${link.active ? 'bg-brand-700 text-white dark:bg-brand-600' : link.url ? 'bg-surface text-ink shadow-sm ring-1 ring-line hover:bg-subtle' : 'cursor-not-allowed bg-subtle text-muted opacity-60'}`} dangerouslySetInnerHTML={{ __html: link.label }} />)}</div></div>; }

function formatNumber(value) { return new Intl.NumberFormat('fr-FR').format(Number(value) || 0); }
function percent(part, total) { return total ? `${Math.round((part / total) * 100)} % du total` : null; }
function formatQuantity(value) { const quantity = Number(value); return Number.isFinite(quantity) ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(quantity) : '0'; }
function formatDate(value) { const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/); if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR'); }

function Svg({ className = 'h-4 w-4', children }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>; }
function SearchIcon({ className }) { return <Svg className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>; }
function PrinterIcon() { return <Svg><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></Svg>; }
function BarcodeIcon() { return <Svg className="h-3.5 w-3.5 text-muted"><path d="M4 5v14M8 5v14M11 5v14M15 5v14M18 5v14M21 5v14" /></Svg>; }
function EyeIcon() { return <Svg><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>; }
function PencilIcon() { return <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>; }
function TrashIcon() { return <Svg><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></Svg>; }
