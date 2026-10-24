import AuthShell, { AuthIcon, buttonClass, inputClass } from '@/Components/AuthShell';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (event) => {
        event.preventDefault();
        post(route('password.email'));
    };

    return (
        <AuthShell>
            <Head title="Mot de passe oublié" />

            <div className="mt-8"><AuthIcon><path strokeLinecap="round" strokeLinejoin="round" d="M15.8 8a4 4 0 1 0-7.6 0M12 12v4m-6 5h12a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1Z" /></AuthIcon></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#807872]">Récupération du compte</p>
            <h2 className="mt-3 text-3xl font-bold text-[#32251c]">Mot de passe oublié ?</h2>
            <p className="mt-2 text-sm leading-6 text-[#756a63]">Saisissez l adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>

            {status && (
                <div role="status" className="mt-6 flex gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" /></svg>
                    <span>{status} Vérifiez aussi votre dossier de courrier indésirable.</span>
                </div>
            )}

            <form onSubmit={submit} className="mt-8 space-y-5">
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-[#42342a]">Adresse e-mail</label>
                    <input id="email" name="email" type="email" autoComplete="username" value={data.email} autoFocus onChange={(event) => setData('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="vous@exemple.com" className={inputClass} />
                    <InputError id="email-error" message={errors.email} className="mt-2" />
                </div>

                <button disabled={processing} className={buttonClass}>{processing ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}</button>
            </form>

            <p className="mt-6 text-center text-sm">
                <Link href={route('login')} className="inline-flex items-center gap-1.5 rounded font-semibold text-[#c2410c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-brand-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>
                    Retour à la connexion
                </Link>
            </p>
        </AuthShell>
    );
}
