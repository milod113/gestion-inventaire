import PageHeader from '@/Components/PageHeader';
import { Card, ColorPicker, ColumnsEditor, Field, FieldError, IconButton, SaveBar, ServicePicker, SettingsTabs, Toggle, fieldClass, setPath } from '@/Components/SettingsKit';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

const sorts = [['date_desc', 'Date (plus récent d abord)'], ['date_asc', 'Date (plus ancien d abord)'], ['numero_inventaire', 'Numéro d inventaire'], ['description', 'Désignation (A → Z)']];

export default function Pdf({ settings, defaults, options, customLogo, logo, services, lastUpdate }) {
    const { flash = {} } = usePage().props;
    const { data, setData, setDefaults, put, processing, isDirty, reset, errors } = useForm(settings);
    const [serviceId, setServiceId] = useState('');
    const [preview, setPreview] = useState({ url: null, loading: true, error: null });
    const [logoVersion, setLogoVersion] = useState(0);
    const urlRef = useRef(null);

    // Re-render the preview shortly after the last change.
    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setPreview((current) => ({ ...current, loading: true, error: null }));
            axios.post(route('admin.settings.pdf.preview'), { ...data, service_id: serviceId || null }, { responseType: 'blob', signal: controller.signal })
                .then((response) => {
                    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
                    urlRef.current = URL.createObjectURL(response.data);
                    setPreview({ url: urlRef.current, loading: false, error: null });
                })
                .catch(async (error) => {
                    if (axios.isCancel(error)) return;
                    let message = 'Aperçu indisponible.';
                    try { const body = JSON.parse(await error.response.data.text()); message = Object.values(body.errors || {})[0]?.[0] || body.message || message; } catch { /* keep generic message */ }
                    setPreview((current) => ({ ...current, loading: false, error: message }));
                });
        }, 600);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [data, serviceId, logoVersion]);

    useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

    const update = (path, value) => setData((current) => setPath(current, path, value));
    const updateList = (path, index, value) => update(path, path.split('.').reduce((node, key) => node[key], data).map((item, i) => (i === index ? value : item)));

    const save = (event) => { event.preventDefault(); put(route('admin.settings.pdf.update'), { preserveScroll: true, onSuccess: () => setDefaults() }); };
    const restoreDefaults = () => {
        if (!window.confirm('Remettre tous les paramètres du PDF par défaut ? Les réglages enregistrés seront remplacés.')) return;
        router.post(route('admin.settings.pdf.reset'), {}, { preserveScroll: true, onSuccess: () => { setData(defaults); setDefaults(defaults); } });
    };
    const uploadLogo = (file) => router.post(route('admin.settings.pdf.logo'), { logo: file }, { forceFormData: true, preserveScroll: true, preserveState: true, only: ['customLogo', 'logo', 'flash', 'errors'], onSuccess: () => setLogoVersion((v) => v + 1) });
    const removeLogo = () => router.delete(route('admin.settings.pdf.logo.delete'), { preserveScroll: true, preserveState: true, only: ['customLogo', 'logo', 'flash'], onSuccess: () => setLogoVersion((v) => v + 1) });
    const enabledCount = data.columns.filter((column) => column.enabled).length;

    return (
        <AuthenticatedLayout header={<PageHeader eyebrow="Administration" title="Paramètres" description="Mise en page des impressions et des exports des articles." />}>
            <Head title="Paramètres du PDF" />
            <form onSubmit={save} data-shortcut-save className="px-5 pb-14 pt-7 lg:px-10">
                <SettingsTabs current="pdf" />
                {flash.success && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{flash.success}</div>}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:items-start">
                    <div className="space-y-5">
                        <Card title="En-tête" description="Logo et lignes de l établissement en haut de la première page.">
                            <div className="flex flex-wrap items-center gap-4">
                                {logo && data.header.show_logo ? <img src={logo} alt="Logo" className="h-16 w-16 rounded-xl border border-line bg-white object-contain p-1" /> : <span className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">Sans logo</span>}
                                <div className="space-y-2">
                                    <Toggle label="Afficher le logo" checked={data.header.show_logo} onChange={(value) => update('header.show_logo', value)} />
                                    <div className="flex flex-wrap gap-2">
                                        <label className="btn-secondary cursor-pointer py-1.5 text-xs">Remplacer le logo<input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => event.target.files[0] && uploadLogo(event.target.files[0])} /></label>
                                        {customLogo && <button type="button" onClick={removeLogo} className="btn-secondary py-1.5 text-xs">Revenir au logo du CHU</button>}
                                    </div>
                                    <FieldError message={errors.logo} />
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {data.header.lines.map((line, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input value={line} onChange={(event) => updateList('header.lines', index, event.target.value)} placeholder={`Ligne ${index + 1}`} className={`${fieldClass} ${index === 0 ? 'font-bold' : ''}`} />
                                        <IconButton title="Supprimer la ligne" onClick={() => update('header.lines', data.header.lines.filter((_, i) => i !== index))}>×</IconButton>
                                    </div>
                                ))}
                                {data.header.lines.length < 5 && <button type="button" onClick={() => update('header.lines', [...data.header.lines, ''])} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">+ Ajouter une ligne</button>}
                            </div>
                        </Card>

                        <Card title="Document" description="Titre, informations affichées et organisation des articles.">
                            <Field label="Titre" error={errors['document.title']}><input value={data.document.title} onChange={(event) => update('document.title', event.target.value)} className={fieldClass} /></Field>
                            <Field label="Trier les articles par"><select value={data.document.sort} onChange={(event) => update('document.sort', event.target.value)} className={`form-select ${fieldClass}`}>{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Toggle label="Regrouper par service" checked={data.document.group_by_service} onChange={(value) => update('document.group_by_service', value)} />
                                <Toggle label="Totaux (quantités, valeur)" checked={data.document.show_totals} onChange={(value) => update('document.show_totals', value)} />
                                <Toggle label="Date de génération et nombre d articles" checked={data.document.show_generated_at} onChange={(value) => update('document.show_generated_at', value)} />
                                <Toggle label="Rappel des filtres (recherche, service)" checked={data.document.show_filters} onChange={(value) => update('document.show_filters', value)} />
                            </div>
                        </Card>

                        <Card title="Colonnes" description={`${enabledCount} colonne${enabledCount > 1 ? 's' : ''} imprimée${enabledCount > 1 ? 's' : ''}. Cochez, renommez et réordonnez.`}>
                            <ColumnsEditor columns={data.columns} names={options.columns} onChange={(columns) => update('columns', columns)}
                                note={(column) => column.key === 'service' && data.document.group_by_service && column.enabled && <span className="shrink-0 text-xs text-muted" title="Le service figure déjà dans le titre de chaque groupe">masquée si regroupé</span>} />
                            <p className="text-xs text-muted">« Valeur » = prix unitaire × quantité entrée. Elle reste vide pour les articles sans prix.</p>
                        </Card>

                        <Card title="Page et style" description="Format du papier, police, taille du texte et couleur.">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Papier"><select value={data.page.paper} onChange={(event) => update('page.paper', event.target.value)} className={`form-select ${fieldClass}`}><option value="a4">A4</option><option value="a3">A3</option></select></Field>
                                <Field label="Orientation"><select value={data.page.orientation} onChange={(event) => update('page.orientation', event.target.value)} className={`form-select ${fieldClass}`}><option value="landscape">Paysage</option><option value="portrait">Portrait</option></select></Field>
                                <Field label="Police"><select value={data.page.font} onChange={(event) => update('page.font', event.target.value)} className={`form-select ${fieldClass}`}>{options.fonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></Field>
                                <Field label={`Taille du texte du tableau : ${data.page.font_size} px`}><input type="range" min="7" max="14" value={data.page.font_size} onChange={(event) => update('page.font_size', Number(event.target.value))} className="mt-2 w-full accent-brand-600" /></Field>
                            </div>
                            <Field label="Couleur"><ColorPicker value={data.page.accent} onChange={(value) => update('page.accent', value)} /></Field>
                            <Toggle label="Lignes alternées (une sur deux teintée)" checked={data.page.zebra} onChange={(value) => update('page.zebra', value)} />
                        </Card>

                        <Card title="Pied de page et signatures" description="Texte en bas de chaque page et cases de signature à la fin du document.">
                            <Field label="Texte du pied de page"><input value={data.footer.text ?? ''} onChange={(event) => update('footer.text', event.target.value)} className={fieldClass} /></Field>
                            <Toggle label="Numéroter les pages (Page 1 / 10)" checked={data.footer.page_numbers} onChange={(value) => update('footer.page_numbers', value)} />
                            <Toggle label="Ajouter des cases de signature" checked={data.signatures.enabled} onChange={(value) => update('signatures.enabled', value)} />
                            {data.signatures.enabled && (
                                <div className="space-y-2">
                                    {data.signatures.labels.map((label, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input value={label} onChange={(event) => updateList('signatures.labels', index, event.target.value)} placeholder="Ex. Le chef de service" className={fieldClass} />
                                            <IconButton title="Supprimer" onClick={() => update('signatures.labels', data.signatures.labels.filter((_, i) => i !== index))}>×</IconButton>
                                        </div>
                                    ))}
                                    {data.signatures.labels.length < 4 && <button type="button" onClick={() => update('signatures.labels', [...data.signatures.labels, ''])} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">+ Ajouter une signature</button>}
                                </div>
                            )}
                        </Card>
                    </div>

                    <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-[#173126]/5 xl:sticky xl:top-6">
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-subtle px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-ink">Aperçu</h2>
                                <p className="text-xs text-muted">{preview.loading ? 'Mise à jour…' : '30 articles réels, mis à jour à chaque modification.'}</p>
                            </div>
                            <ServicePicker services={services} value={serviceId} onChange={setServiceId} />
                        </header>
                        <div className="relative h-[75vh] min-h-[480px] bg-[#525659]">
                            {preview.url && <iframe title="Aperçu du PDF" src={`${preview.url}#view=FitH`} className={`h-full w-full transition ${preview.loading ? 'opacity-60' : ''}`} />}
                            {preview.error && <div className="absolute inset-x-5 top-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{preview.error}</div>}
                            {!preview.url && !preview.error && <p className="absolute inset-0 grid place-items-center text-sm text-white/80">Génération de l aperçu…</p>}
                        </div>
                    </section>
                </div>

                <SaveBar isDirty={isDirty} processing={processing} lastUpdate={lastUpdate} onReset={restoreDefaults} onCancel={() => reset()} dirtyMessage="Modifications non enregistrées : l aperçu les montre déjà, les impressions non." />
            </form>
        </AuthenticatedLayout>
    );
}
