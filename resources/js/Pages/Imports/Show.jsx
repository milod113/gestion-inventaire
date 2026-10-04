import { formatDate } from '@/Components/FormKit';
import Modal from '@/Components/Modal';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const number = new Intl.NumberFormat('fr-FR');
const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const typeLabels = { gestion: 'Articles', facture: 'Factures', fournisseur: 'Fournisseurs', service: 'Services' };

// Columns shown in the preview tables, per import type.
const columns = {
    gestion: [
        { label: 'Designation', value: (p) => p.description, strong: true },
        { label: 'Mvt', value: (p) => p.mouvement, mono: true },
        { label: 'Quantite', value: (p) => (p.quantite_entree ? `+${number.format(p.quantite_entree)}` : p.quantite_sortie ? `−${number.format(p.quantite_sortie)}` : null), align: 'right' },
        { label: 'Date', value: (p) => formatDate(p.date_mouvement) },
        { label: 'Service', value: (p) => p.service_code_source, mono: true },
        { label: 'N° inventaire', value: (p) => p.numero_inventaire, mono: true },
    ],
    facture: [
        { label: 'N° facture', value: (p) => p.numero_facture, strong: true, mono: true },
        { label: 'Date', value: (p) => formatDate(p.date_facture) },
        { label: 'Fournisseur', value: (p) => p.code_fournisseur, mono: true },
        { label: 'Service', value: (p) => p.service_reference },
        { label: 'Imputation', value: (p) => p.imputation, mono: true },
        { label: 'Montant', value: (p) => (p.montant ? currency.format(p.montant) : null), align: 'right', strong: true },
    ],
    fournisseur: [
        { label: 'Code', value: (p) => p.code, mono: true, strong: true },
        { label: 'Appellation', value: (p) => p.appellation, strong: true },
        { label: 'Adresse', value: (p) => p.adresse },
        { label: 'Telephone', value: (p) => p.telephone, mono: true },
    ],
    service: [
        { label: 'Code service', value: (p) => p.code, mono: true, strong: true },
        { label: 'Nom du service', value: (p) => p.name, strong: true },
    ],
};

const segments = [
    { key: 'ready_rows', label: 'Pretes a importer', color: 'bg-brand-500', text: 'text-brand-700 dark:text-brand-300' },
    { key: 'duplicate_rows', label: 'Doublons ignores', color: 'bg-sky-400', text: 'text-sky-700 dark:text-sky-300' },
    { key: 'conflict_rows', label: 'Conflits', color: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300' },
    { key: 'invalid_rows', label: 'Invalides', color: 'bg-red-400', text: 'text-red-700 dark:text-red-300' },
];

const rowStatus = {
    duplicate: { label: 'Doublon', className: 'bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
    conflict: { label: 'Conflit', className: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
};

export default function Show({ batch, examples, preview = [] }) {
    const { flash = {} } = usePage().props;
    const [confirming, setConfirming] = useState(false);
    const [committing, setCommitting] = useState(false);
    const typeColumns = columns[batch.type] || [];
    const imported = batch.status === 'imported';

    const commit = () => {
        router.post(route('imports.commit', batch.id), {}, {
            preserveScroll: true,
            onStart: () => setCommitting(true),
            onFinish: () => { setCommitting(false); setConfirming(false); },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow={`Lot n° ${batch.id} · ${typeLabels[batch.type] || batch.type}`}
                    title={batch.original_name}
                    description={`Analyse le ${dateTime.format(new Date(batch.created_at))}. Aucune donnee n'est modifiee avant votre validation.`}
                    actions={<>
                        {batch.total_rows > 0 && (
                            <a href={route('imports.report', batch.id)} className="btn-secondary">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
                                Rapport CSV
                            </a>
                        )}
                        <Link href={route('imports.index')} className="btn-secondary"><BackIcon />Retour aux imports</Link>
                    </>}
                />
            }
        >
            <Head title={`Import · ${batch.original_name}`} />

            <div className="space-y-6 px-5 pb-14 pt-7 lg:px-10">
                {flash.success && (
                    <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-sm font-medium text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                        <CheckIcon className="h-5 w-5 shrink-0" />
                        {flash.success}
                    </div>
                )}

                <Decision batch={batch} imported={imported} onImport={() => setConfirming(true)} />

                {batch.total_rows > 0 && <Breakdown batch={batch} />}

                {preview.length > 0 && !imported && (
                    <RowsTable
                        title="Apercu des lignes a importer"
                        description={`Les ${preview.length} premieres lignes sur ${number.format(batch.ready_rows)}`}
                        columns={typeColumns}
                        rows={preview}
                    />
                )}

                {examples.length > 0 && (
                    <RowsTable
                        title="Lignes non importees"
                        description={`Exemples de lignes ecartees · le rapport CSV contient la liste complete`}
                        columns={typeColumns}
                        rows={examples}
                        withStatus
                    />
                )}
            </div>

            <Modal show={confirming} onClose={() => !committing && setConfirming(false)} maxWidth="md">
                <div className="p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><UploadIcon /></span>
                    <h2 className="mt-4 text-lg font-semibold text-ink">Confirmer l'import ?</h2>
                    <p className="mt-2 text-sm text-muted">
                        <span className="font-semibold text-ink">{number.format(batch.ready_rows)} {typeLabels[batch.type]?.toLowerCase() || 'lignes'}</span> seront ajoutes a la base.
                        {batch.duplicate_rows + batch.conflict_rows > 0 && ` Les ${number.format(batch.duplicate_rows + batch.conflict_rows)} doublons et conflits ne seront pas touches.`}
                    </p>
                    <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-xs text-muted">Pensez a telecharger une sauvegarde SQL avant un import important.</p>
                    <div className="mt-6 flex justify-end gap-2">
                        <button type="button" onClick={() => setConfirming(false)} disabled={committing} className="btn-secondary">Annuler</button>
                        <button type="button" onClick={commit} disabled={committing} className="btn-primary">
                            {committing && <Spinner />}
                            {committing ? 'Import en cours...' : 'Importer maintenant'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}

function Decision({ batch, imported, onImport }) {
    const period = batch.date_from ? `${formatDate(batch.date_from.slice(0, 10))} → ${formatDate(batch.date_to?.slice(0, 10))}` : null;

    if (imported) {
        return (
            <Banner tone="success" icon={<CheckIcon className="h-6 w-6" />} title="Import termine" text={`${number.format(batch.imported_rows)} lignes importees le ${dateTime.format(new Date(batch.updated_at))}.`} period={period} />
        );
    }

    if (batch.total_rows === 0) {
        return (
            <Banner
                tone="warning"
                icon={<WarningIcon />}
                title="Aucune ligne lue dans ce fichier"
                text="Le fichier est vide ou son format n'a pas ete reconnu. Verifiez ses colonnes depuis l'import avance, puis relancez l'analyse avec le bon fichier."
                action={<Link href={route('imports.advanced')} className="btn-secondary">Verifier le format</Link>}
            />
        );
    }

    if (batch.ready_rows === 0) {
        return (
            <Banner tone="neutral" icon={<CheckIcon className="h-6 w-6" />} title="Rien de nouveau a importer" text="Toutes les lignes de ce fichier sont deja presentes dans la base ou ont ete ecartees." period={period} />
        );
    }

    return (
        <Banner
            tone="ready"
            icon={<UploadIcon />}
            title={`${number.format(batch.ready_rows)} lignes pretes a importer`}
            text="Seules les lignes sans risque seront ajoutees. Les doublons et conflits restent inchanges."
            period={period}
            action={
                <button type="button" onClick={onImport} className="btn-primary px-5 py-3">
                    <UploadIcon className="h-4 w-4" />
                    Importer {number.format(batch.ready_rows)} lignes
                </button>
            }
        />
    );
}

function Banner({ tone, icon, title, text, period, action }) {
    const tones = {
        ready: 'border-brand-200 dark:border-brand-500/30',
        success: 'border-brand-200 dark:border-brand-500/30',
        warning: 'border-amber-200 dark:border-amber-500/30',
        neutral: 'border-line',
    };
    const iconTones = {
        ready: 'bg-brand-600 text-white',
        success: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
        warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
        neutral: 'bg-subtle text-muted',
    };

    return (
        <section className={`flex flex-col gap-5 rounded-2xl border bg-surface p-6 shadow-card sm:flex-row sm:items-center ${tones[tone]}`}>
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${iconTones[tone]}`}>{icon}</span>
            <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-ink">{title}</h2>
                <p className="mt-0.5 text-sm text-muted">{text}</p>
                {period && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-subtle px-2 py-1 text-xs text-muted">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" /></svg>
                        Periode : <span className="font-medium text-ink">{period}</span>
                    </p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </section>
    );
}

function Breakdown({ batch }) {
    const total = Math.max(batch.total_rows, segments.reduce((sum, segment) => sum + (batch[segment.key] || 0), 0)) || 1;
    return (
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-ink">Repartition des lignes</h2>
                <p className="text-sm text-muted"><span className="font-semibold tabular-nums text-ink">{number.format(batch.total_rows)}</span> lignes lues</p>
            </div>
            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-subtle">
                {segments.filter((segment) => batch[segment.key] > 0).map((segment) => (
                    <div key={segment.key} className={`${segment.color} min-w-[4px]`} style={{ width: `${(batch[segment.key] / total) * 100}%` }} title={`${segment.label} : ${number.format(batch[segment.key])}`} />
                ))}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {segments.map((segment) => {
                    const value = batch[segment.key] || 0;
                    return (
                        <div key={segment.key} className="flex items-start gap-2.5">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${segment.color} ${value ? '' : 'opacity-30'}`} />
                            <div>
                                <dt className="text-xs text-muted">{segment.label}</dt>
                                <dd className={`text-xl font-semibold tabular-nums ${value ? segment.text : 'text-muted/60'}`}>
                                    {number.format(value)}
                                    {value > 0 && <span className="ml-1.5 text-xs font-medium text-muted">{percent(value, total)}</span>}
                                </dd>
                            </div>
                        </div>
                    );
                })}
            </dl>
        </section>
    );
}

function RowsTable({ title, description, columns: tableColumns, rows, withStatus = false }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <header className="border-b border-line px-6 py-4">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                <p className="text-xs text-muted">{description}</p>
            </header>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs font-medium text-muted">
                            <th className="w-16 px-6 py-3 font-medium">Ligne</th>
                            {tableColumns.map((column) => <th key={column.label} className={`px-4 py-3 font-medium ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>)}
                            {withStatus && <th className="px-6 py-3 font-medium">Motif</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {rows.map((row) => (
                            <tr key={`${row.status || 'ready'}-${row.source_row}`} className="transition hover:bg-subtle">
                                <td className="px-6 py-3 font-mono text-xs text-muted">#{row.source_row}</td>
                                {tableColumns.map((column) => {
                                    const value = column.value(row.payload || {});
                                    return (
                                        <td key={column.label} className={`max-w-[18rem] truncate px-4 py-3 ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${column.mono ? 'font-mono text-xs' : ''} ${value ? (column.strong ? 'font-medium text-ink' : 'text-ink') : 'text-muted/50'}`} title={value || undefined}>
                                            {value || '—'}
                                        </td>
                                    );
                                })}
                                {withStatus && (
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${rowStatus[row.status]?.className || 'bg-subtle text-muted'}`}>{rowStatus[row.status]?.label || row.status}</span>
                                            <span className="truncate text-xs text-muted">{row.errors?.join(' ')}</span>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function percent(value, total) {
    const ratio = (value / total) * 100;
    return `${ratio < 1 ? '<1' : Math.round(ratio)} %`;
}

function Spinner() {
    return <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" className="opacity-75" /></svg>;
}

function CheckIcon({ className = 'h-5 w-5' }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
}

function WarningIcon() {
    return <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
}

function UploadIcon({ className = 'h-6 w-6' }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>;
}
