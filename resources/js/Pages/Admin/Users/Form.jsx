import PageHeader from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ managedUser = null, roles }) {
    const editing = Boolean(managedUser);
    const inputClass = 'w-full rounded-xl border-[#d5e1d6] bg-[#fbfdfb] px-3.5 py-3 text-sm text-[#20392c] shadow-sm focus:border-[#2f7654] focus:ring-[#2f7654]';
    const { data, setData, post, put, processing, errors } = useForm({
        name: managedUser?.name || '',
        email: managedUser?.email || '',
        password: '',
        password_confirmation: '',
        role: managedUser?.roles?.[0]?.name || 'Consultation',
        is_active: managedUser?.is_active ?? true,
    });

    const submit = (event) => {
        event.preventDefault();
        if (editing) put(route('admin.users.update', managedUser.id));
        else post(route('admin.users.store'));
    };

    return <AuthenticatedLayout header={<Hero editing={editing} />}><Head title={editing ? 'Modifier utilisateur' : 'Nouvel utilisateur'} /><div className="px-5 pb-14 pt-7 lg:px-10"><form onSubmit={submit} data-shortcut-save className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#dce5dd] bg-white shadow-xl shadow-[#173126]/5"><div className="border-b border-[#e7ede7] bg-[#f7faf7] px-6 py-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#819087]">Acces et securite</p><h2 className="mt-1 text-xl font-bold text-[#1b3328]">{editing ? 'Informations du compte' : 'Creer un nouveau compte'}</h2></div><div className="grid gap-5 p-6 sm:grid-cols-2"><Field label="Nom complet" error={errors.name}><input value={data.name} onChange={(event) => setData('name', event.target.value)} className={inputClass} autoFocus /></Field><Field label="Adresse email" error={errors.email}><input type="email" value={data.email} onChange={(event) => setData('email', event.target.value)} className={inputClass} /></Field><Field label="Role" error={errors.role}><select value={data.role} onChange={(event) => setData('role', event.target.value)} className={inputClass}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></Field><Field label="Statut" error={errors.is_active}><select value={data.is_active ? '1' : '0'} onChange={(event) => setData('is_active', event.target.value === '1')} className={inputClass}><option value="1">Compte actif</option><option value="0">Compte desactive</option></select></Field><Field label={editing ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'} error={errors.password}><input type="password" value={data.password} onChange={(event) => setData('password', event.target.value)} className={inputClass} /></Field><Field label="Confirmer le mot de passe"><input type="password" value={data.password_confirmation} onChange={(event) => setData('password_confirmation', event.target.value)} className={inputClass} /></Field></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede7] bg-[#fbfdfb] px-6 py-5"><p className="text-sm text-[#718177]">{editing ? 'Laissez le mot de passe vide pour le conserver.' : 'Le compte pourra se connecter immediatement.'}</p><div className="flex gap-3"><Link href={route('admin.users.index')} data-shortcut-cancel className="rounded-xl border border-[#d5e1d6] bg-white px-5 py-3 text-sm font-bold text-[#365246]">Annuler</Link><button disabled={processing} className="rounded-xl bg-[#1b503a] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#173126]/15 transition hover:bg-[#12352a] disabled:opacity-60">{editing ? 'Enregistrer les modifications' : 'Creer le compte'}</button></div></div></form></div></AuthenticatedLayout>;
}

function Hero({ editing }) { return <PageHeader eyebrow="Administration" title={editing ? 'Modifier un utilisateur' : 'Nouvel utilisateur'} description="Attribuez un role et controlez l acces a l application." />; }
function Field({ label, error, children }) { return <label className="block text-sm font-bold text-[#365246]"><span>{label}</span><div className="mt-2">{children}</div>{error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}</label>; }
