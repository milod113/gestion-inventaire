import { isMac } from '@/shortcuts';

const macLabels = { Ctrl: '⌘', Alt: '⌥', Shift: '⇧', Echap: 'esc' };

// Renders a key cap: <Kbd>Ctrl</Kbd>
export default function Kbd({ children, size = 'md' }) {
    const label = isMac ? macLabels[children] ?? children : children;
    const sizes = {
        sm: 'min-w-[1.375rem] h-[1.375rem] px-1.5 text-[11px]',
        md: 'min-w-[1.75rem] h-7 px-2 text-xs',
        lg: 'min-w-[2.75rem] h-11 px-3 text-base',
    };

    return (
        <kbd className={`inline-flex items-center justify-center rounded-md border border-line border-b-[3px] bg-surface font-sans font-semibold text-ink shadow-sm ${sizes[size]}`}>
            {label}
        </kbd>
    );
}

// Renders a full shortcut: steps separated by "puis", keys within a step joined by "+".
export function KeyCombo({ keys, size = 'md' }) {
    return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
            {keys.map((step, stepIndex) => (
                <span key={stepIndex} className="inline-flex items-center gap-1.5">
                    {stepIndex > 0 && <span className="text-[11px] font-medium text-muted">puis</span>}
                    {step.map((key, keyIndex) => (
                        <span key={key} className="inline-flex items-center gap-1">
                            {keyIndex > 0 && <span className="text-xs text-muted">+</span>}
                            <Kbd size={size}>{key}</Kbd>
                        </span>
                    ))}
                </span>
            ))}
        </span>
    );
}
