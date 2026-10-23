import AuthShell, { PasswordInput, buttonClass, inputClass } from '@/Components/AuthShell';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '', password: '', remember: false,
    });
    const submit = (event) => {
        event.preventDefault();
        post(route('login'), {
            onFinish: () => {
                reset('password');
                setShowPassword(false);
            },
        });
    };

    return (
        <AuthShell>
            <Head title="Connexion" />
            <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#718177]">Bon retour</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1b3328]">Connexion à votre espace</h2>
            <p className="mt-2 text-sm text-[#62766a]">Saisissez vos identifiants pour continuer.</p>
            {status && <div role="status" className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">{status}</div>}
            <form onSubmit={submit} className="mt-8 space-y-5">
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-[#294337]">Adresse e-mail ou téléphone</label>
                    <input id="email" name="email" type="text" autoComplete="username" value={data.email} autoFocus onChange={(event) => setData('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} className={inputClass} />
                    <InputError id="email-error" message={errors.email} className="mt-2" />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-bold text-[#294337]">Mot de passe</label>
                    <PasswordInput id="password" show={showPassword} onToggle={() => setShowPassword((value) => !value)} value={data.password} onChange={(event) => setData('password', event.target.value)} autoComplete="current-password" error={errors.password} />
                    <InputError id="password-error" message={errors.password} className="mt-2" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-[#52675b]">
                        <Checkbox name="remember" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} />
                        Se souvenir de moi
                    </label>
                    {canResetPassword && <Link href={route('password.request')} className="rounded text-sm font-semibold text-[#1b503a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400">Mot de passe oublié ?</Link>}
                </div>
                <button disabled={processing} className={buttonClass}>{processing ? 'Connexion…' : 'Se connecter'}</button>
            </form>
            <p className="mt-5 text-center text-xs leading-5 text-[#62766a]">Ne partagez jamais vos identifiants.</p>
        </AuthShell>
    );
}
