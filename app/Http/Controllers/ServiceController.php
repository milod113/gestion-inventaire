<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Article;
use App\Models\Facture;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ServiceController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $source = $request->string('source')->value();

        return Inertia::render('Services/Index', [
            'services' => Service::query()
                ->fromSource($source)
                ->withCount('articles')
                ->withSum('factures', 'montant')
                ->when($search, function ($query, $search) {
                    $query->where(function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
                })
                ->orderBy('code')
                ->paginate(50)
                ->withQueryString(),
            'filters' => [
                'search' => $search,
                'source' => $source,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Services/Create');
    }

    public function show(Request $request, Service $service): Response
    {
        $search = $request->string('search')->trim()->value();
        $source = $request->string('source')->value();

        $summary = $this->serviceArticles($service, $search, $source)->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('coalesce(sum(quantite_entree), 0) as entries')
            ->selectRaw('coalesce(sum(quantite_sortie), 0) as exits')
            ->first();

        return Inertia::render('Services/Show', [
            'service' => $service,
            'articles' => $this->serviceArticles($service, $search, $source)
                ->orderByDesc('date_mouvement')
                ->orderByDesc('id')
                ->paginate(50)
                ->withQueryString(),
            'summary' => [
                'total' => (int) $summary->total,
                'entries' => (int) $summary->entries,
                'exits' => (int) $summary->exits,
            ],
            'filters' => ['search' => $search, 'source' => $source],
        ]);
    }

    /** Excel export of the articles shown on the service page (same search, no pagination). */
    public function export(Request $request, Service $service): StreamedResponse
    {
        $search = $request->string('search')->trim()->value();
        $articles = $this->serviceArticles($service, $search, $request->string('source')->value())
            ->orderByDesc('date_mouvement')
            ->orderByDesc('id');
        $filename = sprintf('articles-service-%s-%s.xlsx', $service->code, now()->format('Y-m-d'));

        return response()->streamDownload(function () use ($articles, $service) {
            $writer = new Writer();
            $writer->openToFile('php://output');
            $writer->addRow(Row::fromValues([
                'Code service', 'Service', 'Designation', 'Mouvement', 'Date mouvement',
                'Qte entree', 'Qte sortie', 'N° bon', 'N° inventaire', 'Observation',
            ], (new Style())->setFontBold()));

            foreach ($articles->lazyById(500) as $article) {
                $writer->addRow(Row::fromValues([
                    $service->code,
                    $service->name,
                    $article->description,
                    $article->mouvement,
                    $article->date_mouvement?->format('d/m/Y'),
                    $article->quantite_entree === null ? null : (float) $article->quantite_entree,
                    $article->quantite_sortie === null ? null : (float) $article->quantite_sortie,
                    $article->numero_bon,
                    $article->numero_inventaire,
                    $article->observation,
                ]));
            }

            $writer->close();
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /** Same rule as the articles list: linked to the service, or still carrying its source code. */
    private function serviceArticles(Service $service, string $search, string $source)
    {
        return Article::query()
            ->where(fn ($query) => $query->where('service_id', $service->id)
                ->orWhere('service_code_source', (string) $service->code))
            ->fromSource($source)
            ->when($search, fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('description', 'like', "%{$search}%")
                ->orWhere('numero_inventaire', 'like', "%{$search}%")
                ->orWhere('numero_bon', 'like', "%{$search}%")));
    }
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'integer', 'min:1', 'unique:services,code'],
            'name' => ['required', 'string', 'max:255', 'unique:services,name'],
        ]);

        Service::create($validated);

        return redirect()
            ->route('services.index')
            ->with('success', 'Service ajoute avec succes.');
    }

    public function edit(Service $service): Response
    {
        return Inertia::render('Services/Edit', [
            'service' => $service,
        ]);
    }

    public function update(Request $request, Service $service): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'integer', 'min:1', Rule::unique('services', 'code')->ignore($service)],
            'name' => ['required', 'string', 'max:255', Rule::unique('services', 'name')->ignore($service)],
        ]);

        $service->update($validated);

        return redirect()
            ->route('services.index')
            ->with('success', 'Service modifie avec succes.');
    }

    public function destroy(Service $service): RedirectResponse
    {
        if ($service->articles()->exists() || $service->factures()->exists()) {
            return back()->with('error', 'Ce service est utilise par des articles ou des factures et ne peut pas etre supprime.');
        }

        $service->delete();

        return redirect()
            ->route('services.index')
            ->with('success', 'Service supprime avec succes.');
    }
}
