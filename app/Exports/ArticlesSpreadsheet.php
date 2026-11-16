<?php

namespace App\Exports;

use App\Models\Article;
use App\Models\Service;
use App\Support\ExcelSettings;
use App\Support\PdfSettings;
use DateTimeImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\CellAlignment;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\AutoFilter;
use OpenSpout\Writer\XLSX\Entity\SheetView;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Excel export of articles, laid out according to the Excel settings (Administration > Parametres > Excel). */
class ArticlesSpreadsheet
{
    private const TOTAL_KEYS = ['quantite_entree', 'quantite_sortie', 'valeur'];

    /**
     * @param  array{search?: string, service_code?: string, service?: ?Service}  $context  filters, shown in the title rows and the file name
     */
    public static function download(Builder $articles, array $context = [], ?array $settings = null, ?int $limit = null): StreamedResponse
    {
        $settings = ExcelSettings::normalize($settings ?? ExcelSettings::current());
        $serviceCode = $context['service']?->code ?? ($context['service_code'] ?? '');
        $filename = sprintf('%s%s-%s.xlsx', $settings['document']['file_prefix'], $serviceCode !== '' ? '-service-'.$serviceCode : '', now()->format('Y-m-d'));

        return response()->streamDownload(
            fn () => self::write(self::sorted($articles, $settings['document']['sort']), $settings, $context, $limit),
            $filename,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        );
    }

    /** The first rows as they will appear in the file, for the settings preview. */
    public static function previewRows(Builder $articles, array $settings, int $limit): array
    {
        $settings = ExcelSettings::normalize($settings);
        $columns = self::columns($settings);
        $resolve = self::serviceResolver();

        $rows = self::sorted($articles, $settings['document']['sort'])->limit($limit)->get()
            ->map(fn (Article $article) => collect($columns)->map(function (array $column) use ($article, $resolve, $settings) {
                $value = self::value($article, $column['key'], $resolve($article));

                return $value instanceof DateTimeImmutable ? self::formatDate($value, $settings['document']['date_format']) : $value;
            })->all());

        return ['columns' => $columns, 'rows' => $rows->all()];
    }

    private static function write(Builder $articles, array $settings, array $context, ?int $limit): void
    {
        $columns = self::columns($settings);
        $sheetSettings = $settings['sheet'];
        $last = count($columns) - 1;

        $writer = new Writer();
        foreach ($columns as $index => $column) {
            $writer->getOptions()->setColumnWidth(ExcelSettings::COLUMNS[$column['key']]['width'], $index + 1);
        }

        $titleRows = $settings['document']['title_rows'] ? self::titleRows($articles, $settings, $context, $limit) : [];
        foreach (array_keys($titleRows) as $index) {
            $writer->getOptions()->mergeCells(0, $index + 1, max($last, 0), $index + 1);
        }
        $headerRow = count($titleRows) + 1;

        $writer->openToFile('php://output');
        $sheet = $writer->getCurrentSheet();
        $sheet->setName($sheetSettings['name']);
        if ($sheetSettings['freeze_header']) {
            $sheet->setSheetView((new SheetView())->setFreezeRow($headerRow + 1));
        }

        foreach ($titleRows as $row) {
            $writer->addRow($row);
        }

        $color = strtoupper(ltrim($sheetSettings['header_color'], '#'));
        $writer->addRow(Row::fromValues(array_column($columns, 'label'), (new Style())
            ->setFontBold()
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor($color)
            ->setCellAlignment(CellAlignment::CENTER)
            ->setShouldWrapText()));

        $dateStyle = (new Style())->setFormat($settings['document']['date_format']);
        $moneyStyle = (new Style())->setFormat('#,##0.00');
        $zebraStyle = (new Style())->setBackgroundColor(self::tint($color, 0.92));
        $zebraDateStyle = (clone $zebraStyle)->setFormat($settings['document']['date_format']);
        $zebraMoneyStyle = (clone $zebraStyle)->setFormat('#,##0.00');

        $resolve = self::serviceResolver();
        $totals = array_fill_keys(self::TOTAL_KEYS, 0.0);
        $count = 0;

        // One streamed query: paging (lazy) would re-sort the whole table for every page, and lazyById()
        // would page on the id alone and skip rows. Services come from the resolver, not eager loading.
        foreach ($articles->when($limit, fn ($query) => $query->limit($limit))->cursor() as $article) {
            $service = $resolve($article);
            $zebra = $sheetSettings['zebra'] && $count % 2 === 1;
            $cells = [];
            foreach ($columns as $column) {
                $value = self::value($article, $column['key'], $service);
                $style = match (true) {
                    $value instanceof DateTimeImmutable => $zebra ? $zebraDateStyle : $dateStyle,
                    in_array($column['key'], ['prix_unitaire', 'valeur'], true) && $value !== null => $zebra ? $zebraMoneyStyle : $moneyStyle,
                    $zebra => $zebraStyle,
                    default => null,
                };
                $cells[] = Cell::fromValue($value, $style);
                if (in_array($column['key'], self::TOTAL_KEYS, true)) {
                    $totals[$column['key']] += (float) $value;
                }
            }
            $writer->addRow(new Row($cells));
            $count++;
        }

        if ($settings['document']['show_totals'] && collect($columns)->whereIn('key', self::TOTAL_KEYS)->isNotEmpty()) {
            $totalStyle = (new Style())->setFontBold()->setBackgroundColor(self::tint($color, 0.85));
            $writer->addRow(new Row(collect($columns)->map(fn (array $column, int $index) => match (true) {
                in_array($column['key'], self::TOTAL_KEYS, true) => Cell::fromValue($totals[$column['key']], $column['key'] === 'valeur' ? (clone $totalStyle)->setFormat('#,##0.00') : $totalStyle),
                $index === 0 => Cell::fromValue('Total', $totalStyle),
                default => Cell::fromValue(null, $totalStyle),
            })->all()));
        }

        if ($sheetSettings['autofilter'] && $count > 0) {
            $sheet->setAutoFilter(new AutoFilter(0, $headerRow, max($last, 0), $headerRow + $count));
        }
        $writer->close();
    }

    /** Establishment, title, generation date and filters above the table. */
    private static function titleRows(Builder $articles, array $settings, array $context, ?int $limit): array
    {
        $count = (clone $articles)->reorder()->count();
        $count = $limit ? min($count, $limit) : $count;
        $service = $context['service'] ?? null;
        $serviceLabel = $service ? $service->code.' — '.$service->name : (($context['service_code'] ?? '') ?: 'Tous les services');
        $establishment = PdfSettings::current()['header']['lines'][0] ?? '';

        return array_values(array_filter([
            $establishment !== '' ? Row::fromValues([$establishment], (new Style())->setFontBold()) : null,
            Row::fromValues([$settings['document']['title']], (new Style())->setFontBold()->setFontSize(14)->setFontColor(strtoupper(ltrim($settings['sheet']['header_color'], '#')))),
            Row::fromValues(['Généré le '.now()->timezone(config('backup.timezone', 'Africa/Algiers'))->format('d/m/Y H:i').' · '.$count.' article(s)'], (new Style())->setFontItalic()),
            Row::fromValues(['Recherche : '.(($context['search'] ?? '') ?: 'toutes les valeurs').' · Service : '.$serviceLabel]),
            Row::fromValues(['']),
        ]));
    }

    /** Enabled columns, in the configured order. */
    private static function columns(array $settings): array
    {
        return collect($settings['columns'])->where('enabled', true)->values()->all();
    }

    private static function sorted(Builder $articles, string $sort): Builder
    {
        $query = (clone $articles)->reorder();
        // The service code: the linked service's, else the code read from the archive.
        $serviceCode = 'COALESCE((SELECT code FROM services WHERE services.id = articles.service_id), articles.service_code_source + 0)';

        match ($sort) {
            'date_asc' => $query->orderBy('articles.date_mouvement'),
            'service' => $query->orderByRaw("CASE WHEN {$serviceCode} IS NULL THEN 1 ELSE 0 END")->orderByRaw($serviceCode)->orderByDesc('articles.date_mouvement'),
            'numero_inventaire' => $query->orderByRaw("CASE WHEN articles.numero_inventaire IS NULL OR articles.numero_inventaire = '' THEN 1 ELSE 0 END")
                ->orderByRaw('articles.numero_inventaire + 0')->orderBy('articles.numero_inventaire'),
            'description' => $query->orderBy('articles.description'),
            default => $query->orderByDesc('articles.date_mouvement'),
        };

        return $query->orderBy('articles.id');
    }

    /** Typed cell value: dates and numbers stay real dates and numbers in Excel. */
    private static function value(Article $article, string $key, ?Service $service): string|float|DateTimeImmutable|null
    {
        $number = fn ($value) => $value === null ? null : (float) $value;

        return match ($key) {
            'code_service' => $service?->code !== null ? (string) $service->code : $article->service_code_source,
            'service' => $service?->name,
            'description' => $article->description,
            'mouvement' => $article->mouvement,
            'date' => $article->date_mouvement?->toDateTimeImmutable(),
            'quantite_entree' => $number($article->quantite_entree),
            'quantite_sortie' => $number($article->quantite_sortie),
            'numero_bon' => $article->numero_bon,
            'numero_inventaire' => $article->numero_inventaire,
            'prix_unitaire' => $number($article->prix_unitaire),
            'valeur' => $article->prix_unitaire === null ? null : (float) $article->prix_unitaire * (float) ($article->quantite_entree ?? 0),
            'observation' => $article->observation,
            default => null,
        };
    }

    /** The linked service, else the one matching the source code (articles not linked yet). */
    private static function serviceResolver(): \Closure
    {
        /** @var Collection<int, Service> $services */
        $services = Service::query()->get(['id', 'code', 'name']);
        $servicesById = $services->keyBy('id');
        $servicesByCode = $services->keyBy(fn (Service $service) => (string) $service->code);

        return function (Article $article) use ($servicesById, $servicesByCode): ?Service {
            if ($article->service_id && $servicesById->has($article->service_id)) {
                return $servicesById->get($article->service_id);
            }
            $code = trim((string) $article->service_code_source);

            return $servicesByCode->get(ctype_digit($code) ? (string) (int) $code : $code);
        };
    }

    private static function formatDate(DateTimeImmutable $date, string $excelFormat): string
    {
        return $date->format(strtr($excelFormat, ['yyyy' => 'Y', 'yy' => 'y', 'mm' => 'm', 'dd' => 'd']));
    }

    /** Light shade of the header colour, as an RRGGBB string. */
    private static function tint(string $hex, float $ratio): string
    {
        $rgb = sscanf($hex, '%02x%02x%02x');

        return vsprintf('%02X%02X%02X', array_map(fn ($c) => (int) round($c + (255 - $c) * $ratio), $rgb));
    }
}
