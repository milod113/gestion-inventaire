// Montant en toutes lettres (francais), ex. 1250.5 -> "Mille deux cent cinquante dinars et cinquante centimes".
const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function belowHundred(n) {
    if (n < 17) return UNITS[n];
    if (n < 20) return `dix-${UNITS[n - 10]}`;
    const tens = Math.floor(n / 10);
    const unit = n % 10;
    // 70-79 et 90-99 se construisent sur soixante / quatre-vingt + 10..19.
    if (tens === 7 || tens === 9) return `${TENS[tens]}${tens === 7 && unit === 1 ? ' et ' : '-'}${belowHundred(10 + unit)}`;
    if (unit === 0) return tens === 8 ? 'quatre-vingts' : TENS[tens];
    if (unit === 1 && tens !== 8) return `${TENS[tens]} et un`;
    return `${TENS[tens]}-${UNITS[unit]}`;
}

// "final" : le nombre termine l'expression ; sinon (devant "mille") "cents" et "quatre-vingts" perdent leur s.
function belowThousand(n, final = true) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const parts = [];
    if (hundreds === 1) parts.push('cent');
    if (hundreds > 1) parts.push(`${UNITS[hundreds]} cent${rest === 0 && final ? 's' : ''}`);
    if (rest > 0) parts.push(!final && rest === 80 ? 'quatre-vingt' : belowHundred(rest));
    return parts.join(' ');
}

export function numberInWords(value) {
    let n = Math.floor(value);
    if (n === 0) return 'zéro';
    const parts = [];
    for (const [size, singular, plural] of [[1e9, 'milliard', 'milliards'], [1e6, 'million', 'millions']]) {
        const count = Math.floor(n / size);
        if (count > 0) parts.push(`${belowThousand(count)} ${count > 1 ? plural : singular}`);
        n %= size;
    }
    const thousands = Math.floor(n / 1000);
    if (thousands > 0) parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands, false)} mille`);
    const rest = n % 1000;
    if (rest > 0) parts.push(belowThousand(rest));
    return parts.join(' ');
}

export default function amountInWords(amount, currency = ['dinar', 'dinars'], cents = ['centime', 'centimes']) {
    const [whole = '', fraction = ''] = String(amount ?? '').replace(',', '.').split('.');
    const units = Number.parseInt(whole, 10);
    if (!Number.isFinite(units) || units < 0) return null;
    const centimes = Number.parseInt(`${fraction}00`.slice(0, 2), 10) || 0;
    // "un million de dinars", mais "un million deux cents dinars".
    const of = units >= 1e6 && units % 1e6 === 0 ? 'de ' : '';
    let text = `${numberInWords(units)} ${of}${units > 1 ? currency[1] : currency[0]}`;
    if (centimes > 0) text += ` et ${numberInWords(centimes)} ${centimes > 1 ? cents[1] : cents[0]}`;
    return text.charAt(0).toUpperCase() + text.slice(1);
}
