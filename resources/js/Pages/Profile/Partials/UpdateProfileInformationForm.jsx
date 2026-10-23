import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function UpdateProfileInformation({ mustVerifyEmail, status, telephone }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
        telephone: telephone || '',
    });

    const submit = (event) => {
        event.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <InputLabel htmlFor="name" value="Nom complet" />
                    <TextInput id="name" className="mt-2 block w-full" value={data.name} onChange={(event) => setData('name', event.target.value)} required isFocused autoComplete="name" />
                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Adresse e-mail" />
                    <TextInput id="email" type="email" className="mt-2 block w-full" value={data.email} onChange={(event) => setData('email', event.target.value)} required autoComplete="username" />
                    <InputError className="mt-2" message={errors.email} />
                </div>

                <div>
                    <InputLabel htmlFor="telephone" value="Téléphone" />
                    <TextInput id="telephone" type="tel" className="mt-2 block w-full" value={data.telephone} onChange={(event) => setData('telephone', event.target.value)} autoComplete="tel" placeholder="0555 12 34 56" />
                    <InputError className="mt-2" message={errors.telephone} />
                    <p className="mt-1.5 text-xs text-muted">Utilisable pour vous connecter, à la place de l e-mail.</p>
                </div>
            </div>

            {mustVerifyEmail && user.email_verified_at === null && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    Votre adresse e-mail n est pas vérifiée.{' '}
                    <Link href={route('verification.send')} method="post" as="button" className="font-semibold underline">
                        Renvoyer l e-mail de vérification
                    </Link>
                    {status === 'verification-link-sent' && <p className="mt-2 font-semibold">Un nouveau lien de vérification a été envoyé.</p>}
                </div>
            )}

            <div className="flex items-center gap-4 border-t border-line pt-5">
                <PrimaryButton disabled={processing}>Enregistrer</PrimaryButton>
                <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                    <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Enregistré.</p>
                </Transition>
            </div>
        </form>
    );
}
