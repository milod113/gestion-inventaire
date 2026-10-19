// L'origine des donnees (import / saisie) reste geree cote serveur mais n'est pas affichee aux utilisateurs.
export function FlashError({ message }) {
    return message ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">{message}</div> : null;
}
