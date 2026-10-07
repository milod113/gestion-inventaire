import PageHeader, { HeaderStat } from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';

const events = {
    created: ['Création', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
    updated: ['Modification', 'bg-blue-50 text-blue-800 border-blue-200'],
    deleted: ['Suppression', 'bg-red-50 text-red-800 border-red-200'],
    login: ['Connexion', 'bg-slate-50 text-slate-700 border-slate-200'],
    logout: ['Déconnexion', 'bg-slate-50 text-slate-700 border-slate-200'],
    import: ['Import', 'bg-amber-50 text-amber-800 border-amber-200'],
};
const subjects = { Article: 'Article', Facture: 'Facture', Fournisseur: 'Fournisseur', Service: 'Service' };
const inputClass = 'mt-2 block w-full rounded-xl border-[#d5e1d6] bg-[#fbfdfb] px-3 py-2.5 text-sm text-[#294337] focus:border-[#2f7654] focus:ring-[#2f7654]';

export default function Index({ logs, users, filters }) {
    const { data, setData, get, processing } = useForm({
        search: filters.search || '', event: filters.event || '', subject_type: filters.subject_type || '',
        user_id: filters.user_id || '', date_from: filters.date_from || '', date_to: filters.date_to || '',
    });
    const submit = (event) => { event.preventDefault(); get(route('admin.journal.index'), { preserveState: true, replace: true }); };
    const reset = () => router.get(route('admin.journal.index'), {}, { preserveState: true, replace: true });

    return (
        <AuthenticatedLayout header={<PageHeader eyebrow="Administration" title="Journal d'activité" description="Qui a fait quoi, et quand." actions={<HeaderStat value={logs.total} label="actions" />} />}>
            <Head title="Journal d'activité" />
            <div className="px-5 pb-14 pt-7 lg:px-10">
                <div className="mx-auto max-w-7xl space-y-6">
                    <form onSubmit={submit} className="rounded-3xl border border-[#dce5dd] bg-white p-5 shadow-sm">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#718177] lg:col-span-2">Recherche<input type="search" value={data.search} onChange={(e) => setData('search', e.target.value)} placeholder="Élément ou utilisateur..." className={inputClass} /></label>
                            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#718177]">Action<select value={data.event} onChange={(e) => setData('event', e.target.value)} className={`${inputClass} form-select`}><option value="">Toutes</option>{Object.entries(events).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label>
                            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#718177]">Type<select value={data.subject_type} onChange={(e) => setData('subject_type', e.target.value)} className={`${inputClass} form-select`}><option value="">Tous</option>{Object.entries(subjects).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#718177]">Utilisateur<select value={data.user_id} onChange={(e) => setData('user_id', e.target.value)} className={`${inputClass} form-select`}><option value="">Tous</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#718177]">Du<input type="date" value={data.date_from} onChange={(e) => setData('date_from', e.target.value)} className={inputClass} /></label>
                                <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#718177]">Au<input type="date" value={data.date_to} onChange={(e) => setData('date_to', e.target.value)} className={inputClass} /></label>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-3"><button type="submit" disabled={processing} className="rounded-xl bg-[#1b503a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#12352a] disabled:opacity-60">Appliquer</button><button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#5c7163] hover:bg-[#edf4ee]">Réinitialiser</button></div>
                    </form>

                    <section className="overflow-hidden rounded-3xl border border-[#dce5dd] bg-white shadow-xl shadow-[#173126]/5">
                        {logs.data.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#718177]">Aucune action enregistrée.</p> : (
                            <div className="overflow-x-auto"><table className="min-w-full divide-y divide-[#e7ede7]">
                                <thead className="bg-[#f7faf7]"><tr><Th>Date</Th><Th>Utilisateur</Th><Th>Action</Th><Th>Élément</Th><Th>Détails</Th></tr></thead>
                                <tbody className="divide-y divide-[#edf1ed]">{logs.data.map((log) => <Row key={log.id} log={log} />)}</tbody>
                            </table></div>
                        )}
                    </section>

                    {logs.last_page > 1 && <div className="flex flex-wrap justify-end gap-2">{logs.links.map((link, index) => <Link key={`${link.label}-${index}`} href={link.url || '#'} preserveScroll className={`rounded-xl px-3 py-2 text-sm font-semibold ${link.active ? 'bg-[#1b503a] text-white' : link.url ? 'bg-white text-[#31513d] ring-1 ring-[#dce5dd]' : 'cursor-not-allowed bg-[#edf1ed] text-[#a1aaa3]'}`} dangerouslySetInnerHTML={{ __html: link.label }} />)}</div>}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Row({ log }) {
    const [label, tone] = events[log.event] || [log.event, 'bg-slate-50 text-slate-700 border-slate-200'];
    const fields = Array.from(new Set([...Object.keys(log.old_values || {}), ...Object.keys(log.new_values || {})]));
    return (
        <tr className="align-top hover:bg-[#f4f9f4]">
            <td className="whitespace-nowrap px-6 py-4 text-sm text-[#4e6457]">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
            <td className="px-6 py-4 text-sm font-semibold text-[#243d30]">{log.user_name || 'Système'}<p className="mt-0.5 text-xs font-normal text-[#718177]">{log.ip_address}</p></td>
            <td className="px-6 py-4"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}>{label}</span></td>
            <td className="px-6 py-4 text-sm text-[#243d30]">{log.subject_type && <span className="text-xs font-bold uppercase tracking-wide text-[#819087]">{log.subject_type} </span>}{log.label || '-'}</td>
            <td className="px-6 py-4 text-sm text-[#4e6457]">{fields.length === 0 ? '-' : (
                <details><summary className="cursor-pointer font-semibold text-[#36558a]">{fields.length} champ(s)</summary>
                    <ul className="mt-2 space-y-1 text-xs">{fields.map((field) => <li key={field}><span className="font-bold">{field}</span> : {log.event !== 'created' && log.event !== 'deleted' && <><span className="text-red-700 line-through">{String(log.old_values?.[field] ?? '∅')}</span> → </>}<span className={log.event === 'deleted' ? 'text-red-700' : 'text-emerald-800'}>{String((log.event === 'deleted' ? log.old_values : log.new_values)?.[field] ?? '∅')}</span></li>)}</ul>
                </details>
            )}</td>
        </tr>
    );
}

function Th({ children }) { return <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.13em] text-[#718177]">{children}</th>; }
