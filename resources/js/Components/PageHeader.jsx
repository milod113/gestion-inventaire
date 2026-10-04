export default function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-gold-400">{eyebrow}</p>}
                <h1 className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
                {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function HeaderStat({ value, label }) {
    return (
        <span className="inline-flex items-baseline gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm shadow-sm">
            <span className="font-semibold text-ink">{value}</span>
            <span className="text-muted">{label}</span>
        </span>
    );
}

export function BackIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>;
}

export function PlusIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>;
}
