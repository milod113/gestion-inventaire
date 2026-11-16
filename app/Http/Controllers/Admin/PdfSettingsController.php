<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Service;
use App\Models\Setting;
use App\Support\FicheInventairePdf;
use App\Support\PdfSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PdfSettingsController extends Controller
{
    /** Number of articles printed in the preview. */
    private const PREVIEW_ARTICLES = 30;

    public function edit(): Response
    {
        $saved = Setting::query()->with('updatedBy:id,name')->find(PdfSettings::KEY);

        return Inertia::render('Admin/Settings/Pdf', [
            'settings' => PdfSettings::current(),
            'defaults' => PdfSettings::defaults(),
            'options' => [
                'fonts' => PdfSettings::FONTS,
                'columns' => collect(PdfSettings::COLUMNS)->map(fn (array $column) => $column['label']),
            ],
            'customLogo' => PdfSettings::hasCustomLogo(),
            'logo' => PdfSettings::logoDataUri(),
            'services' => Service::query()->withCount('articles')->orderBy('code')->get(['id', 'code', 'name']),
            'lastUpdate' => $saved ? ['at' => $saved->updated_at, 'by' => $saved->updatedBy?->name] : null,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        PdfSettings::save($request->validate(PdfSettings::rules()), $request->user()->id);

        return back()->with('success', 'Parametres du PDF enregistres. Ils s appliquent a toutes les impressions.');
    }

    public function reset(Request $request): RedirectResponse
    {
        PdfSettings::save(PdfSettings::defaults(), $request->user()->id);

        return back()->with('success', 'Parametres du PDF remis par defaut.');
    }

    /** Renders the unsaved settings on a sample of real articles. */
    public function preview(Request $request)
    {
        $settings = $request->validate([...PdfSettings::rules(), 'service_id' => ['nullable', 'integer']]);
        $service = $request->filled('service_id') ? Service::query()->find($request->integer('service_id')) : null;

        $articles = Article::query()
            ->with('service:id,code,name')
            ->when($service, fn ($query) => $query->where(fn ($query) => $query
                ->where('service_id', $service->id)
                ->orWhere('service_code_source', (string) $service->code)))
            ->latest('date_mouvement')
            ->limit(self::PREVIEW_ARTICLES)
            ->get();

        return FicheInventairePdf::make($articles, $settings, [
            'service' => $service,
            'serviceCode' => $service ? (string) $service->code : '',
            'preview' => true,
        ])->stream('apercu.pdf');
    }

    public function uploadLogo(Request $request): RedirectResponse
    {
        $request->validate(['logo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048']]);
        Storage::disk('local')->put(PdfSettings::LOGO_PATH, $request->file('logo')->get());

        return back()->with('success', 'Logo du PDF remplace.');
    }

    public function deleteLogo(): RedirectResponse
    {
        Storage::disk('local')->delete(PdfSettings::LOGO_PATH);

        return back()->with('success', 'Logo d origine du CHU retabli.');
    }
}
