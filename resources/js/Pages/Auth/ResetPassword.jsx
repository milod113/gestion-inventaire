import AuthShell, { AuthIcon, PasswordInput, buttonClass, inputClass } from '@/Components/AuthShell';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function ResetPassword({ token, email }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const longEnough = data.password.length >= 8;
    const matches = data.password_confirmation !== '' && data.password === data.password_confirmation;

    const submit = (event) => {
        event.preventDefault();
        post(route('password.store'), {
            onFinish: () => {
                reset('password', 'password_confirmation');
                setShowPassword(false);
            },
        });
    };

    return (
        <AuthShell>
            <Head title="Nouveau mot de passe" />

            <div className="mt-8"><AuthIcon><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10V7.5a4.5 4.5 0 0 0-9 0V10m-1 0h11a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Zm5.5 3.5v3" /></AuthIcon></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#807872]">Récupération du compte</p>
            <h2 className="mt-3 text-3xl font-bold text-[#32251c]">Choisissez un nouveau mot de passe</h2>
            <p className="mt-2 text-sm leading-6 text-[#756a63]">Il remplacera l ancien et vous servira à vous connecter dès maintenant.</p>

            <form onSubmit={submit} className="mt-8 space-y-5">
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-[#42342a]">Compte concerné</label>
                    <input id="email" name="email" type="email" autoComplete="username" value={data.email} readOnly aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} className={`${inputClass} cursor-not-allowed bg-[#f4efec] text-[#756a63]`} />
                    <InputError id="email-error" message={errors.email} className="mt-2" />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-bold text-[#42342a]">Nouveau mot de passe</label>
                    <PasswordInput id="password" show={showPassword} onToggle={() => setShowPassword((value) => !value)} value={data.password} onChange={(event) => setData('password', event.target.value)} autoComplete="new-password" autoFocus error={errors.password} />
                    <InputError id="password-error" message={errors.password} className="mt-2" />
                </div>

                <div>
                    <label htmlFor="password_confirmation" className="block text-sm font-bold text-[#42342a]">Confirmer le mot de passe</label>
                    <PasswordInput id="password_confirmation" show={showPassword} onToggle={() => setShowPassword((value) => !value)} value={data.password_confirmation} onChange={(event) => setData('password_confirmation', event.target.value)} autoComplete="new-password" error={errors.password_confirmation} />
                    <InputError id="password_confirmation-error" message={errors.password_confirmation} className="mt-2" />
                </div>

                <ul className="space-y-1.5 rounded-2xl bg-[#f2ebe6] px-4 py-3 text-xs dark:bg-gray-800" aria-label="Conditions du mot de passe">
                    <Rule ok={longEnough}>Au moins 8 caractères</Rule>
                    <Rule ok={matches}>Les deux mots de passe sont identiques</Rule>
                </ul>

                <button disabled={processing} className={buttonClass}>{processing ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button>
            </form>

            <p className="mt-6 text-center text-sm">
                <Link href={route('login')} className="rounded font-semibold text-[#c2410c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-brand-400">Retour à la connexion</Link>
            </p>
        </AuthShell>
    );
}

function Rule({ ok, children }) {
    return (
        <li className={`flex items-center gap-2 font-semibold ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#756a63]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4 shrink-0" aria-hidden="true">
                {ok ? <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /> : <circle cx="12" cy="12" r="8" />}
            </svg>
            {children}
        </li>
    );
}
