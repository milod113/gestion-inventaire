import GuestLayout from '@/Layouts/GuestLayout';

// Page shell shared by the login, forgot-password and reset-password screens.
export default function AuthShell({ children }) {
    return (
        <GuestLayout fullWidth>
            <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
                <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#9a3412] via-[#7c2d12] to-[#431407] p-12 text-white lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full border-[52px] border-[#fb923c]/20" />
                    <div className="relative flex items-center gap-5">
                        <img src="/Logo%20CHU.jpg" alt="Logo CHU Tlemcen" className="h-20 w-20 rounded-2xl bg-white object-contain p-1 shadow-xl" />
                        <div>
                            <p className="text-lg font-bold">Centre Hospitalo-Universitaire Tlemcen</p>
                            <p className="mt-1 text-sm text-brand-100/75">Direction des moyens matériels</p>
                            <p className="text-sm text-[#fcd34d]">Service Économat</p>
                        </div>
                    </div>
                    <div className="relative max-w-lg">
                        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#fcd34d]">Espace sécurisé</p>
                        <h1 className="mt-5 text-5xl font-bold leading-tight">Gestion des ressources hospitalières.</h1>
                        <p className="mt-6 text-base leading-7 text-brand-100/75">Articles, factures et archives réunis dans un environnement fiable.</p>
                    </div>
                    <p className="relative text-xs text-brand-100/75">Accès réservé aux utilisateurs autorisés.</p>
                </section>
                <section className="flex items-center justify-center bg-[#f8f4f1] px-5 py-16 dark:bg-[#111318] sm:px-10">
                    <div className="w-full max-w-md">
                        <div className="lg:hidden">
                            <img src="/Logo%20CHU.jpg" alt="Logo CHU Tlemcen" className="mx-auto h-24 w-24 rounded-2xl bg-white object-contain p-1 shadow-lg" />
                            <p className="mt-5 text-center text-sm font-bold text-[#c2410c]">CHU Tlemcen</p>
                            <p className="text-center text-xs text-[#756a63]">Direction des moyens matériels — Service Économat</p>
                        </div>

                        {children}

                        <footer className="mt-8 border-t border-[#e7d9cf] pt-6 text-center dark:border-gray-700" aria-label="Informations sur le développeur">
                            <p className="text-xs font-medium uppercase tracking-[.16em] text-[#807872]">Conception et développement</p>
                            <p className="mt-2 text-sm font-semibold text-[#42342a]">Embarki Miloud</p>
                            <a href="mailto:embarki1988@gmail.com" className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md text-sm text-[#756a63] transition-colors hover:text-[#c2410c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-4 dark:focus-visible:ring-brand-400 dark:focus-visible:ring-offset-[#111318]">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 shrink-0" aria-hidden="true">
                                    <rect x="3" y="5" width="18" height="14" rx="2" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
                                </svg>
                                <span className="break-all">embarki1988@gmail.com</span>
                            </a>
                            <p className="mt-3">
                                <a href="mailto:embarki1988@gmail.com?subject=Assistance%20technique%20-%20Gestion%20inventaire" className="rounded text-xs font-semibold text-[#c2410c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-brand-400">Assistance technique</a>
                            </p>
                        </footer>
                    </div>
                </section>
            </div>
        </GuestLayout>
    );
}

export const inputClass = 'mt-2 block w-full rounded-xl border-[#e7d9cf] bg-white px-4 py-3 text-sm focus:border-brand-600 focus:ring-brand-600 dark:focus:border-brand-400 dark:focus:ring-brand-400';
export const buttonClass = 'w-full rounded-xl bg-[#c2410c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#9a3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-brand-400 dark:focus-visible:ring-offset-[#111318]';

export function AuthIcon({ children }) {
    return (
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#ffedd5] text-[#c2410c] dark:bg-brand-950 dark:text-brand-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7" aria-hidden="true">{children}</svg>
        </span>
    );
}

export function PasswordInput({ id, show, onToggle, error, ...props }) {
    return (
        <div className="relative mt-2">
            <input id={id} name={id} type={show ? 'text' : 'password'} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="block w-full rounded-xl border-[#e7d9cf] bg-white py-3 pl-4 pr-14 text-sm focus:border-brand-600 focus:ring-brand-600 dark:focus:border-brand-400 dark:focus:ring-brand-400" {...props} />
            <button type="button" onClick={onToggle} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show} title={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-[#756a63] transition hover:bg-brand-50 hover:text-[#c2410c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:hover:bg-gray-800 dark:focus-visible:ring-brand-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
                    {show ? <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c6 0 9 7 9 7a16 16 0 0 1-3.1 4.2M6.2 6.2C4.1 7.8 3 10 3 12c0 0 3 7 9 7a10 10 0 0 0 4.2-.9" /> : <><path strokeLinecap="round" strokeLinejoin="round" d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z" /><circle cx="12" cy="12" r="3" /></>}
                </svg>
            </button>
        </div>
    );
}
