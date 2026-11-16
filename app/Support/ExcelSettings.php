<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

/** Layout options of the articles Excel export, editable in Administration > Parametres > Excel. */
class ExcelSettings
{
    public const KEY = 'excel';

    /** Columns that can be exported: default heading, width in characters, and whether they are on by default. */
    public const COLUMNS = [
        'code_service' => ['label' => 'Code service', 'width' => 12, 'enabled' => true],
        'service' => ['label' => 'Service', 'width' => 30, 'enabled' => true],
        'description' => ['label' => 'Désignation', 'width' => 45, 'enabled' => true],
        'mouvement' => ['label' => 'Mouvement', 'width' => 11, 'enabled' => false],
        'date' => ['label' => 'Date mouvement', 'width' => 15, 'enabled' => true],
        'quantite_entree' => ['label' => 'Qte E', 'width' => 9, 'enabled' => true],
        'quantite_sortie' => ['label' => 'Qte S', 'width' => 9, 'enabled' => true],
        'numero_bon' => ['label' => 'N° bon', 'width' => 14, 'enabled' => true],
        'numero_inventaire' => ['label' => 'N° inventaire', 'width' => 20, 'enabled' => true],
        'prix_unitaire' => ['label' => 'Prix unitaire (DZD)', 'width' => 16, 'enabled' => false],
        'valeur' => ['label' => 'Valeur (DZD)', 'width' => 16, 'enabled' => false],
        'observation' => ['label' => 'Observation', 'width' => 45, 'enabled' => true],
    ];

    public const SORTS = ['date_desc', 'date_asc', 'service', 'numero_inventaire', 'description'];

    public const DATE_FORMATS = ['dd/mm/yyyy', 'yyyy-mm-dd', 'dd/mm/yy', 'mm/yyyy'];

    public static function defaults(): array
    {
        return [
            'sheet' => [
                'name' => 'Fiche inventaire',
                'header_color' => '#c2410c',
                'freeze_header' => true,
                'autofilter' => true,
                'zebra' => false,
            ],
            'document' => [
                'title_rows' => false,
                'title' => "Fiche d'inventaire",
                'sort' => 'date_desc',
                'show_totals' => false,
                'date_format' => 'dd/mm/yyyy',
                'file_prefix' => 'fiche-inventaire',
            ],
            'columns' => collect(self::COLUMNS)->map(fn (array $column, string $key) => [
                'key' => $key, 'label' => $column['label'], 'enabled' => $column['enabled'],
            ])->values()->all(),
        ];
    }

    public static function current(): array
    {
        return self::normalize(Setting::read(self::KEY));
    }

    public static function save(array $settings, ?int $userId): void
    {
        Setting::write(self::KEY, self::normalize($settings), $userId);
    }

    /** Saved settings merged over the defaults; keeps the column order and appends columns added since. */
    public static function normalize(array $settings): array
    {
        $merged = array_replace_recursive(self::defaults(), Arr::except($settings, ['columns']));

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
            // Excel refuses these characters in sheet names and limits them to 31 characters.
            'sheet.name' => ['required', 'string', 'max:31', 'regex:/^[^\\\\\/\?\*\[\]:]+$/'],
            'sheet.header_color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sheet.freeze_header' => ['required', 'boolean'],
            'sheet.autofilter' => ['required', 'boolean'],
            'sheet.zebra' => ['required', 'boolean'],
            'document.title_rows' => ['required', 'boolean'],
            'document.title' => ['required', 'string', 'max:120'],
            'document.sort' => ['required', Rule::in(self::SORTS)],
            'document.show_totals' => ['required', 'boolean'],
            'document.date_format' => ['required', Rule::in(self::DATE_FORMATS)],
            'document.file_prefix' => ['required', 'string', 'max:60', 'regex:/^[A-Za-z0-9_-]+$/'],
            'columns' => ['required', 'array'],
            'columns.*.key' => ['required', Rule::in(array_keys(self::COLUMNS))],
            'columns.*.label' => ['nullable', 'string', 'max:40'],
            'columns.*.enabled' => ['required', 'boolean'],
        ];
    }

    /** At least one column must stay enabled, otherwise the file would be empty. */
    public static function hasEnabledColumn(array $settings): bool
    {
        return collect($settings['columns'] ?? [])->contains(fn ($column) => ! empty($column['enabled']));
    }
}
