import { DateInput, Field, FormLayout, formatDate, inputClass, ISO_DATE, Section, SummaryHeader, SummaryList, SummaryRow } from '@/Components/FormKit';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import SupplierPicker from '@/Components/SupplierPicker';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import amountInWords from '@/amountInWords';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', minimumFractionDigits: 2 });
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const choiceClass = (active) => `rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? 'border-brand-600 bg-brand-50 text-brand-800 ring-4 ring-brand-500/10 dark:bg-brand-950 dark:text-brand-200' : 'border-line bg-subtle text-muted hover:border-brand-300 hover:text-ink'}`;

export default function Form({ facture = null, services = {}, motifs = {} }) {
    const { auth } = usePage().props;
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
    const title = isCorrection ? 'Corriger une facture' : isEditing ? 'Modifier une facture' : 'Nouvelle facture';
    const origine = facture?.valeurs_origine || {};
    // Rappelle la valeur importee d'origine sous chaque champ deja corrige.
    const hint = (name, fallback) => {
        if (!(name in origine)) return fallback;
        const value = origine[name];
        const shown = value === null || value === '' ? 'vide' : value;
        return `Valeur d'origine : ${shown}`;
    };

    const amount = Number(data.montant) || 0;
    const words = data.montant !== '' && amount >= 0 ? amountInWords(data.montant) : null;
    const isMandated = Boolean(data.n_mandat && data.date_mandat);
    const mandateBeforeInvoice = ISO_DATE.test(data.date_mandat) && ISO_DATE.test(data.date_facture) && data.date_mandat < data.date_facture;
    const checklist = [
        ['N° facture', Boolean(data.numero_facture)],
        ['Date', Boolean(data.date_facture)],
        ['Montant', amount > 0],
        ['Fournisseur', Boolean(data.code_fournisseur)],
        ['Service', Boolean(data.service_reference)],
    ];

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
                    description={isCorrection ? `Facture N° ${facture.numero_facture || facture.id} · les valeurs d'origine sont conservees` : isEditing ? `Facture N° ${facture.numero_facture || facture.id}` : 'Renseignez les informations de la facture puis enregistrez. Vous pourrez ensuite y ajouter les articles.'}
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
                    <SummaryHeader label="Montant de la facture">
                        <p className={`break-all text-3xl font-semibold tracking-tight tabular-nums ${amount ? '' : 'text-brand-100/50'}`}>{currency.format(amount)}</p>
                        {words && amount > 0 && <p className="mt-2 text-xs leading-relaxed text-brand-100/80"><span className="text-brand-100/60">Arrete a la somme de : </span>{words}</p>}
                        <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isMandated ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-brand-100/80'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isMandated ? 'bg-emerald-300' : 'bg-gold-400'}`} />
                            {isMandated ? 'Mandatee' : 'En attente de mandat'}
                        </span>
                    </SummaryHeader>
                    <Checklist items={checklist} />
                    <SummaryList>
                        <SummaryRow label="Facture" value={data.numero_facture && `N° ${data.numero_facture}`} />
                        <SummaryRow label="Date" value={formatDate(data.date_facture)} />
                        <SummaryRow label="Fournisseur" value={data.code_fournisseur} mono />
                        <SummaryRow label="Service" value={selectedService} />
                        <SummaryRow label="Mandat" value={data.n_mandat && `N° ${data.n_mandat}${data.date_mandat ? ` · ${formatDate(data.date_mandat)}` : ''}`} />
                    </SummaryList>
                </>}
            >
                <Section number="1" title="Facture" description="Identification, montant et fournisseur.">
                    <Field label="N° facture" name="numero_facture" error={errors.numero_facture} hint={hint('numero_facture')}>
                        <input {...text('numero_facture')} placeholder="ex. 015" autoFocus={!isEditing} className={`${inputClass(errors.numero_facture)} font-mono`} />
                    </Field>
                    <Field label="Date facture" name="date_facture" error={errors.date_facture} hint={hint('date_facture')}>
                        <DateWithToday {...text('date_facture')} onToday={() => setData('date_facture', today())} />
                    </Field>
                    <Field label="Montant" name="montant" error={errors.montant} hint={hint('montant', 'Montant total de la facture, en dinars.')} wide>
                        <div className="relative">
                            <input {...text('montant')} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0,00" className={`${inputClass(errors.montant)} py-3.5 pr-16 text-xl font-semibold tabular-nums`} />
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-muted">DZD</span>
                        </div>
                    </Field>
                    <Field label="Fournisseur" name="code_fournisseur" error={errors.code_fournisseur} hint={hint('code_fournisseur')} wide>
                        <SupplierPicker value={data.code_fournisseur} initial={facture?.fournisseur} onChange={(code) => setData('code_fournisseur', code)} error={errors.code_fournisseur} canCreate={auth.user.permissions.includes('fournisseurs.create')} />
                    </Field>
                </Section>

                <Section number="2" title="Affectation" description="Service beneficiaire et imputation budgetaire.">
                    <Field label="Service" name="service_reference" error={errors.service_reference} hint={hint('service_reference', selectedReference && !services[selectedReference] ? `Reference actuelle : ${data.service_reference}` : undefined)} wide>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Service">
                            {Object.entries(services).map(([value, label]) => {
                                const active = selectedReference === value;
                                return (
                                    <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setData('service_reference', facture?.service_reference_normalisee === value ? facture.service_reference : value)} className={`${choiceClass(active)} flex items-center gap-3`}>
                                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${active ? 'bg-brand-600 text-white' : 'bg-surface text-muted ring-1 ring-line'}`}>{label.slice(0, 2).toUpperCase()}</span>
                                        <span className="truncate">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                    <Field label="Imputation" name="imputation" error={errors.imputation} hint={hint('imputation', 'Chapitre budgetaire, ex. VI.I.1.')}>
                        <input {...text('imputation')} placeholder="ex. VI.I.1." className={`${inputClass(errors.imputation)} font-mono`} />
                    </Field>
                    <Field label="N° inventaire" name="n_inventaire" error={errors.n_inventaire} hint={hint('n_inventaire')}>
                        <input {...text('n_inventaire')} className={`${inputClass(errors.n_inventaire)} font-mono`} />
                    </Field>
                </Section>

                <Section number="3" title="Engagement et mandatement" description="References du bon, du journal et du mandat.">
                    <SubHeading>Engagement</SubHeading>
                    <Field label="N° bon" name="n_bon" error={errors.n_bon} hint={hint('n_bon')}>
                        <input {...text('n_bon')} placeholder="ex. CONV" className={`${inputClass(errors.n_bon)} font-mono`} />
                    </Field>
                    <Field label="N° journal" name="n_journal" error={errors.n_journal} hint={hint('n_journal')}>
                        <input {...text('n_journal')} className={`${inputClass(errors.n_journal)} font-mono`} />
                    </Field>
                    <Field label="CFAC" name="cfac" error={errors.cfac} hint={hint('cfac')}>
                        <input {...text('cfac')} className={`${inputClass(errors.cfac)} font-mono`} />
                    </Field>

                    <SubHeading>Mandatement</SubHeading>
                    <Field label="N° mandat" name="n_mandat" error={errors.n_mandat} hint={hint('n_mandat')}>
                        <input {...text('n_mandat')} className={`${inputClass(errors.n_mandat)} font-mono`} />
                    </Field>
                    <Field label="Date mandat" name="date_mandat" error={errors.date_mandat} hint={hint('date_mandat')}>
                        <DateWithToday {...text('date_mandat')} onToday={() => setData('date_mandat', today())} />
                    </Field>
                    {mandateBeforeInvoice && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 md:col-span-2 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                            La date du mandat ({formatDate(data.date_mandat)}) est anterieure a la date de la facture ({formatDate(data.date_facture)}). Verifiez les deux dates.
                        </p>
                    )}
                </Section>

                {isCorrection && (
                    <Section number="4" title="Motif de la correction" description="Obligatoire : il sera visible dans l'historique de la facture.">
                        <Field label="Motif" name="motif_correction" error={errors.motif_correction} required wide>
                            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Motif de la correction">
                                {Object.entries(motifs).map(([value, label]) => (
                                    <button key={value} type="button" role="radio" aria-checked={data.motif_correction === value} onClick={() => setData('motif_correction', value)} className={choiceClass(data.motif_correction === value)}>
                                        {label}
                                    </button>
                                ))}
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

function DateWithToday({ onToday, ...props }) {
    return (
        <div className="flex gap-2">
            <div className="min-w-0 flex-1"><DateInput {...props} /></div>
            {!props.value && <button type="button" onClick={onToday} className="shrink-0 rounded-xl border border-line bg-subtle px-3 text-xs font-semibold text-muted transition hover:border-brand-300 hover:text-ink">Aujourd'hui</button>}
        </div>
    );
}

function SubHeading({ children }) {
    return (
        <div className="flex items-center gap-3 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</p>
            <span className="h-px flex-1 bg-line" />
        </div>
    );
}

function Checklist({ items }) {
    const done = items.filter(([, ok]) => ok).length;
    return (
        <div className="border-b border-line px-6 py-4">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted">Informations essentielles</span>
                <span className={`font-semibold tabular-nums ${done === items.length ? 'text-brand-600 dark:text-brand-300' : 'text-ink'}`}>{done}/{items.length}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
                {items.map(([label, ok]) => (
                    <li key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200' : 'bg-subtle text-muted'}`}>
                        {ok ? <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />}
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
