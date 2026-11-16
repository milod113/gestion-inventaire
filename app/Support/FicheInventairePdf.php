<?php

namespace App\Support;

use App\Models\Article;
use App\Models\Service;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Support\Collection;

/** Builds the "fiche d'inventaire" PDF from a list of articles and the PDF settings. */
class FicheInventairePdf
{
    /**
     * @param  Collection<int, Article>  $articles
     * @param  array{search?: string, service?: ?Service, serviceCode?: string, preview?: bool}  $context
     */
    public static function make(Collection $articles, array $settings, array $context = []): DomPdf
    {
        $settings = PdfSettings::normalize($settings);
        $articles = self::sort($articles, $settings['document']['sort']);
        $columns = self::columns($settings);
        $accent = $settings['page']['accent'];

        $pdf = Pdf::loadView('articles.print', [
            'settings' => $settings,
            'columns' => $columns,
            'groups' => self::groups($articles, $settings['document']['group_by_service']),
            'count' => $articles->count(),
            'search' => $context['search'] ?? '',
            'service' => $context['service'] ?? null,
            'serviceCode' => $context['serviceCode'] ?? '',
            'preview' => $context['preview'] ?? false,
            'generatedAt' => now()->timezone(config('backup.timezone', 'Africa/Algiers'))->format('d/m/Y H:i'),
            'logo' => $settings['header']['show_logo'] ? PdfSettings::logoDataUri() : null,
            'colors' => [
                'accent' => $accent,
                'dark' => self::mix($accent, '#000000', 0.25),
                'tint' => self::mix($accent, '#ffffff', 0.9),
                'zebra' => self::mix($accent, '#ffffff', 0.95),
            ],
        ])->setPaper($settings['page']['paper'], $settings['page']['orientation']);

        if ($settings['footer']['page_numbers']) {
            self::numberPages($pdf);
        }

        return $pdf;
    }

    /** "Page X / Y" at the bottom right of every page; the total is only known once rendered. */
    private static function numberPages(DomPdf $pdf): void
    {
        $pdf->render();
        $dompdf = $pdf->getDomPDF();
        $canvas = $dompdf->getCanvas();
        $font = $dompdf->getFontMetrics()->getFont('DejaVu Sans');
        $size = 7;
        $width = $dompdf->getFontMetrics()->getTextWidth('Page 00 / 00', $font, $size);

        // 10mm right margin and 14mm bottom margin, as in the template's @page rule.
        $canvas->page_text($canvas->get_width() - 28.35 - $width, $canvas->get_height() - 28, 'Page {PAGE_NUM} / {PAGE_COUNT}', $font, $size, [0.44, 0.41, 0.39]);
    }

    /** Cell value of an article for a column key. */
    public static function value(Article $article, string $key, ?Service $service): string
    {
        $number = fn ($value, int $decimals = 0) => $value === null ? '—' : number_format((float) $value, $decimals, ',', ' ');

        return match ($key) {
            'description' => (string) $article->description,
            'service' => $service ? $service->code.' — '.$service->name : ($article->service_code_source ?: '—'),
            'mouvement' => $article->mouvement ?: '—',
            'date' => $article->date_mouvement?->format('d/m/Y') ?? '—',
            'quantite_entree' => $number($article->quantite_entree),
            'quantite_sortie' => $number($article->quantite_sortie),
            'numero_bon' => $article->numero_bon ?: '—',
            'numero_inventaire' => $article->numero_inventaire ?: '—',
            'prix_unitaire' => $number($article->prix_unitaire, 2),
            'valeur' => $number(self::articleValue($article), 2),
            'observation' => $article->observation ?: '—',
            default => '',
        };
    }

    public static function articleValue(Article $article): ?float
    {
        return $article->prix_unitaire === null ? null : (float) $article->prix_unitaire * (float) ($article->quantite_entree ?? 0);
    }

    /** Enabled columns with their width in percent of the table. */
    private static function columns(array $settings): array
    {
        $columns = collect($settings['columns'])->where('enabled', true)->values();
        if ($settings['document']['group_by_service']) {
            // The service is already in each group heading.
            $columns = $columns->reject(fn (array $column) => $column['key'] === 'service')->values();
        }
        $total = $columns->sum(fn (array $column) => PdfSettings::COLUMNS[$column['key']]['width']) ?: 1;

        return $columns->map(fn (array $column) => [
            ...$column,
            'width' => round(PdfSettings::COLUMNS[$column['key']]['width'] / $total * 100, 2),
            'numeric' => in_array($column['key'], ['quantite_entree', 'quantite_sortie', 'prix_unitaire', 'valeur'], true),
            'centered' => in_array($column['key'], ['date', 'mouvement'], true),
        ])->all();
    }

    private static function sort(Collection $articles, string $sort): Collection
    {
        $sorted = match ($sort) {
            'date_asc' => $articles->sortBy([['date_mouvement', 'asc'], ['id', 'asc']]),
            // Articles without a number go last; "9" comes before "10".
            'numero_inventaire' => $articles->sortBy(fn (Article $a) => ($a->numero_inventaire ? '0' : '1').$a->numero_inventaire, SORT_NATURAL | SORT_FLAG_CASE),
            'description' => $articles->sortBy(fn (Article $a) => (string) $a->description, SORT_NATURAL | SORT_FLAG_CASE),
            default => $articles->sortBy([['date_mouvement', 'desc'], ['id', 'desc']]),
        };

        return $sorted->values();
    }

    /** One group per service (or a single group), each with its articles, resolved services and totals. */
    private static function groups(Collection $articles, bool $byService): Collection
    {
        $servicesByCode = Service::query()->get(['id', 'code', 'name'])->keyBy(fn (Service $s) => (string) $s->code);
        $resolve = function (Article $article) use ($servicesByCode): ?Service {
            if ($article->service) {
                return $article->service;
            }
            $code = trim((string) $article->service_code_source);

            return $servicesByCode->get(ctype_digit($code) ? (string) (int) $code : $code);
        };

        $rows = $articles->map(fn (Article $article) => ['article' => $article, 'service' => $resolve($article)]);
        $grouped = $byService
            ? $rows->groupBy(fn (array $row) => $row['service'] ? 'service:'.$row['service']->id : 'code:'.(trim((string) $row['article']->service_code_source) ?: 'sans-service'))
            : collect(['all' => $rows]);

        $groups = $grouped->map(function (Collection $rows) use ($byService) {
            $first = $rows->first();

            return [
                'code' => $byService ? ($first['service']?->code ?? $first['article']->service_code_source) : null,
                'name' => $byService ? ($first['service']?->name ?? 'Service non référencé') : null,
                'rows' => $rows,
                'totals' => [
                    'quantite_entree' => $rows->sum(fn (array $row) => (float) $row['article']->quantite_entree),
                    'quantite_sortie' => $rows->sum(fn (array $row) => (float) $row['article']->quantite_sortie),
                    'valeur' => $rows->sum(fn (array $row) => self::articleValue($row['article']) ?? 0),
                ],
            ];
        });

        return $byService ? $groups->sortBy(fn (array $group) => sprintf('%s %s', $group['code'] ?? '', $group['name']))->values() : $groups->values();
    }

    /** Mixes two hex colours; $ratio is the share of the second colour. */
    private static function mix(string $from, string $to, float $ratio): string
    {
        [$a, $b] = [sscanf($from, '#%02x%02x%02x'), sscanf($to, '#%02x%02x%02x')];

        return vsprintf('#%02x%02x%02x', array_map(fn ($x, $y) => (int) round($x + ($y - $x) * $ratio), $a, $b));
    }
}
