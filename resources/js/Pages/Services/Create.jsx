import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        name: '',
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('services.store'), { onSuccess: () => reset() });
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Referentiel des services"
                    title="Ajouter un service"
                    description="Enregistrez une nouvelle unite de votre etablissement."
                    actions={<Link href={route('services.index')} data-shortcut-cancel className="btn-secondary"><BackIcon />Retour a la liste</Link>}
                />
            }
        >
            <Head title="Ajouter un service" />

            <div className="px-5 pb-12 pt-7 lg:px-10">
                <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#eadfd7] bg-white shadow-xl shadow-[#431407]/5">
                    <div className="border-b border-[#f0e9e4] bg-[#fbf8f6] px-6 py-5 sm:px-8">
                        <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c2410c] text-sm font-bold text-white">1</span>
                            <div><p className="text-sm font-bold text-[#32251c]">Informations du service</p><p className="text-xs text-[#807872]">Les champs marques sont obligatoires.</p></div>
                        </div>
                    </div>

                    <form onSubmit={submit} data-shortcut-save className="space-y-7 p-6 sm:p-8">
                        <div>
                            <label htmlFor="code" className="text-sm font-bold text-[#42342a]">Code du service <span className="text-[#c2741d]">*</span></label>
                            <p className="mt-1 text-xs text-[#867e79]">Identifiant numerique unique du service.</p>
                            <TextInput
                                id="code"
                                type="number"
                                min="1"
                                value={data.code}
                                onChange={(event) => setData('code', event.target.value)}
                                className="mt-3 block w-full rounded-xl border-[#e7d9cf] bg-[#fefcfa] px-4 py-3 text-[#382a21] shadow-sm transition focus:border-[#ea580c] focus:ring-[#ea580c]"
                                isFocused
                            />
                            <InputError message={errors.code} className="mt-2" />
                        </div>

                        <div>
                            <label htmlFor="name" className="text-sm font-bold text-[#42342a]">Nom du service <span className="text-[#c2741d]">*</span></label>
                            <p className="mt-1 text-xs text-[#867e79]">Saisissez le nom complet affiche dans l'application.</p>
                            <TextInput
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                className="mt-3 block w-full rounded-xl border-[#e7d9cf] bg-[#fefcfa] px-4 py-3 text-[#382a21] shadow-sm transition focus:border-[#ea580c] focus:ring-[#ea580c]"
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-[#f0e9e4] pt-6 sm:flex-row sm:items-center sm:justify-end">
                            <Link href={route('services.index')} className="rounded-xl px-5 py-3 text-center text-sm font-semibold text-[#70655d] transition hover:bg-[#f8f3ef]">Annuler</Link>
                            <button type="submit" disabled={processing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-3 text-sm font-bold text-[#431407] shadow-lg shadow-[#d97706]/20 transition hover:bg-[#fcd34d] disabled:cursor-not-allowed disabled:opacity-60">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                {processing ? 'Enregistrement...' : 'Enregistrer le service'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
