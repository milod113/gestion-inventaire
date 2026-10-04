export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-line text-brand-600 shadow-sm focus:ring-brand-500 ' +
                className
            }
        />
    );
}
