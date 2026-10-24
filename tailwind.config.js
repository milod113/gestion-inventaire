import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // Theme-aware tokens, defined in resources/css/app.css
                canvas: token('canvas'),
                surface: token('surface'),
                subtle: token('subtle'),
                line: token('line'),
                ink: token('ink'),
                muted: token('muted'),
                // Orange theme (Tailwind orange scale): 700 is the primary button, 600/500 the accents.
                brand: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                gold: {
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#d97706',
                },
            },
            borderRadius: {
                '2xl': '0.875rem',
                '3xl': '1rem',
            },
            boxShadow: {
                card: '0 1px 2px rgb(41 28 20 / 0.05), 0 1px 3px rgb(41 28 20 / 0.08)',
            },
            keyframes: {
                // Petite oscillation de la cloche quand des rappels sont a traiter.
                bell: {
                    '0%, 100%': { transform: 'rotate(0)' },
                    '15%, 45%': { transform: 'rotate(14deg)' },
                    '30%, 60%': { transform: 'rotate(-12deg)' },
                    '75%': { transform: 'rotate(5deg)' },
                },
            },
            animation: {
                bell: 'bell 0.9s ease-in-out 1',
            },
        },
    },

    plugins: [forms],
};
