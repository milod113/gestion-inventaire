import PageHeader from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status, telephone }) {
    const user = usePage().props.auth.user;
    const roles = user.roles || [];

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Mon compte"
                    title="Profil"
                    description="Gérez vos informations personnelles et votre mot de passe."
                />
            }
        >
            <Head title="Profil" />

            <div className="px-5 pb-14 pt-7 lg:px-10">
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
                    <aside className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-[#173126]/5 lg:sticky lg:top-6">
                        <div className="h-20 bg-gradient-to-br from-brand-800 to-brand-600" />
                        <div className="-mt-10 px-6 pb-6">
                            <span className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-surface bg-gold-400 text-3xl font-bold text-slate-900 shadow-md">
                                {user.name?.charAt(0).toUpperCase()}
                            </span>
                            <h2 className="mt-4 break-words text-xl font-bold text-ink">{user.name}</h2>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {roles.length ? roles.map((role) => (
                                    <span key={role} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">{role}</span>
                                )) : <span className="rounded-full bg-subtle px-3 py-1 text-xs font-bold text-muted">Sans rôle</span>}
                            </div>

                            <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
                                <Info label="Adresse e-mail" value={user.email} />
                                <Info label="Téléphone" value={telephone} empty="Non renseigné" />
                            </dl>

                            <p className="mt-6 rounded-2xl bg-subtle px-4 py-3 text-xs leading-5 text-muted">
                                Votre e-mail ou votre téléphone peut servir d identifiant de connexion. Ne partagez jamais votre mot de passe.
                            </p>
                        </div>
                    </aside>

                    <div className="space-y-6">
                        <Card eyebrow="Informations" title="Informations personnelles" description="Votre nom, votre adresse e-mail et votre numéro de téléphone.">
                            <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} telephone={telephone} />
                        </Card>

                        <Card eyebrow="Sécurité" title="Mot de passe" description="Utilisez un mot de passe long et difficile à deviner.">
                            <UpdatePasswordForm />
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Card({ eyebrow, title, description, children }) {
    return (
        <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-[#173126]/5">
            <header className="border-b border-line bg-subtle px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-muted">{eyebrow}</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{title}</h2>
                <p className="mt-1 text-sm text-muted">{description}</p>
            </header>
            <div className="p-6">{children}</div>
        </section>
    );
}

function Info({ label, value, empty = '—' }) {
    return (
        <div>
            <dt className="text-xs font-bold uppercase tracking-[.13em] text-muted">{label}</dt>
            <dd className={`mt-1 break-all font-semibold ${value ? 'text-ink' : 'text-muted'}`}>{value || empty}</dd>
        </div>
    );
}
