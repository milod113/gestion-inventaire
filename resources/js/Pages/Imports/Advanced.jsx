import { formatDate } from '@/Components/FormKit';
import Modal from '@/Components/Modal';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const number = new Intl.NumberFormat('fr-FR');
const scanDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const IMPORTABLE = ['gestion', 'facture', 'fournisseur', 'service'];

const types = {
    gestion: { label: 'Articles', className: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' },
    facture: { label: 'Factures', className: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
    fournisseur: { label: 'Fournisseurs', className: 'bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
    service: { label: 'Services', className: 'bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200' },
    inconnu: { label: 'Inconnu', className: 'bg-subtle text-muted' },
};

export default function Advanced({ path, files, scanError, history = [] }) {
    const { data, setData, get, processing } = useForm({ path: path || 'C:\\Users\\ACER\\Desktop\\invent\\FACTURE' });
    const [selected, setSelected] = useState(null);
    const [rescanning, setRescanning] = useState(false);
    const scanning = processing || rescanning;
    // Latest scan per folder (history is already sorted newest first).
    const recentScans = history.filter((scan, index) => history.findIndex((other) => other.path.toLowerCase() === scan.path.toLowerCase()) === index);

    const scan = (event) => {
        event.preventDefault();
        get(route('imports.advanced'), { preserveState: true });
    };

    const rescan = (recent) => {
        setData('path', recent);
        router.get(route('imports.advanced'), { path: recent }, { preserveState: true, onStart: () => setRescanning(true), onFinish: () => setRescanning(false) });
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Archives historiques"
                    title="Importation avancee"
                    description="Scannez un dossier d'archives DBF, verifiez chaque fichier puis lancez son analyse. Aucune donnee n'est modifiee avant validation."
                    actions={<Link href={route('imports.index')} className="btn-secondary"><BackIcon />Centre d'importation</Link>}
                />
            }
        >
            <Head title="Importation avancee" />

            <div className="space-y-6 px-5 pb-14 pt-7 lg:px-10">
                <section className="rounded-2xl border border-line bg-surface shadow-card">
                    <StepHeader number="1" title="Scanner un dossier" description="Chemin d'un dossier autorise sur le serveur contenant des fichiers DBF." />
                    <div className="p-6">
                        <form onSubmit={scan} className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <svg className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
                                <input
                                    value={data.path}
                                    onChange={(event) => setData('path', event.target.value)}
                                    placeholder="C:\chemin\vers\les\archives"
                                    spellCheck={false}
                                    className={`block w-full rounded-xl border bg-surface py-2.5 pl-11 pr-3.5 font-mono text-sm text-ink shadow-sm placeholder:text-muted/70 focus:outline-none focus:ring-4 ${scanError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : 'border-line focus:border-brand-500 focus:ring-brand-500/15'}`}
                                />
                            </div>
                            <button type="submit" disabled={scanning || !data.path.trim()} className="btn-primary">
                                {scanning ? <Spinner /> : <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>}
                                {scanning ? 'Scan en cours...' : 'Scanner'}
                            </button>
                        </form>

                        {scanError && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v5M12 16h.01" /></svg>
                                {scanError}
                            </div>
                        )}

                        {recentScans.length > 0 && (
                            <div className="mt-5">
                                <p className="mb-2 text-xs font-medium text-muted">Dossiers recents</p>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {recentScans.map((recent) => {
                                        const current = path && recent.path.toLowerCase() === path.toLowerCase();
                                        return (
                                            <button
                                                key={recent.id}
                                                type="button"
                                                onClick={() => rescan(recent.path)}
                                                disabled={scanning}
                                                title={current ? 'Relancer le scan de ce dossier' : 'Scanner ce dossier'}
                                                className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition disabled:opacity-60 ${current ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-line hover:border-brand-400 hover:bg-subtle'}`}
                                            >
                                                <svg className={`h-5 w-5 shrink-0 ${current ? 'text-brand-600 dark:text-brand-300' : 'text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-mono text-xs font-medium text-ink">{recent.path}</span>
                                                    <span className="block text-xs text-muted">
                                                        {number.format(recent.files_count)} fichiers · {scanDate.format(new Date(recent.created_at))}
                                                        {current && ' · affiche'}
                                                    </span>
                                                </span>
                                                <svg className="h-4 w-4 shrink-0 text-muted transition group-hover:rotate-90 group-hover:text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12.3 2M18.5 9A7 7 0 0 0 6.2 7" /></svg>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {path && !scanError && (
                    files.length > 0
                        ? <FileList files={files} path={path} onInspect={setSelected} />
                        : (
                            <section className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
                                <p className="text-sm font-semibold text-ink">Aucun fichier DBF trouve</p>
                                <p className="mt-1 text-sm text-muted">Le dossier <span className="font-mono">{path}</span> ne contient aucune archive exploitable.</p>
                            </section>
                        )
                )}
            </div>

            <Modal show={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="2xl">
                {selected && <FileDetails file={selected} close={() => setSelected(null)} />}
            </Modal>
        </AuthenticatedLayout>
    );
}

function FileList({ files, path, onInspect }) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [preparing, setPreparing] = useState(null);

    const counts = useMemo(() => files.reduce((total, file) => ({ ...total, [file.type]: (total[file.type] || 0) + 1 }), {}), [files]);
    const visible = files.filter((file) => (!type || file.type === type) && `${file.name} ${file.relative_path}`.toLowerCase().includes(search.trim().toLowerCase()));
    const totalRecords = files.reduce((total, file) => total + (file.records || 0), 0);

    const prepare = (file) => {
        router.post(route('imports.advanced.prepare'), { path: `${path}\\${file.relative_path}`, type: file.type }, {
            onStart: () => setPreparing(file.relative_path),
            onFinish: () => setPreparing(null),
        });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <StepHeader number="2" title="Verifier puis analyser un fichier" description={`${number.format(files.length)} fichiers · ${number.format(totalRecords)} enregistrements au total`} />

            <div className="flex flex-col gap-3 border-b border-line px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={!type} onClick={() => setType('')} label="Tous" count={files.length} />
                    {Object.entries(counts).map(([value, count]) => (
                        <FilterChip key={value} active={type === value} onClick={() => setType(value)} label={types[value]?.label || value} count={count} />
                    ))}
                </div>
                <div className="relative">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filtrer les fichiers..." className="w-full rounded-xl border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 focus:border-brand-500 focus:ring-brand-500/20 lg:w-64" />
                </div>
            </div>

            {visible.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-muted">Aucun fichier ne correspond aux filtres.</p>
            ) : (
                <div className="max-h-[36rem] overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-[1] bg-surface">
                            <tr className="text-left text-xs font-medium text-muted shadow-[inset_0_-1px_0_rgb(var(--line))]">
                                <th className="px-6 py-3 font-medium">Fichier</th>
                                <th className="px-6 py-3 font-medium">Type</th>
                                <th className="px-6 py-3 text-right font-medium">Enregistrements</th>
                                <th className="px-6 py-3 font-medium">Periode</th>
                                <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {visible.map((file) => {
                                const fileType = types[file.type] || types.inconnu;
                                const importable = IMPORTABLE.includes(file.type);
                                const busy = preparing === file.relative_path;
                                return (
                                    <tr key={file.relative_path} className="transition hover:bg-subtle">
                                        <td className="px-6 py-3">
                                            <p className="font-semibold text-ink">{file.name}</p>
                                            <p className="max-w-xs truncate font-mono text-xs text-muted" title={file.relative_path}>{file.relative_path}{file.size ? ` · ${formatSize(file.size)}` : ''}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${fileType.className}`}>{fileType.label}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right font-medium tabular-nums text-ink">{number.format(file.records)}</td>
                                        <td className="whitespace-nowrap px-6 py-3 text-muted">{period(file) || '—'}</td>
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => onInspect(file)} className="btn-secondary px-3 py-1.5 text-xs">Format</button>
                                                {importable ? (
                                                    <button type="button" onClick={() => prepare(file)} disabled={preparing !== null} className="btn-primary px-3 py-1.5 text-xs">
                                                        {busy && <Spinner />}
                                                        {busy ? 'Analyse...' : 'Analyser'}
                                                    </button>
                                                ) : (
                                                    <span className="px-3 py-1.5 text-xs text-muted" title="Ce type de fichier ne peut pas etre importe">{file.status === 'pret' ? 'Consultation' : 'A verifier'}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function FileDetails({ file, close }) {
    const fileType = types[file.type] || types.inconnu;
    return (
        <div>
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Format du fichier DBF</p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-ink">{file.name}</h2>
                </div>
                <button type="button" onClick={close} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label="Fermer">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
            </header>
            <div className="space-y-5 p-6">
                <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-3">
                    <Detail label="Type"><span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${fileType.className}`}>{fileType.label}</span></Detail>
                    <Detail label="Enregistrements"><span className="font-semibold tabular-nums">{number.format(file.records)}</span></Detail>
                    <Detail label="Periode">{period(file) || 'Aucune date'}</Detail>
                </dl>
                <div>
                    <p className="text-xs font-medium text-muted">Chemin</p>
                    <p className="mt-1 break-all rounded-lg bg-subtle px-3 py-2 font-mono text-xs text-ink">{file.relative_path}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted">Colonnes detectees ({file.fields.length})</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {file.fields.map((field) => <span key={field} className="rounded-md border border-line bg-subtle px-2 py-1 font-mono text-xs font-medium text-ink">{field}</span>)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepHeader({ number: step, title, description }) {
    return (
        <header className="flex items-center gap-3 border-b border-line px-6 py-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{step}</span>
            <div>
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                <p className="text-xs text-muted">{description}</p>
            </div>
        </header>
    );
}

function FilterChip({ active, onClick, label, count }) {
    return (
        <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-brand-700 text-white dark:bg-brand-600' : 'bg-subtle text-muted hover:text-ink'}`}>
            {label}
            <span className={`rounded px-1 tabular-nums ${active ? 'bg-white/20' : 'bg-surface'}`}>{count}</span>
        </button>
    );
}

function Detail({ label, children }) {
    return (
        <div className="bg-surface px-4 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-ink">{children}</dd>
        </div>
    );
}

function Spinner() {
    return <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" className="opacity-75" /></svg>;
}

function period(file) {
    if (!file.date_from) return null;
    const from = formatDate(String(file.date_from).slice(0, 10));
    const to = formatDate(String(file.date_to || file.date_from).slice(0, 10));
    return from === to ? from : `${from} → ${to}`;
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
