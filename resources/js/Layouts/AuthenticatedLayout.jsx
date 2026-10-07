import Dropdown from '@/Components/Dropdown';
import Kbd from '@/Components/Kbd';
import KeyboardShortcuts, { openCommandPalette } from '@/Components/KeyboardShortcuts';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const navigationGroups = [
    {
        label: 'Pilotage',
        items: [
            { label: "Vue d'ensemble", description: 'Tableau de bord', href: 'dashboard', active: 'dashboard', icon: 'grid' },
            { label: 'Importation', description: 'Controle des fichiers', href: 'imports.index', active: ['imports.index', 'imports.show'], icon: 'upload', adminOnly: true },
            { label: 'Import avance', description: 'Scan des archives DBF', href: 'imports.advanced', active: 'imports.advanced', icon: 'archive', adminOnly: true },
            { label: 'Qualite des donnees', description: 'Anomalies a corriger', href: 'quality.index', active: 'quality.*', icon: 'check', permission: 'articles.view' },
        ],
    },
    {
        label: 'Referentiels',
        items: [
            { label: 'Services', description: 'Unites de l etablissement', href: 'services.index', active: 'services.*', icon: 'building' },
            { label: 'Fournisseurs', description: 'Partenaires et coordonnees', href: 'fournisseurs.index', active: 'fournisseurs.*', icon: 'users' },
            { label: 'Articles', description: 'Stocks et inventaire', href: 'articles.index', active: 'articles.*', icon: 'boxes' },
        ],
    },
    {
        label: 'Comptabilite',
        items: [{ label: 'Factures', description: 'Suivi des engagements', href: 'factures.index', active: 'factures.*', icon: 'receipt' }],
    },
];

const adminNavigationGroup = {
    label: 'Administration',
    items: [
        { label: 'Utilisateurs', description: 'Comptes et roles', href: 'admin.users.index', active: 'admin.users.*', icon: 'shield' },
        { label: 'Journal', description: 'Historique des actions', href: 'admin.journal.index', active: 'admin.journal.*', icon: 'archive' },
    ],
};

const helpNavigationGroup = {
    label: 'Assistance',
    items: [{ label: 'Aide et raccourcis', description: 'Raccourcis clavier', href: 'help', active: 'help', icon: 'help' }],
};

const isActive = (item) => [].concat(item.active).some((pattern) => route().current(pattern));

const readStorage = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeStorage = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage unavailable (private mode): keep the in-memory state only.
    }
};

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const isAdministrator = user.roles?.includes('Administrateur');
    const visibleNavigationGroups = [...navigationGroups, ...(isAdministrator ? [adminNavigationGroup] : []), helpNavigationGroup]
        .map((group) => ({ ...group, items: group.items.filter((item) => (!item.adminOnly || isAdministrator) && (!item.permission || user.permissions?.includes(item.permission))) }))
        .filter((group) => group.items.length > 0);
    const currentItem = visibleNavigationGroups.flatMap((group) => group.items).find(isActive);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => readStorage('inventory-sidebar') === 'collapsed');
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        writeStorage('inventory-theme', dark ? 'dark' : 'light');
    }, [dark]);

    useEffect(() => {
        writeStorage('inventory-sidebar', collapsed ? 'collapsed' : 'expanded');
    }, [collapsed]);

    return (
        <div className="min-h-screen bg-canvas font-sans text-ink">
            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Fermer le menu"
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-30 bg-brand-900/40 backdrop-blur-sm lg:hidden"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-surface transition-[width,transform] duration-300 lg:translate-x-0 ${collapsed ? 'lg:w-[76px]' : 'lg:w-72'} ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
            >
                <div className={`flex h-16 shrink-0 items-center gap-3 border-b border-line px-5 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                    <img src="/Logo%20CHU.jpg" alt="Logo CHU Tlemcen" className="h-9 w-9 shrink-0 rounded-xl bg-[#fff] object-contain p-0.5 ring-1 ring-line" />
                    <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                        <p className="truncate text-sm font-semibold text-ink">CHU Tlemcen</p>
                        <p className="truncate text-xs text-muted">Service Economat</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink lg:hidden"
                        aria-label="Fermer le menu"
                    >
                        <Icon name="close" />
                    </button>
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
                    {visibleNavigationGroups.map((group) => (
                        <div key={group.label} className="mb-6 last:mb-0">
                            <p className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80 ${collapsed ? 'lg:sr-only' : ''}`}>
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    <NavigationItem key={item.label} item={item} collapsed={collapsed} closeSidebar={() => setSidebarOpen(false)} />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="hidden shrink-0 border-t border-line p-3 lg:block">
                    <button
                        type="button"
                        onClick={() => setCollapsed((value) => !value)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-subtle hover:text-ink ${collapsed ? 'justify-center' : ''}`}
                        aria-label={collapsed ? 'Deplier le menu' : 'Replier le menu'}
                        title={collapsed ? 'Deplier le menu' : 'Replier le menu'}
                    >
                        <Icon name={collapsed ? 'expand' : 'collapse'} />
                        {!collapsed && <span>Replier le menu</span>}
                    </button>
                </div>
            </aside>

            <div className={`min-h-screen transition-[padding] duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-72'}`}>
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink lg:hidden"
                        aria-label="Ouvrir le menu"
                    >
                        <Icon name="menu" />
                    </button>

                    <div className="flex min-w-0 items-center gap-2 text-sm">
                        <span className="hidden text-muted sm:inline">Economat</span>
                        {currentItem && (
                            <>
                                <svg className="hidden h-4 w-4 text-muted/60 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
                                <span className="truncate font-semibold text-ink">{currentItem.label}</span>
                            </>
                        )}
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={openCommandPalette}
                            className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted shadow-sm transition hover:border-brand-300 hover:text-ink md:flex"
                        >
                            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
                            <span className="flex-1 text-left">Rechercher...</span>
                            <span className="flex items-center gap-0.5"><Kbd size="sm">Ctrl</Kbd><Kbd size="sm">K</Kbd></span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDark((value) => !value)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink"
                            aria-label="Changer le theme"
                            title={dark ? 'Passer au mode clair' : 'Passer au mode sombre'}
                        >
                            <Icon name={dark ? 'sun' : 'moon'} />
                        </button>
                        <Link
                            href={route('help')}
                            className={`grid h-9 w-9 place-items-center rounded-lg transition hover:bg-subtle hover:text-ink ${route().current('help') ? 'bg-subtle text-ink' : 'text-muted'}`}
                            aria-label="Aide et raccourcis clavier"
                            title="Aide et raccourcis clavier (?)"
                        >
                            <Icon name="help" />
                        </Link>
                        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
                        <UserMenu user={user} isAdministrator={isAdministrator} />
                    </div>
                </header>

                <div className="mx-auto max-w-[1600px]">
                    {header && <div className="px-5 pt-8 lg:px-10">{header}</div>}
                    <main>{children}</main>
                </div>
            <KeyboardShortcuts />
            </div>
        </div>
    );
}

function NavigationItem({ item, collapsed, closeSidebar }) {
    const active = isActive(item);

    return (
        <Link
            href={route(item.href)}
            onClick={closeSidebar}
            title={collapsed ? item.label : item.description}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-muted hover:bg-subtle hover:text-ink'}`}
        >
            {active && <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-brand-600 dark:bg-brand-300" />}
            <span className={active ? 'text-brand-600 dark:text-brand-300' : 'text-muted group-hover:text-ink'}>
                <Icon name={item.icon} />
            </span>
            <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        </Link>
    );
}

function UserMenu({ user, isAdministrator }) {
    const initials = user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button type="button" className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition hover:bg-subtle">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">{initials}</span>
                    <span className="hidden text-left leading-tight sm:block">
                        <span className="block text-sm font-semibold text-ink">{user.name}</span>
                        <span className="block text-xs text-muted">{user.roles?.[0] || 'Utilisateur'}</span>
                    </span>
                    <svg className="hidden h-4 w-4 text-muted sm:block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.15l3.71-3.92a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" /></svg>
                </button>
            </Dropdown.Trigger>
            <Dropdown.Content width="56" contentClasses="py-1 bg-surface border border-line">
                <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                {isAdministrator && <Dropdown.Link href={route('admin.users.index')}>Gestion utilisateurs</Dropdown.Link>}
                {isAdministrator && <Dropdown.Link href={route('admin.journal.index')}>Journal d'activité</Dropdown.Link>}
                <Dropdown.Link href={route('profile.edit')}>Profil</Dropdown.Link>
                <Dropdown.Link href={route('logout')} method="post" as="button">Deconnexion</Dropdown.Link>
            </Dropdown.Content>
        </Dropdown>
    );
}

const iconPaths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    upload: <path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />,
    archive: <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></>,
    building: <><path d="M4 21h16M6 21V5l6-3 6 3v16M9 9h.01M9 13h.01M15 9h.01M15 13h.01" /><path d="M10 21v-4h4v4" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a5 5 0 0 1 10 0v2M16 11a3 3 0 1 0-1.7-5.5M17 16a5 5 0 0 1 4 4v1" /></>,
    boxes: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
    shield: <path d="M12 3 5 6v5c0 4.5 2.9 8.6 7 10 4.1-1.4 7-5.5 7-10V6l-7-3Z" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></>,
    check: <><path d="M9 11l2 2 4-4" /><path d="M12 3 5 6v5c0 4.5 2.9 8.6 7 10 4.1-1.4 7-5.5 7-10V6l-7-3Z" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    collapse: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M16 10l-2 2 2 2" /></>,
    expand: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M14 10l2 2-2 2" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" /></>,
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />,
};

function Icon({ name }) {
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {iconPaths[name]}
        </svg>
    );
}
