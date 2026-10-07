import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
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
        <GuestLayout fullWidth>
            <Head title="Connexion" />
            <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
                <section className="relative hidden overflow-hidden bg-[#12352a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full border-[52px] border-[#e5ad45]/15" />
                    <div className="relative flex items-center gap-5">
                        <img src="/Logo%20CHU.jpg" alt="Logo CHU Tlemcen" className="h-20 w-20 rounded-2xl bg-white object-contain p-1 shadow-xl" />
                        <div>
                            <p className="text-lg font-bold">Centre Hospitalo-Universitaire Tlemcen</p>
                            <p className="mt-1 text-sm text-emerald-100/75">Direction des moyens matériels</p>
                            <p className="text-sm text-[#f5c86c]">Service Économat</p>
                        </div>
                    </div>
                    <div className="relative max-w-lg">
                        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#f5c86c]">Espace sécurisé</p>
                        <h1 className="mt-5 text-5xl font-bold leading-tight">Gestion des ressources hospitalières.</h1>
                        <p className="mt-6 text-base leading-7 text-emerald-100/75">Articles, factures et archives réunis dans un environnement fiable.</p>
                    </div>
                    <p className="relative text-xs text-emerald-100/75">Accès réservé aux utilisateurs autorisés.</p>
                </section>
                <section className="flex items-center justify-center bg-[#f4f6f3] px-5 py-16 dark:bg-[#111318] sm:px-10">
                    <div className="w-full max-w-md">
                        <div className="lg:hidden">
                            <img src="/Logo%20CHU.jpg" alt="Logo CHU Tlemcen" className="mx-auto h-24 w-24 rounded-2xl bg-white object-contain p-1 shadow-lg" />
                            <p className="mt-5 text-center text-sm font-bold text-[#1b503a]">CHU Tlemcen</p>
                            <p className="text-center text-xs text-[#62766a]">Direction des moyens matériels — Service Économat</p>
                        </div>
                        <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#718177]">Bon retour</p>
                        <h2 className="mt-3 text-3xl font-bold text-[#1b3328]">Connexion à votre espace</h2>
                        <p className="mt-2 text-sm text-[#62766a]">Saisissez vos identifiants pour continuer.</p>
                        {status && <div role="status" className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">{status}</div>}
                        <form onSubmit={submit} className="mt-8 space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-[#294337]">Adresse e-mail</label>
                                <input id="email" name="email" type="email" autoComplete="username" value={data.email} autoFocus onChange={(event) => setData('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} className="mt-2 block w-full rounded-xl border-[#d5e1d6] bg-white px-4 py-3 text-sm focus:border-emerald-600 focus:ring-emerald-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400" />
                                <InputError id="email-error" message={errors.email} className="mt-2" />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-bold text-[#294337]">Mot de passe</label>
                                <div className="relative mt-2">
                                    <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={data.password} onChange={(event) => setData('password', event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} className="block w-full rounded-xl border-[#d5e1d6] bg-white py-3 pl-4 pr-14 text-sm focus:border-emerald-600 focus:ring-emerald-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400" />
                                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword} aria-controls="password" title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-[#62766a] transition hover:bg-emerald-50 hover:text-[#1b503a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:hover:bg-gray-800 dark:focus-visible:ring-emerald-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
                                            {showPassword ? <>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c6 0 9 7 9 7a16 16 0 0 1-3.1 4.2M6.2 6.2C4.1 7.8 3 10 3 12c0 0 3 7 9 7a10 10 0 0 0 4.2-.9" />
                                            </> : <>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </>}
                                        </svg>
                                    </button>
                                </div>
                                <InputError id="password-error" message={errors.password} className="mt-2" />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-sm text-[#52675b]">
                                    <Checkbox name="remember" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} />
                                    Se souvenir de moi
                                </label>
                                {canResetPassword && <Link href={route('password.request')} className="rounded text-sm font-semibold text-[#1b503a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400">Mot de passe oublié ?</Link>}
                            </div>
                            <button disabled={processing} className="w-full rounded-xl bg-[#1b503a] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#123d2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-[#111318]">{processing ? 'Connexion…' : 'Se connecter'}</button>
                        </form>
                        <p className="mt-5 text-center text-xs leading-5 text-[#62766a]">Ne partagez jamais vos identifiants.</p>
                        <footer className="mt-8 border-t border-[#d5e1d6] pt-6 text-center dark:border-gray-700" aria-label="Informations sur le développeur">
                            <p className="text-xs font-medium uppercase tracking-[.16em] text-[#718177]">Conception et développement</p>
                            <p className="mt-2 text-sm font-semibold text-[#294337]">Embarki Miloud</p>
                            <a href="mailto:embarki1988@gmail.com" className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md text-sm text-[#62766a] transition-colors hover:text-[#1b503a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-[#111318]">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 shrink-0" aria-hidden="true">
                                    <rect x="3" y="5" width="18" height="14" rx="2" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
                                </svg>
                                <span className="break-all">embarki1988@gmail.com</span>
                            </a>
                            <p className="mt-3">
                                <a href="mailto:embarki1988@gmail.com?subject=Assistance%20technique%20-%20Gestion%20inventaire" className="rounded text-xs font-semibold text-[#1b503a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400">Assistance technique</a>
                            </p>
                        </footer>
                    </div>
                </section>
            </div>
        </GuestLayout>
    );
}
