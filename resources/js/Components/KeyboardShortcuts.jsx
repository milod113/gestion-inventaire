import Kbd, { KeyCombo } from '@/Components/Kbd';
import { visibleShortcutGroups } from '@/shortcuts';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const SEQUENCE_TIMEOUT = 1500;
const PALETTE_EVENT = 'command-palette:open';

// Lets any button open the palette (e.g. the search button in the top bar).
export const openCommandPalette = () => window.dispatchEvent(new Event(PALETTE_EVENT));

const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function isTyping(target) {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

// Laravel paginators are the only page props exposing next_page_url.
function findPaginator(props) {
    return Object.values(props).find((value) => value && typeof value === 'object' && 'next_page_url' in value && 'prev_page_url' in value);
}

/**
 * Global keyboard shortcuts, driven by resources/js/shortcuts.js.
 * Mounted once by AuthenticatedLayout.
 */
export default function KeyboardShortcuts() {
    const page = usePage();
    const user = page.props.auth.user;
    const groups = useMemo(() => visibleShortcutGroups(user), [user]);

    // { g: { d: item, a: item, ... }, n: { ... } } for two-step shortcuts with a route.
    const sequences = useMemo(() => {
        const map = {};
        groups.flatMap((group) => group.items)
            .filter((item) => item.available && item.route && item.keys.length === 2)
            .forEach((item) => {
                const [first, second] = item.keys.map((step) => step[0].toLowerCase());
                map[first] = { ...map[first], [second]: item };
            });
        return map;
    }, [groups]);

    const [pending, setPending] = useState(null);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [notice, setNotice] = useState(null);

    const state = useRef({});
    state.current = { pending, paletteOpen, sequences, props: page.props };
    const timers = useRef({});
    const dirty = useRef(false);
    const escapeArmed = useRef(false);

    const flash = (message) => {
        setNotice(message);
        clearTimeout(timers.current.notice);
        timers.current.notice = setTimeout(() => setNotice(null), 2500);
    };

    const startSequence = (key) => {
        setPending(key);
        clearTimeout(timers.current.sequence);
        timers.current.sequence = setTimeout(() => setPending(null), SEQUENCE_TIMEOUT);
    };

    const endSequence = () => {
        clearTimeout(timers.current.sequence);
        setPending(null);
    };

    // Track unsaved edits in shortcut-enabled forms, reset on every page change.
    useEffect(() => {
        const markDirty = (event) => {
            if (event.target instanceof Element && event.target.closest('form[data-shortcut-save]')) dirty.current = true;
        };
        document.addEventListener('input', markDirty, true);
        const removeNavigateListener = router.on('navigate', () => {
            dirty.current = false;
            escapeArmed.current = false;
            endSequence();
        });
        return () => {
            document.removeEventListener('input', markDirty, true);
            removeNavigateListener();
        };
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.defaultPrevented || event.isComposing) return;
            const { pending: currentPending, paletteOpen: palette, sequences: map, props } = state.current;
            const modifier = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();
            const typing = isTyping(event.target);

            // Ctrl/Cmd + K: command palette, even while typing.
            if (modifier && !event.altKey && key === 'k') {
                event.preventDefault();
                endSequence();
                setPaletteOpen((open) => !open);
                return;
            }

            // Ctrl/Cmd + S: submit the page's main form.
            if (modifier && !event.altKey && key === 's') {
                const form = document.querySelector('form[data-shortcut-save]');
                if (form) {
                    event.preventDefault();
                    form.requestSubmit();
                }
                return;
            }

            if (event.key === 'Escape') {
                if (palette || document.querySelector('[role="dialog"]')) return; // dialogs close themselves
                if (typing) {
                    event.target.blur();
                    return;
                }
                const cancel = document.querySelector('[data-shortcut-cancel]');
                if (!cancel) return;
                if (dirty.current && !escapeArmed.current) {
                    escapeArmed.current = true;
                    clearTimeout(timers.current.escape);
                    timers.current.escape = setTimeout(() => { escapeArmed.current = false; }, 2500);
                    flash('Modifications non enregistrees : appuyez a nouveau sur Echap pour quitter.');
                    return;
                }
                router.visit(cancel.getAttribute('href'));
                return;
            }

            // Everything below is a plain-key shortcut.
            if (typing || modifier || event.altKey || palette) return;

            if (currentPending) {
                const item = map[currentPending]?.[key];
                endSequence();
                if (item) {
                    event.preventDefault();
                    router.visit(route(item.route));
                }
                return;
            }

            if (map[key] && !event.shiftKey) {
                event.preventDefault();
                startSequence(key);
                return;
            }

            if (event.key === '?') {
                event.preventDefault();
                router.visit(route('help'));
                return;
            }

            if (event.key === '/') {
                const search = document.querySelector('main input[type="search"], input[data-shortcut-search]');
                if (search) {
                    event.preventDefault();
                    search.focus();
                    search.select();
                }
                return;
            }

            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                const paginator = findPaginator(props);
                const url = event.key === 'ArrowLeft' ? paginator?.prev_page_url : paginator?.next_page_url;
                if (url) {
                    event.preventDefault();
                    router.visit(url, { preserveScroll: true, preserveState: true });
                }
            }
        };

        const onOpenPalette = () => setPaletteOpen(true);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener(PALETTE_EVENT, onOpenPalette);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener(PALETTE_EVENT, onOpenPalette);
        };
    }, []);

    useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

    return (
        <>
            {pending && sequences[pending] && <SequenceHint prefix={pending} options={sequences[pending]} />}
            {notice && !pending && (
                <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
                    <p className="rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-2xl dark:bg-surface dark:text-ink dark:ring-1 dark:ring-line">{notice}</p>
                </div>
            )}
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={groups} />
        </>
    );
}

function SequenceHint({ prefix, options }) {
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
            <div className="max-w-2xl rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-muted">
                        <Kbd size="sm">{prefix.toUpperCase()}</Kbd>
                        puis
                    </span>
                    {Object.entries(options).map(([key, item]) => (
                        <span key={key} className="flex items-center gap-1.5 text-xs text-ink">
                            <Kbd size="sm">{key.toUpperCase()}</Kbd>
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CommandPalette({ open, onClose, groups }) {
    const [query, setQuery] = useState('');

    // Every shortcut that leads to a page becomes a palette command.
    const commands = useMemo(() => {
        const seen = new Set();
        return groups.flatMap((group) => group.items
            .filter((item) => item.route && !seen.has(item.route) && seen.add(item.route))
            .map((item) => ({ ...item, section: item.route.endsWith('.create') ? 'Creer' : 'Aller a' })));
    }, [groups]);

    const results = useMemo(() => {
        const term = normalize(query.trim());
        return term ? commands.filter((command) => normalize(`${command.section} ${command.label}`).includes(term)) : commands;
    }, [commands, query]);

    const sections = ['Aller a', 'Creer']
        .map((section) => ({ section, items: results.filter((command) => command.section === section) }))
        .filter((group) => group.items.length > 0);

    const run = (command) => {
        if (!command) return;
        onClose();
        router.visit(route(command.route));
    };

    return (
        <Dialog open={open} onClose={onClose} afterLeave={() => setQuery('')} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-brand-900/40 backdrop-blur-sm transition duration-150 data-[closed]:opacity-0" />
            <div className="fixed inset-0 overflow-y-auto px-4 pt-[12vh]">
                <DialogPanel transition className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0">
                    <Combobox onChange={run}>
                        <div className="flex items-center gap-3 border-b border-line px-4">
                            <svg className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m16 16 4 4" /></svg>
                            <ComboboxInput
                                autoFocus
                                className="h-14 w-full border-0 bg-transparent px-0 text-sm text-ink placeholder:text-muted/70 focus:ring-0"
                                placeholder="Rechercher une page ou une action..."
                                onChange={(event) => setQuery(event.target.value)}
                                autoComplete="off"
                            />
                            <Kbd size="sm">Echap</Kbd>
                        </div>

                        {sections.length > 0 ? (
                            <ComboboxOptions static className="max-h-80 overflow-y-auto p-2">
                                {sections.map(({ section, items }) => (
                                    <div key={section} className="mb-1 last:mb-0">
                                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{section}</p>
                                        {items.map((command) => (
                                            <ComboboxOption key={command.route} value={command} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink data-[focus]:bg-brand-50 data-[focus]:text-brand-800 dark:data-[focus]:bg-brand-500/15 dark:data-[focus]:text-brand-100">
                                                <span className="flex-1 truncate">{command.label}</span>
                                                <KeyCombo keys={command.keys} size="sm" />
                                            </ComboboxOption>
                                        ))}
                                    </div>
                                ))}
                            </ComboboxOptions>
                        ) : (
                            <p className="px-6 py-10 text-center text-sm text-muted">Aucun resultat pour « {query} »</p>
                        )}

                        <div className="flex items-center gap-4 border-t border-line bg-subtle/60 px-4 py-2.5 text-[11px] text-muted">
                            <span className="flex items-center gap-1.5"><Kbd size="sm">↑</Kbd><Kbd size="sm">↓</Kbd> naviguer</span>
                            <span className="flex items-center gap-1.5"><Kbd size="sm">Entree</Kbd> ouvrir</span>
                        </div>
                    </Combobox>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
