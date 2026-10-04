import { DateInput, Field, FormLayout, formatDate, inputClass, Section, ServicePicker, SummaryHeader, SummaryList, SummaryRow } from '@/Components/FormKit';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', minimumFractionDigits: 2 });

export default function Form({ facture = null, services }) {
    const isEditing = Boolean(facture);
    const { data, setData, post, put, processing, errors, isDirty } = useForm({
        service_id: facture?.service_id || '',
        n_bon: facture?.n_bon || '', numero_facture: facture?.numero_facture || '', date_facture: facture?.date_facture || '',
        montant: facture?.montant || '', code_fournisseur: facture?.code_fournisseur || '', imputation: facture?.imputation || '',
        n_journal: facture?.n_journal || '', n_inventaire: facture?.n_inventaire || '', cfac: facture?.cfac || '',
        n_mandat: facture?.n_mandat || '', date_mandat: facture?.date_mandat || '', service_reference: facture?.service_reference || '',
    });
    const selectedService = services.find((service) => String(service.id) === String(data.service_id));
    const title = isEditing ? 'Modifier une facture' : 'Nouvelle facture';

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
                    description={isEditing ? `Facture N° ${facture.numero_facture || facture.id}` : 'Renseignez les informations de la facture puis enregistrez.'}
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
                submitLabel={isEditing ? 'Enregistrer les modifications' : 'Enregistrer la facture'}
                cancelHref={route('factures.index')}
                summary={<>
                    <SummaryHeader label="Montant">
                        <p className="break-all text-2xl font-semibold tabular-nums">{currency.format(Number(data.montant) || 0)}</p>
                    </SummaryHeader>
                    <SummaryList>
                        <SummaryRow label="Facture" value={data.numero_facture && `N° ${data.numero_facture}`} />
                        <SummaryRow label="Date" value={formatDate(data.date_facture)} />
                        <SummaryRow label="Fournisseur" value={data.code_fournisseur} mono />
                        <SummaryRow label="Service" value={selectedService && `${selectedService.code} · ${selectedService.name}`} />
                        <SummaryRow label="Mandat" value={data.n_mandat && `N° ${data.n_mandat}`} />
                    </SummaryList>
                </>}
            >
                <Section number="1" title="Facture" description="Identification et montant de la facture.">
                    <Field label="N° facture" name="numero_facture" error={errors.numero_facture}>
                        <input {...text('numero_facture')} placeholder="ex. 015" autoFocus={!isEditing} />
                    </Field>
                    <Field label="Date facture" name="date_facture" error={errors.date_facture}>
                        <DateInput {...text('date_facture')} />
                    </Field>
                    <Field label="Montant" name="montant" error={errors.montant}>
                        <div className="relative">
                            <input {...text('montant')} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0,00" className={`${inputClass(errors.montant)} pr-14 tabular-nums`} />
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-muted">DZD</span>
                        </div>
                    </Field>
                    <Field label="Code fournisseur" name="code_fournisseur" error={errors.code_fournisseur}>
                        <input {...text('code_fournisseur')} placeholder="ex. PR.401" className={`${inputClass(errors.code_fournisseur)} font-mono`} />
                    </Field>
                </Section>

                <Section number="2" title="Affectation" description="Service beneficiaire et imputation budgetaire.">
                    <Field label="Service" name="service_id" error={errors.service_id} wide>
                        <ServicePicker services={services} value={data.service_id} onChange={(value) => setData('service_id', value)} error={errors.service_id} />
                    </Field>
                    <Field label="Reference service" name="service_reference" error={errors.service_reference} hint="Libelle d'origine, ex. ECONOMAT">
                        <input {...text('service_reference')} />
                    </Field>
                    <Field label="Imputation" name="imputation" error={errors.imputation}>
                        <input {...text('imputation')} placeholder="ex. VI.I.1." className={`${inputClass(errors.imputation)} font-mono`} />
                    </Field>
                    <Field label="N° inventaire" name="n_inventaire" error={errors.n_inventaire}>
                        <input {...text('n_inventaire')} />
                    </Field>
                </Section>

                <Section number="3" title="Engagement et mandatement" description="References du bon, du journal et du mandat.">
                    <Field label="N° bon" name="n_bon" error={errors.n_bon}>
                        <input {...text('n_bon')} placeholder="ex. CONV" />
                    </Field>
                    <Field label="N° journal" name="n_journal" error={errors.n_journal}>
                        <input {...text('n_journal')} />
                    </Field>
                    <Field label="CFAC" name="cfac" error={errors.cfac}>
                        <input {...text('cfac')} />
                    </Field>
                    <Field label="N° mandat" name="n_mandat" error={errors.n_mandat}>
                        <input {...text('n_mandat')} />
                    </Field>
                    <Field label="Date mandat" name="date_mandat" error={errors.date_mandat}>
                        <DateInput {...text('date_mandat')} />
                    </Field>
                </Section>
            </FormLayout>
        </AuthenticatedLayout>
    );
}
