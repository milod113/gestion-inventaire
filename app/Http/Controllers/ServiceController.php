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

class ServiceController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();

        return Inertia::render('Services/Index', [
            'services' => Service::query()
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
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Services/Create');
    }

    public function show(Service $service): Response
    {
        $articles = Article::query()->where('service_id', $service->id);
        $factures = Facture::query()->where('service_id', $service->id);

        return Inertia::render('Services/Show', [
            'service' => $service,
            'statistics' => [
                'articles_count' => (clone $articles)->count(),
                'entries' => (float) (clone $articles)->sum('quantite_entree'),
                'exits' => (float) (clone $articles)->sum('quantite_sortie'),
                'factures_count' => (clone $factures)->count(),
                'factures_amount' => (float) (clone $factures)->sum('montant'),
            ],
            'topArticles' => (clone $articles)
                ->selectRaw('description, SUM(COALESCE(quantite_sortie, 0)) as total_sortie, COUNT(*) as mouvements')
                ->groupBy('description')->orderByDesc('total_sortie')->limit(10)->get(),
            'monthlyMovements' => (clone $articles)
                ->whereNotNull('date_mouvement')
                ->selectRaw("DATE_FORMAT(date_mouvement, '%Y-%m') as month, SUM(COALESCE(quantite_entree, 0)) as entries, SUM(COALESCE(quantite_sortie, 0)) as exits")
                ->groupBy('month')->orderBy('month')->get(),
        ]);
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
        $service->delete();

        return redirect()
            ->route('services.index')
            ->with('success', 'Service supprime avec succes.');
    }
}
