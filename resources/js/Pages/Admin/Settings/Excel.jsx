import PageHeader from '@/Components/PageHeader';
import { Card, ColorPicker, ColumnsEditor, Field, FieldError, SaveBar, ServicePicker, SettingsTabs, Toggle, fieldClass, setPath } from '@/Components/SettingsKit';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

const sorts = [['date_desc', 'Date (plus récent d abord)'], ['date_asc', 'Date (plus ancien d abord)'], ['service', 'Service, puis date'], ['numero_inventaire', 'Numéro d inventaire'], ['description', 'Désignation (A → Z)']];
const dateExamples = { 'dd/mm/yyyy': '31/12/2025', 'yyyy-mm-dd': '2025-12-31', 'dd/mm/yy': '31/12/25', 'mm/yyyy': '12/2025' };
const numericKeys = ['quantite_entree', 'quantite_sortie', 'prix_unitaire', 'valeur'];

export default function Excel({ settings, defaults, options, services, establishment, lastUpdate }) {
    const { flash = {} } = usePage().props;
    const { data, setData, setDefaults, put, processing, isDirty, reset, errors } = useForm(settings);
    const [serviceId, setServiceId] = useState('');
    const [preview, setPreview] = useState({ columns: [], rows: [], total: 0, loading: true, error: null });
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setPreview((current) => ({ ...current, loading: true, error: null }));
            axios.post(route('admin.settings.excel.preview'), { ...data, service_id: serviceId || null }, { signal: controller.signal })
                .then((response) => setPreview({ ...response.data, loading: false, error: null }))
                .catch((error) => {
                    if (axios.isCancel(error)) return;
                    const body = error.response?.data;
                    setPreview((current) => ({ ...current, loading: false, error: Object.values(body?.errors || {})[0]?.[0] || body?.message || 'Aperçu indisponible.' }));
                });
        }, 400);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [data, serviceId]);

    const update = (path, value) => setData((current) => setPath(current, path, value));
    const save = (event) => { event.preventDefault(); put(route('admin.settings.excel.update'), { preserveScroll: true, onSuccess: () => setDefaults() }); };
    const restoreDefaults = () => {
        if (!window.confirm('Remettre tous les paramètres de l export Excel par défaut ?')) return;
        router.post(route('admin.settings.excel.reset'), {}, { preserveScroll: true, onSuccess: () => { setData(defaults); setDefaults(defaults); } });
    };
    const downloadSample = () => {
        setDownloading(true);
        axios.post(route('admin.settings.excel.sample'), { ...data, service_id: serviceId || null }, { responseType: 'blob' })
            .then((response) => {
                const name = /filename="?([^";]+)"?/.exec(response.headers['content-disposition'] || '')?.[1] || 'exemple.xlsx';
                const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(response.data), download: name.replace('.xlsx', '-exemple.xlsx') });
                link.click();
                URL.revokeObjectURL(link.href);
            })
            .catch(() => setPreview((current) => ({ ...current, error: 'Impossible de générer le fichier d exemple.' })))
            .finally(() => setDownloading(false));
    };

    const enabledCount = data.columns.filter((column) => column.enabled).length;
    const headerColor = data.sheet.header_color;
    const hasTotals = data.document.show_totals && preview.columns.some((column) => ['quantite_entree', 'quantite_sortie', 'valeur'].includes(column.key));

    return (
        <AuthenticatedLayout header={<PageHeader eyebrow="Administration" title="Paramètres" description="Mise en page des impressions et des exports des articles." />}>
            <Head title="Paramètres de l export Excel" />
            <form onSubmit={save} data-shortcut-save className="px-5 pb-14 pt-7 lg:px-10">
                <SettingsTabs current="excel" />
                {flash.success && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{flash.success}</div>}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:items-start">
                    <div className="space-y-5">
                        <Card title="Colonnes" description={`${enabledCount} colonne${enabledCount > 1 ? 's' : ''} exportée${enabledCount > 1 ? 's' : ''}. Cochez, renommez et réordonnez.`}>
                            <ColumnsEditor columns={data.columns} names={options.columns} onChange={(columns) => update('columns', columns)} />
                            <FieldError message={errors.columns} />
                            <p className="text-xs text-muted">Les dates et les quantités restent de vraies dates et de vrais nombres : Excel peut les trier et en faire la somme.</p>
                        </Card>

                        <Card title="Contenu" description="Ordre des lignes, titre en haut de la feuille et ligne de totaux.">
                            <Field label="Trier les lignes par"><select value={data.document.sort} onChange={(event) => update('document.sort', event.target.value)} className={`form-select ${fieldClass}`}>{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                            <Toggle label="Bloc de titre en haut (établissement, titre, date, filtres)" checked={data.document.title_rows} onChange={(value) => update('document.title_rows', value)} />
                            {data.document.title_rows && <Field label="Titre" error={errors['document.title']}><input value={data.document.title} onChange={(event) => update('document.title', event.target.value)} className={fieldClass} /></Field>}
                            <Toggle label="Ligne de totaux à la fin (quantités, valeur)" checked={data.document.show_totals} onChange={(value) => update('document.show_totals', value)} />
                            <Field label="Format des dates"><select value={data.document.date_format} onChange={(event) => update('document.date_format', event.target.value)} className={`form-select ${fieldClass}`}>{options.dateFormats.map((format) => <option key={format} value={format}>{dateExamples[format] ?? format}</option>)}</select></Field>
                        </Card>

                        <Card title="Feuille et fichier" description="Nom de l onglet, couleur de l en-tête, filtres et nom du fichier.">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Nom de l onglet" error={errors['sheet.name']}><input value={data.sheet.name} maxLength={31} onChange={(event) => update('sheet.name', event.target.value)} className={fieldClass} /></Field>
                                <Field label="Début du nom de fichier" error={errors['document.file_prefix']}><input value={data.document.file_prefix} onChange={(event) => update('document.file_prefix', event.target.value)} className={fieldClass} /></Field>
                            </div>
                            <p className="-mt-2 text-xs text-muted">Exemple : <span className="font-mono">{data.document.file_prefix || '…'}-service-98-{new Date().toISOString().slice(0, 10)}.xlsx</span>. Lettres, chiffres, - et _ seulement.</p>
                            <Field label="Couleur de l en-tête"><ColorPicker value={headerColor} onChange={(value) => update('sheet.header_color', value)} /></Field>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Toggle label="Figer la ligne d en-tête" checked={data.sheet.freeze_header} onChange={(value) => update('sheet.freeze_header', value)} />
                                <Toggle label="Filtres sur chaque colonne" checked={data.sheet.autofilter} onChange={(value) => update('sheet.autofilter', value)} />
                                <Toggle label="Lignes alternées teintées" checked={data.sheet.zebra} onChange={(value) => update('sheet.zebra', value)} />
                            </div>
                        </Card>
                    </div>

                    <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-[#173126]/5 xl:sticky xl:top-6">
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-subtle px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-ink">Aperçu</h2>
                                <p className="text-xs text-muted">{preview.loading ? 'Mise à jour…' : `${preview.rows.length} premières lignes sur ${preview.total.toLocaleString('fr-FR')}.`}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <ServicePicker services={services} value={serviceId} onChange={setServiceId} />
                                <button type="button" onClick={downloadSample} disabled={downloading || !!preview.error} className="btn-secondary py-2 disabled:opacity-50" title="Fichier .xlsx de 50 lignes avec les réglages affichés, même non enregistrés">{downloading ? 'Génération…' : 'Télécharger un exemple'}</button>
                            </div>
                        </header>

                        {preview.error ? <p className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{preview.error}</p> : (
                            <div className={`overflow-auto bg-white transition dark:bg-white ${preview.loading ? 'opacity-60' : ''}`} style={{ maxHeight: '75vh' }}>
                                <div className="flex items-center gap-2 border-b border-[#d4d4d4] bg-[#f3f3f3] px-3 py-1.5 text-xs text-[#444]">
                                    <span className="rounded-t border border-b-0 border-[#d4d4d4] bg-white px-3 py-1 font-semibold" style={{ color: headerColor }}>{data.sheet.name || 'Feuille'}</span>
                                    {data.sheet.freeze_header && <span>· en-tête figé</span>}
                                    {data.sheet.autofilter && <span>· filtres</span>}
                                </div>
                                <table className="min-w-full border-collapse font-[Calibri,Arial,sans-serif] text-[12px] text-[#222]">
                                    <tbody>
                                        {data.document.title_rows && <>
                                            <SheetRow number={1} span={preview.columns.length}><span className="font-bold" title="1re ligne de l en-tête du PDF">{establishment || '—'}</span></SheetRow>
                                            <SheetRow number={2} span={preview.columns.length}><span className="text-base font-bold" style={{ color: headerColor }}>{data.document.title}</span></SheetRow>
                                            <SheetRow number={3} span={preview.columns.length}><span className="italic">Généré le … · {preview.total.toLocaleString('fr-FR')} article(s)</span></SheetRow>
                                            <SheetRow number={4} span={preview.columns.length}>Recherche : … · Service : …</SheetRow>
                                            <SheetRow number={5} span={preview.columns.length}>{' '}</SheetRow>
                                        </>}
                                        <tr>
                                            <RowNumber>{data.document.title_rows ? 6 : 1}</RowNumber>
                                            {preview.columns.map((column) => (
                                                <th key={column.key} className="whitespace-nowrap border border-[#d4d4d4] px-2 py-1 text-center font-bold text-white" style={{ backgroundColor: headerColor }}>
                                                    {column.label}{data.sheet.autofilter && <span className="ml-1 inline-block rounded-sm bg-white/90 px-0.5 text-[9px] text-[#444]">▾</span>}
                                                </th>
                                            ))}
                                        </tr>
                                        {preview.rows.map((row, index) => (
                                            <tr key={index} style={data.sheet.zebra && index % 2 === 1 ? { backgroundColor: `${headerColor}14` } : undefined}>
                                                <RowNumber>{index + (data.document.title_rows ? 7 : 2)}</RowNumber>
                                                {preview.columns.map((column, i) => (
                                                    <td key={column.key} className={`max-w-[260px] truncate border border-[#e1e1e1] px-2 py-1 ${numericKeys.includes(column.key) ? 'text-right tabular-nums' : ''}`}>{formatCell(row[i], column.key)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {hasTotals && (
                                            <tr className="font-bold" style={{ backgroundColor: `${headerColor}26` }}>
                                                <RowNumber>…</RowNumber>
                                                {preview.columns.map((column, i) => <td key={column.key} className="border border-[#e1e1e1] px-2 py-1 text-right">{i === 0 ? 'Total' : ['quantite_entree', 'quantite_sortie', 'valeur'].includes(column.key) ? 'Σ' : ''}</td>)}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                <SaveBar isDirty={isDirty} processing={processing} lastUpdate={lastUpdate} onReset={restoreDefaults} onCancel={() => reset()} dirtyMessage="Modifications non enregistrées : l aperçu et l exemple les montrent déjà, les exports non." />
            </form>
        </AuthenticatedLayout>
    );
}

function RowNumber({ children }) {
    return <td className="w-9 select-none border border-[#d4d4d4] bg-[#f3f3f3] px-1 text-center text-[11px] text-[#666]">{children}</td>;
}

function SheetRow({ number, span, children }) {
    return <tr><RowNumber>{number}</RowNumber><td colSpan={Math.max(span, 1)} className="border border-[#e1e1e1] px-2 py-1">{children}</td></tr>;
}

function formatCell(value, key) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: ['prix_unitaire', 'valeur'].includes(key) ? 2 : 0, maximumFractionDigits: 2 }).format(value);
    return value;
}
