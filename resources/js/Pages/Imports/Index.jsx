import { formatDate } from '@/Components/FormKit';
import InputError from '@/Components/InputError';
import PageHeader from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

const number = new Intl.NumberFormat('fr-FR');
const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const typeLabels = {
    gestion: { label: 'Articles', className: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' },
    facture: { label: 'Factures', className: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
    fournisseur: { label: 'Fournisseurs', className: 'bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
    service: { label: 'Services', className: 'bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200' },
};

const statusLabels = {
    imported: { label: 'Importe', dot: 'bg-brand-500', className: 'text-brand-700 dark:text-brand-300' },
    previewed: { label: 'A valider', dot: 'bg-amber-500', className: 'text-amber-700 dark:text-amber-300' },
};

export default function Index({ batches, summary, filters = {} }) {
    const { flash = {} } = usePage().props;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Centre de controle"
                    title="Importation"
                    description="Chaque archive est analysee et comparee aux donnees existantes, puis validee par vos soins."
                    actions={<>
                        <a href={route('backups.database')} className="btn-secondary">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
                            Sauvegarde SQL
                        </a>
                        <Link href={route('imports.advanced')} className="btn-secondary">Import avance</Link>
                    </>}
                />
            }
        >
            <Head title="Importation" />

            <div className="space-y-6 px-5 pb-14 pt-7 lg:px-10">
                {flash.success && (
                    <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-sm font-medium text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                        <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z" clipRule="evenodd" /></svg>
                        {flash.success}
                    </div>
                )}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile label="Lots analyses" value={summary.analysed} />
                    <StatTile label="Lots importes" value={summary.imported} tone="text-brand-600 dark:text-brand-300" />
                    <StatTile label="Lots a valider" value={summary.pending} detail={`${number.format(summary.ready)} lignes pretes`} tone={summary.pending ? 'text-amber-600 dark:text-amber-300' : ''} />
                    <StatTile label="Doublons ecartes" value={summary.duplicates} detail="Lignes deja presentes" />
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <UploadCard title="Mouvements articles" description="Archives GESTION au format Excel ou DBF." accept=".xlsx,.dbf" endpoint="imports.preview" icon="boxes" />
                    <UploadCard title="Registre factures" description="Archives FACTURE au format DBF." accept=".dbf" endpoint="imports.factures.preview" icon="receipt" />
                </section>

                <p className="flex items-start gap-2 text-xs text-muted">
                    <svg className="mt-px h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 11v5M12 8h.01" /></svg>
                    L'analyse ne modifie aucune donnee : chaque fichier forme un lot distinct que vous validez ensuite. Pensez a telecharger une sauvegarde SQL avant un import important.
                </p>

                <History batches={batches} filters={filters} />
            </div>
        </AuthenticatedLayout>
    );
}

function StatTile({ label, value, detail, tone = '' }) {
    return (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${tone || 'text-ink'}`}>{number.format(value || 0)}</p>
            {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
        </div>
    );
}

function UploadCard({ title, description, accept, endpoint, icon }) {
    const { data, setData, errors, setError, clearErrors } = useForm({ files: [] });
    const [progress, setProgress] = useState(0);
    const [current, setCurrent] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);
    const extensions = accept.split(',');
    const selected = data.files.length;

    const addFiles = (fileList) => {
        clearErrors();
        const files = Array.from(fileList);
        const accepted = files.filter((file) => extensions.some((extension) => file.name.toLowerCase().endsWith(extension)));
        if (accepted.length < files.length) setError('files', `Formats acceptes : ${extensions.join(', ')}`);
        const known = new Set(data.files.map((file) => `${file.name}-${file.size}`));
        setData('files', [...data.files, ...accepted.filter((file) => !known.has(`${file.name}-${file.size}`))]);
    };

    const removeFile = (index) => setData('files', data.files.filter((_, fileIndex) => fileIndex !== index));

    const submit = async (event) => {
        event.preventDefault();
        clearErrors();
        setProcessing(true);
        setProgress(0);
        try {
            for (let index = 0; index < data.files.length; index++) {
                setCurrent(index + 1);
                await sendFile(data.files[index], endpoint, setProgress);
            }
            window.location.assign(route('imports.index'));
        } catch (error) {
            setError('files', error.message || 'Une analyse a echoue.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col rounded-2xl border border-line bg-surface shadow-card">
            <header className="flex items-start gap-4 border-b border-line px-6 py-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon name={icon} /></span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-ink">{title}</h2>
                    <p className="text-sm text-muted">{description}</p>
                </div>
                <div className="hidden gap-1 sm:flex">
                    {extensions.map((extension) => <span key={extension} className="rounded-md bg-subtle px-2 py-0.5 font-mono text-[11px] font-semibold uppercase text-muted">{extension.slice(1)}</span>)}
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-4 p-6">
                <button
                    type="button"
                    disabled={processing}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
                    className={`group rounded-xl border-2 border-dashed px-6 py-8 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-line hover:border-brand-400 hover:bg-subtle'}`}
                >
                    <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full transition ${dragging ? 'bg-brand-600 text-white' : 'bg-subtle text-muted group-hover:text-brand-600'}`}><Icon name="upload" /></span>
                    <span className="mt-3 block text-sm font-semibold text-ink">
                        {dragging ? 'Deposez les fichiers ici' : <>Glissez vos fichiers ou <span className="text-brand-600 dark:text-brand-300">parcourez</span></>}
                    </span>
                    <span className="mt-1 block text-xs text-muted">{extensions.join(', ')} · 50 Mo maximum par fichier</span>
                </button>
                <input ref={inputRef} type="file" multiple accept={accept} onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} className="sr-only" tabIndex={-1} />

                {selected > 0 && (
                    <ul className="divide-y divide-line rounded-xl border border-line">
                        {data.files.map((file, index) => {
                            const state = !processing ? 'idle' : index + 1 < current ? 'done' : index + 1 === current ? 'active' : 'waiting';
                            return (
                                <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-subtle font-mono text-[10px] font-bold uppercase text-muted">{file.name.split('.').pop()}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                                        {state === 'active' ? (
                                            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-subtle">
                                                <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted">{formatSize(file.size)}{state === 'done' && ' · analyse'}{state === 'waiting' && ' · en attente'}</p>
                                        )}
                                    </div>
                                    {state === 'idle' && (
                                        <button type="button" onClick={() => removeFile(index)} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label={`Retirer ${file.name}`}>
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
                                        </button>
                                    )}
                                    {state === 'active' && <span className="text-xs font-semibold tabular-nums text-brand-600 dark:text-brand-300">{progress}%</span>}
                                    {state === 'done' && <svg className="h-5 w-5 text-brand-600 dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg>}
                                </li>
                            );
                        })}
                    </ul>
                )}

                <InputError message={errors.files} />

                <button type="submit" disabled={!selected || processing} className="btn-primary mt-auto w-full disabled:cursor-not-allowed">
                    {processing
                        ? `Analyse du fichier ${current}/${selected}...`
                        : selected ? `Analyser ${selected} fichier${selected > 1 ? 's' : ''}` : 'Analyser les fichiers'}
                </button>
            </div>
        </form>
    );
}

function History({ batches, filters }) {
    const { data, setData, get, processing } = useForm({ search: filters.search || '', type: filters.type || '' });
    const hasFilters = Boolean(filters.search || filters.type);

    const filter = (event) => {
        event.preventDefault();
        get(route('imports.index'), { preserveState: true, preserveScroll: true, replace: true });
    };

    const reset = () => {
        setData({ search: '', type: '' });
        router.get(route('imports.index'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <header className="flex flex-col gap-4 border-b border-line px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-ink">Historique des lots</h2>
                    <p className="text-xs text-muted">{number.format(batches.total)} lot{batches.total > 1 ? 's' : ''}{hasFilters && ' correspondant aux filtres'}</p>
                </div>
                <form onSubmit={filter} className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative">
                        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
                        <input type="search" value={data.search} onChange={(event) => setData('search', event.target.value)} placeholder="Rechercher un fichier..." className="w-full rounded-xl border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 focus:border-brand-500 focus:ring-brand-500/20 sm:w-60" />
                    </div>
                    <select value={data.type} onChange={(event) => setData('type', event.target.value)} className="rounded-xl border-line bg-surface py-2 pl-3 pr-9 text-sm text-ink focus:border-brand-500 focus:ring-brand-500/20">
                        <option value="">Tous les types</option>
                        {Object.entries(typeLabels).map(([value, type]) => <option key={value} value={value}>{type.label}</option>)}
                    </select>
                    <button type="submit" disabled={processing} className="btn-primary py-2">Filtrer</button>
                    {hasFilters && <button type="button" onClick={reset} className="btn-secondary py-2">Effacer</button>}
                </form>
            </header>

            {batches.data.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-subtle text-muted"><Icon name="archive" /></span>
                    <p className="mt-4 text-sm font-semibold text-ink">{hasFilters ? 'Aucun lot ne correspond' : 'Aucune analyse pour le moment'}</p>
                    <p className="mt-1 text-sm text-muted">{hasFilters ? 'Modifiez ou effacez les filtres.' : 'Deposez un fichier ci-dessus pour lancer une premiere analyse.'}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-medium text-muted">
                                <th className="px-6 py-3 font-medium">Fichier</th>
                                <th className="px-6 py-3 font-medium">Type</th>
                                <th className="px-6 py-3 font-medium">Periode</th>
                                <th className="px-6 py-3 font-medium">Lignes</th>
                                <th className="px-6 py-3 font-medium">Etat</th>
                                <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {batches.data.map((batch) => <BatchRow key={batch.id} batch={batch} />)}
                        </tbody>
                    </table>
                </div>
            )}

            {batches.last_page > 1 && (
                <footer className="flex flex-col items-center justify-between gap-3 border-t border-line px-6 py-4 sm:flex-row">
                    <p className="text-xs text-muted">Lots {batches.from} a {batches.to} sur {number.format(batches.total)}</p>
                    <div className="flex flex-wrap gap-1">
                        {batches.links.map((link, index) => (
                            <Link
                                key={`${link.label}-${index}`}
                                href={link.url || '#'}
                                preserveScroll
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${link.active ? 'bg-brand-700 text-white dark:bg-brand-600' : link.url ? 'text-muted hover:bg-subtle hover:text-ink' : 'pointer-events-none text-muted/40'}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </footer>
            )}
        </section>
    );
}

function BatchRow({ batch }) {
    const type = typeLabels[batch.type] || { label: batch.type, className: 'bg-subtle text-muted' };
    const status = statusLabels[batch.status] || { label: batch.status, dot: 'bg-muted', className: 'text-muted' };
    const from = formatDate(batch.date_from?.slice(0, 10));
    const to = formatDate(batch.date_to?.slice(0, 10));
    const issues = [
        [batch.duplicate_rows, 'doublon'],
        [batch.conflict_rows, 'conflit'],
        [batch.invalid_rows, 'invalide'],
    ].filter(([count]) => count > 0);

    return (
        <tr className="transition hover:bg-subtle">
            <td className="px-6 py-3.5">
                <p className="max-w-xs truncate font-semibold text-ink">{batch.original_name}</p>
                <p className="text-xs text-muted">{dateTime.format(new Date(batch.created_at))}</p>
            </td>
            <td className="whitespace-nowrap px-6 py-3.5">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${type.className}`}>{type.label}</span>
            </td>
            <td className="whitespace-nowrap px-6 py-3.5 text-muted">{from ? (from === to ? from : `${from} → ${to}`) : '—'}</td>
            <td className="whitespace-nowrap px-6 py-3.5">
                <p className="font-medium tabular-nums text-ink">
                    {batch.status === 'imported' ? `${number.format(batch.imported_rows)} importees` : `${number.format(batch.ready_rows)} pretes`}
                    <span className="font-normal text-muted"> / {number.format(batch.total_rows)}</span>
                </p>
                {issues.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">{issues.map(([count, label]) => `${number.format(count)} ${label}${count > 1 ? 's' : ''}`).join(' · ')}</p>
                )}
            </td>
            <td className="whitespace-nowrap px-6 py-3.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                </span>
            </td>
            <td className="whitespace-nowrap px-6 py-3.5 text-right">
                <Link href={route('imports.show', batch.id)} className={batch.status === 'previewed' ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-secondary px-3 py-1.5 text-xs'}>
                    {batch.status === 'previewed' ? 'Examiner' : 'Voir'}
                </Link>
            </td>
        </tr>
    );
}

function sendFile(file, endpoint, setProgress) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        const body = new FormData();
        body.append('file', file);
        request.open('POST', route(endpoint));
        request.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]')?.content || '');
        request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        request.upload.onprogress = (event) => {
            if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () => (request.status >= 200 && request.status < 400 ? resolve() : reject(new Error(`Echec de l'analyse de ${file.name}.`)));
        request.onerror = () => reject(new Error('Connexion interrompue pendant l analyse.'));
        request.send(body);
    });
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

const iconPaths = {
    boxes: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
    upload: <path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />,
    archive: <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></>,
};

function Icon({ name }) {
    return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {iconPaths[name]}
        </svg>
    );
}
