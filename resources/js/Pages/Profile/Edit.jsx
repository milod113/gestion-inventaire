import PageHeader from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Mon compte"
                    title="Profil"
                    description="Gerez vos informations personnelles et votre mot de passe."
                />
            }
        >
            <Head title="Profile" />

            <div className="px-5 pb-12 pt-7 lg:px-10">
                <div className="max-w-3xl space-y-6">
                    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
