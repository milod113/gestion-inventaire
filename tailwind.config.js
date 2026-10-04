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
                brand: {
                    50: '#eef6f1',
                    100: '#d6eadd',
                    200: '#afd4bd',
                    300: '#7fb899',
                    400: '#4f9874',
                    500: '#2f7654',
                    600: '#236246',
                    700: '#1b503a',
                    800: '#12352a',
                    900: '#0b241c',
                },
                gold: {
                    300: '#f3c361',
                    400: '#e5ad45',
                    500: '#c98f2a',
                },
            },
            borderRadius: {
                '2xl': '0.875rem',
                '3xl': '1rem',
            },
            boxShadow: {
                card: '0 1px 2px rgb(16 24 20 / 0.04), 0 1px 3px rgb(16 24 20 / 0.06)',
            },
        },
    },

    plugins: [forms],
};
