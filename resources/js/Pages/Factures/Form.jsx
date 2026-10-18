import { DateInput, Field, FormLayout, formatDate, inputClass, Section, SummaryHeader, SummaryList, SummaryRow } from '@/Components/FormKit';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', minimumFractionDigits: 2 });

export default function Form({ facture = null, services = {}, motifs = {} }) {
    const isEditing = Boolean(facture);
    const isCorrection = facture?.source === 'import';
    const { data, setData, post, put, processing, errors, isDirty } = useForm({
        n_bon: facture?.n_bon || '', numero_facture: facture?.numero_facture || '', date_facture: facture?.date_facture || '',
        montant: facture?.montant || '', code_fournisseur: facture?.code_fournisseur || '', imputation: facture?.imputation || '',
        n_journal: facture?.n_journal || '', n_inventaire: facture?.n_inventaire || '', cfac: facture?.cfac || '',
        n_mandat: facture?.n_mandat || '', date_mandat: facture?.date_mandat || '', service_reference: facture?.service_reference || '',
        ...(isCorrection ? { motif_correction: '', motif_precision: '' } : {}),
    });
    // Tant que la reference importee n'est pas changee, on la rattache a son service via sa forme normalisee (ex. "ECONOMET" -> ECONOMAT).
    const selectedReference = facture && data.service_reference === (facture.service_reference || '') ? facture.service_reference_normalisee : data.service_reference;
    const selectedService = services[selectedReference] || (data.service_reference || null);
    const title = isCorrection ? 'Corriger une facture importee' : isEditing ? 'Modifier une facture' : 'Nouvelle facture';
    const origine = facture?.valeurs_origine || {};
    // Rappelle la valeur importee d'origine sous chaque champ deja corrige.
    const hint = (name, fallback) => {
        if (!(name in origine)) return fallback;
        const value = origine[name];
        const shown = value === null || value === '' ? 'vide' : value;
        return `Valeur importee d'origine : ${shown}`;
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true };
        isEditing ? put(route('factures.update', facture.id), options) : post(route('factures.store'), options);
    };

    const text = (name) => ({ id: name, value: data[name], onChange: (event) => setData(name, event.target.value), className: inputClass(errors[name]) });

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Comptabilite · Factures"
                    title={title}
                    description={isCorrection ? `Facture N° ${facture.numero_facture || facture.id} · les valeurs importees d'origine sont conservees` : isEditing ? `Facture N° ${facture.numero_facture || facture.id}` : 'Renseignez les informations de la facture puis enregistrez.'}
                    actions={<Link href={route('factures.index')} className="btn-secondary"><BackIcon />Retour a la liste</Link>}
                />
            }
        >
            <Head title={title} />

            <FormLayout
                onSubmit={submit}
                errors={errors}
                processing={processing}
                isDirty={isDirty}
                submitLabel={isCorrection ? 'Enregistrer la correction' : isEditing ? 'Enregistrer les modifications' : 'Enregistrer la facture'}
                cancelHref={isCorrection ? route('factures.show', facture.id) : route('factures.index')}
                summary={<>
                    <SummaryHeader label="Montant">
                        <p className="break-all text-2xl font-semibold tabular-nums">{currency.format(Number(data.montant) || 0)}</p>
                    </SummaryHeader>
                    <SummaryList>
                        <SummaryRow label="Facture" value={data.numero_facture && `N° ${data.numero_facture}`} />
                        <SummaryRow label="Date" value={formatDate(data.date_facture)} />
                        <SummaryRow label="Fournisseur" value={data.code_fournisseur} mono />
                        <SummaryRow label="Service" value={selectedService} />
                        <SummaryRow label="Mandat" value={data.n_mandat && `N° ${data.n_mandat}`} />
                    </SummaryList>
                </>}
            >
                <Section number="1" title="Facture" description="Identification et montant de la facture.">
                    <Field label="N° facture" name="numero_facture" error={errors.numero_facture} hint={hint('numero_facture')}>
                        <input {...text('numero_facture')} placeholder="ex. 015" autoFocus={!isEditing} />
                    </Field>
                    <Field label="Date facture" name="date_facture" error={errors.date_facture} hint={hint('date_facture')}>
                        <DateInput {...text('date_facture')} />
                    </Field>
                    <Field label="Montant" name="montant" error={errors.montant} hint={hint('montant')}>
                        <div className="relative">
                            <input {...text('montant')} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0,00" className={`${inputClass(errors.montant)} pr-14 tabular-nums`} />
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-muted">DZD</span>
                        </div>
                    </Field>
                    <Field label="Code fournisseur" name="code_fournisseur" error={errors.code_fournisseur} hint={hint('code_fournisseur')}>
                        <input {...text('code_fournisseur')} placeholder="ex. PR.401" className={`${inputClass(errors.code_fournisseur)} font-mono`} />
                    </Field>
                </Section>

                <Section number="2" title="Affectation" description="Service beneficiaire et imputation budgetaire.">
                    <Field label="Service" name="service_reference" error={errors.service_reference} hint={hint('service_reference', selectedReference && !services[selectedReference] ? `Reference importee : ${data.service_reference}` : undefined)} wide>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Service">
                            {Object.entries(services).map(([value, label]) => {
                                const active = selectedReference === value;
                                return (
                                    <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setData('service_reference', facture?.service_reference_normalisee === value ? facture.service_reference : value)} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${active ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200' : 'border-line bg-subtle text-muted hover:text-ink'}`}>
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                    <Field label="Imputation" name="imputation" error={errors.imputation} hint={hint('imputation')}>
                        <input {...text('imputation')} placeholder="ex. VI.I.1." className={`${inputClass(errors.imputation)} font-mono`} />
                    </Field>
                    <Field label="N° inventaire" name="n_inventaire" error={errors.n_inventaire} hint={hint('n_inventaire')}>
                        <input {...text('n_inventaire')} />
                    </Field>
                </Section>

                <Section number="3" title="Engagement et mandatement" description="References du bon, du journal et du mandat.">
                    <Field label="N° bon" name="n_bon" error={errors.n_bon} hint={hint('n_bon')}>
                        <input {...text('n_bon')} placeholder="ex. CONV" />
                    </Field>
                    <Field label="N° journal" name="n_journal" error={errors.n_journal} hint={hint('n_journal')}>
                        <input {...text('n_journal')} />
                    </Field>
                    <Field label="CFAC" name="cfac" error={errors.cfac} hint={hint('cfac')}>
                        <input {...text('cfac')} />
                    </Field>
                    <Field label="N° mandat" name="n_mandat" error={errors.n_mandat} hint={hint('n_mandat')}>
                        <input {...text('n_mandat')} />
                    </Field>
                    <Field label="Date mandat" name="date_mandat" error={errors.date_mandat} hint={hint('date_mandat')}>
                        <DateInput {...text('date_mandat')} />
                    </Field>
                </Section>

                {isCorrection && (
                    <Section number="4" title="Motif de la correction" description="Obligatoire : il sera visible dans l'historique de la facture.">
                        <Field label="Motif" name="motif_correction" error={errors.motif_correction} required wide>
                            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Motif de la correction">
                                {Object.entries(motifs).map(([value, label]) => {
                                    const active = data.motif_correction === value;
                                    return (
                                        <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setData('motif_correction', value)} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200' : 'border-line bg-subtle text-muted hover:text-ink'}`}>
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </Field>
                        {data.motif_correction === 'autre' ? (
                            <Field label="Precisez le motif" name="motif_precision" error={errors.motif_precision} required wide>
                                <textarea {...text('motif_precision')} rows="3" maxLength={500} autoFocus placeholder="ex. Facture remplacee par un avoir du fournisseur" className={`${inputClass(errors.motif_precision)} resize-y`} />
                            </Field>
                        ) : data.motif_correction && (
                            <Field label="Complement (facultatif)" name="motif_precision" error={errors.motif_precision} wide>
                                <textarea {...text('motif_precision')} rows="2" maxLength={500} placeholder="ex. Reference de la note de rejet du CF" className={`${inputClass(errors.motif_precision)} resize-y`} />
                            </Field>
                        )}
                    </Section>
                )}
            </FormLayout>
        </AuthenticatedLayout>
    );
}
