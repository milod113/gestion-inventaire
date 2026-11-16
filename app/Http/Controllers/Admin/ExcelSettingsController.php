<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ArticlesSpreadsheet;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Service;
use App\Models\Setting;
use App\Support\ExcelSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExcelSettingsController extends Controller
{
    private const PREVIEW_ROWS = 15;

    private const SAMPLE_ROWS = 50;

    public function edit(): Response
    {
        $saved = Setting::query()->with('updatedBy:id,name')->find(ExcelSettings::KEY);

        return Inertia::render('Admin/Settings/Excel', [
            'settings' => ExcelSettings::current(),
            'defaults' => ExcelSettings::defaults(),
            'options' => [
                'columns' => collect(ExcelSettings::COLUMNS)->map(fn (array $column) => $column['label']),
                'dateFormats' => ExcelSettings::DATE_FORMATS,
            ],
            'services' => Service::query()->withCount('articles')->orderBy('code')->get(['id', 'code', 'name']),
            'establishment' => \App\Support\PdfSettings::current()['header']['lines'][0] ?? '',
            'lastUpdate' => $saved ? ['at' => $saved->updated_at, 'by' => $saved->updatedBy?->name] : null,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $settings = $this->validated($request);
        ExcelSettings::save($settings, $request->user()->id);

        return back()->with('success', 'Parametres de l export Excel enregistres.');
    }

    public function reset(Request $request): RedirectResponse
    {
        ExcelSettings::save(ExcelSettings::defaults(), $request->user()->id);

        return back()->with('success', 'Parametres de l export Excel remis par defaut.');
    }

    /** First rows of the file as the unsaved settings would produce them. */
    public function preview(Request $request): JsonResponse
    {
        $settings = $this->validated($request);
        [$articles] = $this->sampleArticles($request);

        return response()->json([...ArticlesSpreadsheet::previewRows($articles, $settings, self::PREVIEW_ROWS), 'total' => (clone $articles)->count()]);
    }

    /** A real .xlsx with the unsaved settings, limited to a few rows, to open in Excel. */
    public function sample(Request $request): StreamedResponse
    {
        $settings = $this->validated($request);
        [$articles, $service] = $this->sampleArticles($request);

        return ArticlesSpreadsheet::download($articles, ['service' => $service], $settings, self::SAMPLE_ROWS);
    }

    private function validated(Request $request): array
    {
        $settings = $request->validate([...ExcelSettings::rules(), 'service_id' => ['nullable', 'integer']]);
        unset($settings['service_id']);

        if (! ExcelSettings::hasEnabledColumn($settings)) {
            throw \Illuminate\Validation\ValidationException::withMessages(['columns' => 'Cochez au moins une colonne.']);
        }

        return $settings;
    }

    /** @return array{0: \Illuminate\Database\Eloquent\Builder, 1: ?Service} */
    private function sampleArticles(Request $request): array
    {
        $service = $request->filled('service_id') ? Service::query()->find($request->integer('service_id')) : null;
        $articles = Article::query()->when($service, fn ($query) => $query->where(fn ($query) => $query
            ->where('service_id', $service->id)
            ->orWhere('service_code_source', (string) $service->code)));

        return [$articles, $service];
    }
}
