import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function UpdatePasswordForm() {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (event) => {
        event.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <form onSubmit={updatePassword} className="space-y-5">
            <div>
                <InputLabel htmlFor="current_password" value="Mot de passe actuel" />
                <TextInput id="current_password" ref={currentPasswordInput} value={data.current_password} onChange={(event) => setData('current_password', event.target.value)} type="password" className="mt-2 block w-full sm:max-w-md" autoComplete="current-password" />
                <InputError message={errors.current_password} className="mt-2" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor="password" value="Nouveau mot de passe" />
                    <TextInput id="password" ref={passwordInput} value={data.password} onChange={(event) => setData('password', event.target.value)} type="password" className="mt-2 block w-full" autoComplete="new-password" />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password_confirmation" value="Confirmer le mot de passe" />
                    <TextInput id="password_confirmation" value={data.password_confirmation} onChange={(event) => setData('password_confirmation', event.target.value)} type="password" className="mt-2 block w-full" autoComplete="new-password" />
                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>
            </div>

            <div className="flex items-center gap-4 border-t border-line pt-5">
                <PrimaryButton disabled={processing}>Changer le mot de passe</PrimaryButton>
                <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                    <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Mot de passe modifié.</p>
                </Transition>
            </div>
        </form>
    );
}
