import { DateInput, Field, FormLayout, formatDate, inputClass, Section, ServicePicker, SummaryHeader, SummaryList, SummaryRow } from '@/Components/FormKit';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const quantity = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const movementTypes = [
    { value: 'E', label: 'Entree', tone: 'bg-brand-600 text-white dark:bg-brand-500' },
    { value: 'S', label: 'Sortie', tone: 'bg-gold-400 text-brand-900' },
];

export default function Form({ article = null, services }) {
    const editing = Boolean(article);
    const { data, setData, post, put, processing, errors, isDirty } = useForm({
        service_id: article?.service_id || '',
        description: article?.description || '',
        mouvement: article?.mouvement || '',
        // The API serialises dates as ISO timestamps; the date input needs YYYY-MM-DD.
        date_mouvement: article?.date_mouvement?.slice(0, 10) || '',
        quantite_entree: article?.quantite_entree || '',
        quantite_sortie: article?.quantite_sortie || '',
        numero_bon: article?.numero_bon || '',
        numero_inventaire: article?.numero_inventaire || '',
        service_code_source: article?.service_code_source || '',
        observation: article?.observation || '',
    });
    const [customMovement, setCustomMovement] = useState(Boolean(article?.mouvement) && !['E', 'S'].includes(article.mouvement));
    const selectedService = services.find((service) => String(service.id) === String(data.service_id));
    const movementLabel = movementTypes.find((type) => type.value === data.mouvement)?.label || data.mouvement;
    const title = editing ? 'Modifier un article' : 'Nouvel article';

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true };
        editing ? put(route('articles.update', article.id), options) : post(route('articles.store'), options);
    };

    const text = (name) => ({ id: name, value: data[name], onChange: (event) => setData(name, event.target.value), className: inputClass(errors[name]) });

    const chooseMovement = (value) => {
        setCustomMovement(false);
        setData('mouvement', data.mouvement === value ? '' : value);
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Inventaire · Articles"
                    title={title}
                    description={editing ? article.description : "Enregistrez un mouvement d'inventaire : entree ou sortie de materiel."}
                    actions={<Link href={route('articles.index')} className="btn-secondary"><BackIcon />Retour a la liste</Link>}
                />
            }
        >
            <Head title={title} />

            <FormLayout
                onSubmit={submit}
                errors={errors}
                processing={processing}
                isDirty={isDirty}
                submitLabel={editing ? 'Enregistrer les modifications' : "Enregistrer l'article"}
                cancelHref={route('articles.index')}
                summary={<>
                    <SummaryHeader label="Article">
                        <p className={`break-words text-lg font-semibold leading-snug ${data.description ? '' : 'text-brand-100/50'}`}>{data.description || 'Designation a saisir'}</p>
                        {movementLabel && <span className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{movementLabel}</span>}
                    </SummaryHeader>
                    <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
                        <QuantityTile label="Entree" value={data.quantite_entree} sign="+" tone="text-brand-600 dark:text-brand-300" />
                        <QuantityTile label="Sortie" value={data.quantite_sortie} sign="−" tone="text-gold-500" />
                    </div>
                    <SummaryList>
                        <SummaryRow label="Date" value={formatDate(data.date_mouvement)} />
                        <SummaryRow label="Service" value={selectedService && `${selectedService.code} · ${selectedService.name}`} />
                        <SummaryRow label="N° bon" value={data.numero_bon} mono />
                        <SummaryRow label="N° inventaire" value={data.numero_inventaire} mono />
                    </SummaryList>
                </>}
            >
                <Section number="1" title="Article" description="Designation et identification du materiel.">
                    <Field label="Designation" name="description" error={errors.description} required wide>
                        <input {...text('description')} placeholder="ex. TABLEAU BLANC" autoFocus={!editing} />
                    </Field>
                    <Field label="N° inventaire" name="numero_inventaire" error={errors.numero_inventaire}>
                        <input {...text('numero_inventaire')} placeholder="ex. 35632" className={`${inputClass(errors.numero_inventaire)} font-mono`} />
                    </Field>
                </Section>

                <Section number="2" title="Mouvement" description="Type, date et quantites du mouvement.">
                    <Field label="Type de mouvement" name="mouvement" error={errors.mouvement} wide>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-xl border border-line bg-subtle p-1" role="radiogroup" aria-label="Type de mouvement">
                                {movementTypes.map((type) => {
                                    const active = !customMovement && data.mouvement === type.value;
                                    return (
                                        <button key={type.value} type="button" role="radio" aria-checked={active} onClick={() => chooseMovement(type.value)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${active ? `${type.tone} shadow-sm` : 'text-muted hover:text-ink'}`}>
                                            {type.label}
                                        </button>
                                    );
                                })}
                                <button type="button" role="radio" aria-checked={customMovement} onClick={() => { setCustomMovement(true); setData('mouvement', ''); }} className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${customMovement ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                                    Autre
                                </button>
                            </div>
                            {customMovement && <div className="w-28"><input {...text('mouvement')} maxLength={10} placeholder="Code" autoFocus className={`${inputClass(errors.mouvement)} font-mono`} /></div>}
                        </div>
                    </Field>
                    <Field label="Date du mouvement" name="date_mouvement" error={errors.date_mouvement}>
                        <DateInput {...text('date_mouvement')} />
                    </Field>
                    <Field label="N° bon" name="numero_bon" error={errors.numero_bon}>
                        <input {...text('numero_bon')} placeholder="ex. 042353" className={`${inputClass(errors.numero_bon)} font-mono`} />
                    </Field>
                    <Field label="Quantite entree" name="quantite_entree" error={errors.quantite_entree}>
                        <QuantityInput {...text('quantite_entree')} className={inputClass(errors.quantite_entree)} />
                    </Field>
                    <Field label="Quantite sortie" name="quantite_sortie" error={errors.quantite_sortie}>
                        <QuantityInput {...text('quantite_sortie')} className={inputClass(errors.quantite_sortie)} />
                    </Field>
                </Section>

                <Section number="3" title="Affectation" description="Service concerne et remarques.">
                    <Field label="Service" name="service_id" error={errors.service_id}>
                        <ServicePicker services={services} value={data.service_id} onChange={(value) => setData('service_id', value)} error={errors.service_id} />
                    </Field>
                    <Field label="Code service source" name="service_code_source" error={errors.service_code_source} hint="Code d'origine dans l'archive">
                        <input {...text('service_code_source')} className={`${inputClass(errors.service_code_source)} font-mono`} />
                    </Field>
                    <Field label="Observation" name="observation" error={errors.observation} wide>
                        <textarea {...text('observation')} rows="3" placeholder="ex. Affecte au service 88" className={`${inputClass(errors.observation)} resize-y`} />
                    </Field>
                </Section>
            </FormLayout>
        </AuthenticatedLayout>
    );
}

function QuantityInput({ className, ...props }) {
    return (
        <div className="relative">
            <input {...props} type="number" min="0" step="0.001" inputMode="decimal" placeholder="0" className={`${className} pr-16 tabular-nums`} />
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-muted">unite(s)</span>
        </div>
    );
}

function QuantityTile({ label, value, sign, tone }) {
    const amount = Number(value) || 0;
    return (
        <div className="px-6 py-4">
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className={`mt-0.5 text-xl font-semibold tabular-nums ${amount ? tone : 'text-muted/60'}`}>{amount ? `${sign}${quantity.format(amount)}` : '0'}</p>
        </div>
    );
}
