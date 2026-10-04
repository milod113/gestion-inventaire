import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function GuestLayout({ children, fullWidth = false }) {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
    useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('inventory-theme', dark ? 'dark' : 'light'); }, [dark]);

    return (
        <div className="relative flex min-h-screen flex-col items-center bg-gray-100 pt-6 sm:justify-center sm:pt-0">
            <button type="button" onClick={() => setDark((value) => !value)} className="absolute right-5 top-5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-[#1b503a] shadow-sm">{dark ? 'Mode clair' : 'Mode sombre'}</button>
            {!fullWidth && <div>
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-500" />
                </Link>
            </div>}

            <div className={fullWidth ? 'w-full' : 'mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg'}>
                {children}
            </div>
        </div>
    );
}
