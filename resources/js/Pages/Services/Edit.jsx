import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import PageHeader, { BackIcon } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Edit({ service }) {
    const { data, setData, put, processing, errors } = useForm({
        code: service.code,
        name: service.name,
    });

    const submit = (event) => {
        event.preventDefault();
        put(route('services.update', service.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Referentiel des services"
                    title="Modifier un service"
                    actions={<Link href={route('services.index')} data-shortcut-cancel className="btn-secondary"><BackIcon />Retour a la liste</Link>}
                />
            }
        >
            <Head title="Modifier un service" />

            <div className="px-5 pb-12 pt-7 lg:px-10">
                <div className="mx-auto max-w-3xl">
                    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                        <form onSubmit={submit} data-shortcut-save className="space-y-6 p-6 sm:p-8">
                            <div>
                                <InputLabel htmlFor="code" value="Code" />
                                <TextInput
                                    id="code"
                                    type="number"
                                    value={data.code}
                                    onChange={(event) => setData('code', event.target.value)}
                                    className="mt-1 block w-full"
                                    isFocused
                                />
                                <InputError message={errors.code} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="name" value="Nom du service" />
                                <TextInput
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(event) => setData('name', event.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            <div className="flex justify-end">
                                <PrimaryButton disabled={processing}>
                                    Enregistrer les modifications
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
