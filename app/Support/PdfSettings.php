<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Layout options of the "fiche d'inventaire" PDF, editable in Administration > Parametres PDF. */
class PdfSettings
{
    public const KEY = 'pdf';

    /** Custom logo, kept on the private local disk. */
    public const LOGO_PATH = 'settings/pdf-logo';

    /** Columns that can be printed: default label, relative width, and whether they are on by default. */
    public const COLUMNS = [
        'description' => ['label' => 'Description', 'width' => 27, 'enabled' => true],
        'service' => ['label' => 'Service', 'width' => 14, 'enabled' => false],
        'mouvement' => ['label' => 'Mouvement', 'width' => 7, 'enabled' => false],
        'date' => ['label' => 'Date mouvement', 'width' => 9, 'enabled' => true],
        'quantite_entree' => ['label' => 'Qte E', 'width' => 6, 'enabled' => true],
        'quantite_sortie' => ['label' => 'Qte S', 'width' => 6, 'enabled' => true],
        'numero_bon' => ['label' => 'Numéro bon', 'width' => 10, 'enabled' => true],
        'numero_inventaire' => ['label' => 'Numéro inventaire', 'width' => 15, 'enabled' => true],
        'prix_unitaire' => ['label' => 'Prix unitaire', 'width' => 9, 'enabled' => false],
        'valeur' => ['label' => 'Valeur (DZD)', 'width' => 10, 'enabled' => false],
        'observation' => ['label' => 'Observation', 'width' => 27, 'enabled' => true],
    ];

    public const FONTS = ['DejaVu Sans', 'DejaVu Serif', 'Helvetica', 'Times-Roman'];

    public const SORTS = ['date_desc', 'date_asc', 'numero_inventaire', 'description'];

    public static function defaults(): array
    {
        return [
            'header' => [
                'show_logo' => true,
                'lines' => [
                    'Centre Hospitalo-Universitaire Damerdji Tidjani',
                    'Direction des moyens et matériel',
                    'Sous-direction des services économiques',
                    "Bureau d'inventaire",
                ],
            ],
            'document' => [
                'title' => "Fiche d'inventaire",
                'show_generated_at' => true,
                'show_filters' => true,
                'group_by_service' => true,
                'show_totals' => false,
                'sort' => 'date_desc',
            ],
            'page' => [
                'paper' => 'a4',
                'orientation' => 'landscape',
                'font' => 'DejaVu Sans',
                'font_size' => 11,
                'accent' => '#c2410c',
                'zebra' => false,
            ],
            'columns' => collect(self::COLUMNS)->map(fn (array $column, string $key) => [
                'key' => $key, 'label' => $column['label'], 'enabled' => $column['enabled'],
            ])->values()->all(),
            'footer' => [
                'text' => "CHU Tlemcen · Bureau d'inventaire",
                'page_numbers' => true,
            ],
            'signatures' => [
                'enabled' => false,
                'labels' => ["Le responsable du bureau d'inventaire", 'Le chef de service', 'Le sous-directeur'],
            ],
        ];
    }

    /** Saved settings merged over the defaults, so options added later get a value. */
    public static function current(): array
    {
        return self::normalize(Setting::read(self::KEY));
    }

    public static function save(array $settings, ?int $userId): void
    {
        Setting::write(self::KEY, self::normalize($settings), $userId);
    }

    public static function normalize(array $settings): array
    {
        $merged = array_replace_recursive(self::defaults(), Arr::except($settings, ['columns']));
        // Lists are replaced as a whole, not merged index by index.
        $merged['header']['lines'] = array_values(array_slice($settings['header']['lines'] ?? $merged['header']['lines'], 0, 5));
        $merged['signatures']['labels'] = array_values(array_slice($settings['signatures']['labels'] ?? $merged['signatures']['labels'], 0, 4));

        // Keep the saved order, drop unknown columns and append columns added since.
        $columns = collect($settings['columns'] ?? self::defaults()['columns'])
            ->filter(fn ($column) => isset(self::COLUMNS[$column['key'] ?? null]))
            ->unique('key')
            ->map(fn (array $column) => [
                'key' => $column['key'],
                'label' => trim((string) ($column['label'] ?? '')) ?: self::COLUMNS[$column['key']]['label'],
                'enabled' => (bool) ($column['enabled'] ?? false),
            ]);
        foreach (self::defaults()['columns'] as $default) {
            if (! $columns->contains('key', $default['key'])) {
                $columns->push([...$default, 'enabled' => false]);
            }
        }
        $merged['columns'] = $columns->values()->all();

        return $merged;
    }

    public static function rules(): array
    {
        return [
            'header.show_logo' => ['required', 'boolean'],
            'header.lines' => ['present', 'array', 'max:5'],
            'header.lines.*' => ['nullable', 'string', 'max:120'],
            'document.title' => ['required', 'string', 'max:120'],
            'document.show_generated_at' => ['required', 'boolean'],
            'document.show_filters' => ['required', 'boolean'],
            'document.group_by_service' => ['required', 'boolean'],
            'document.show_totals' => ['required', 'boolean'],
            'document.sort' => ['required', Rule::in(self::SORTS)],
            'page.paper' => ['required', Rule::in(['a4', 'a3'])],
            'page.orientation' => ['required', Rule::in(['landscape', 'portrait'])],
            'page.font' => ['required', Rule::in(self::FONTS)],
            'page.font_size' => ['required', 'integer', 'min:7', 'max:14'],
            'page.accent' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'page.zebra' => ['required', 'boolean'],
            'columns' => ['required', 'array'],
            'columns.*.key' => ['required', Rule::in(array_keys(self::COLUMNS))],
            'columns.*.label' => ['nullable', 'string', 'max:40'],
            'columns.*.enabled' => ['required', 'boolean'],
            'footer.text' => ['nullable', 'string', 'max:150'],
            'footer.page_numbers' => ['required', 'boolean'],
            'signatures.enabled' => ['required', 'boolean'],
            'signatures.labels' => ['present', 'array', 'max:4'],
            'signatures.labels.*' => ['nullable', 'string', 'max:80'],
        ];
    }

    /** Data URI of the logo to print: the uploaded one, else the CHU logo shipped with the app. */
    public static function logoDataUri(): ?string
    {
        if (Storage::disk('local')->exists(self::LOGO_PATH)) {
            $disk = Storage::disk('local');

            return 'data:'.$disk->mimeType(self::LOGO_PATH).';base64,'.base64_encode($disk->get(self::LOGO_PATH));
        }

        $default = resource_path('images/pdf-logo.jpg');

        return is_file($default) ? 'data:image/jpeg;base64,'.base64_encode(file_get_contents($default)) : null;
    }

    public static function hasCustomLogo(): bool
    {
        return Storage::disk('local')->exists(self::LOGO_PATH);
    }
}
