// Single source of truth for keyboard shortcuts: the help page renders this list,
// and Components/KeyboardShortcuts.jsx reads it too, so documentation and behaviour stay in sync.
//
// keys: sequence of steps; each step lists the keys pressed together.
//   [['Ctrl', 'K']]  -> Ctrl + K
//   [['G'], ['D']]   -> G, then D
// available: set to false to list a shortcut as "Bientot" without activating it.
// permission / adminOnly: shortcut is only listed for users who can use it.

export const shortcutGroups = [
    {
        id: 'navigation',
        title: 'Navigation',
        description: 'Tapez G, relachez, puis la lettre de la page a ouvrir.',
        icon: 'compass',
        items: [
            { keys: [['G'], ['D']], label: 'Tableau de bord', route: 'dashboard', permission: 'dashboard.view', available: true },
            { keys: [['G'], ['A']], label: 'Articles', route: 'articles.index', permission: 'articles.view', available: true },
            { keys: [['G'], ['F']], label: 'Factures', route: 'factures.index', permission: 'factures.view', available: true },
            { keys: [['G'], ['R']], label: 'Fournisseurs', route: 'fournisseurs.index', permission: 'fournisseurs.view', available: true },
            { keys: [['G'], ['S']], label: 'Services', route: 'services.index', permission: 'services.view', available: true },
            { keys: [['G'], ['Q']], label: 'Qualite des donnees', route: 'quality.index', permission: 'articles.view', available: true },
            { keys: [['G'], ['I']], label: 'Importation', route: 'imports.index', adminOnly: true, available: true },
            { keys: [['G'], ['H']], label: 'Aide et raccourcis', route: 'help', available: true },
        ],
    },
    {
        id: 'actions',
        title: 'Actions rapides',
        description: 'Disponibles depuis n importe quelle page.',
        icon: 'bolt',
        items: [
            { keys: [['Ctrl', 'K']], label: 'Ouvrir la palette de commandes', hint: 'Rechercher une page ou une action en tapant quelques lettres', available: true },
            { keys: [['N'], ['A']], label: 'Nouvel article', route: 'articles.create', permission: 'articles.create', available: true },
            { keys: [['N'], ['F']], label: 'Nouvelle facture', route: 'factures.create', permission: 'factures.create', available: true },
            { keys: [['N'], ['R']], label: 'Nouveau fournisseur', route: 'fournisseurs.create', permission: 'fournisseurs.create', available: true },
            { keys: [['N'], ['S']], label: 'Nouveau service', route: 'services.create', permission: 'services.create', available: true },
            { keys: [['?']], label: 'Afficher l aide des raccourcis', route: 'help', available: true },
        ],
    },
    {
        id: 'pages',
        title: 'Dans les pages',
        description: 'Actifs uniquement dans le contexte indique.',
        icon: 'cursor',
        items: [
            { keys: [['/']], label: 'Aller au champ de recherche', context: 'Listes', available: true },
            { keys: [['Ctrl', 'S']], label: 'Enregistrer le formulaire', context: 'Formulaires', available: true },
            { keys: [['Echap']], label: 'Annuler ou fermer', context: 'Formulaires, fenetres', available: true },
            { keys: [['←']], label: 'Page precedente', context: 'Listes paginees', available: true },
            { keys: [['→']], label: 'Page suivante', context: 'Listes paginees', available: true },
        ],
    },
];

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// Shortcuts the given user is allowed to use.
export function visibleShortcutGroups(user) {
    const isAdministrator = user?.roles?.includes('Administrateur');
    const permissions = user?.permissions || [];

    return shortcutGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => (!item.adminOnly || isAdministrator) && (!item.permission || permissions.includes(item.permission))),
        }))
        .filter((group) => group.items.length > 0);
}

// Keys of the active shortcut leading to a route, to display next to matching buttons.
export function shortcutKeys(routeName) {
    return shortcutGroups.flatMap((group) => group.items).find((item) => item.available && item.route === routeName)?.keys ?? null;
}
