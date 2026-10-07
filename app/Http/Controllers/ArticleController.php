<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Facture;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;

class ArticleController extends Controller
{
    public function suggestions(Request $request): JsonResponse
    {
        $term = $request->string('q')->trim()->value();
        if (mb_strlen($term) < 2) {
            return response()->json([]);
        }

        $articles = Article::query()
            ->with('service:id,code,name')
            ->where(function ($query) use ($term) {
                $query->where('description', 'like', "%{$term}%")
                    ->orWhere('numero_inventaire', 'like', "%{$term}%")
                    ->orWhere('numero_bon', 'like', "%{$term}%")
                    ->orWhere('service_code_source', 'like', "%{$term}%");
            })
            ->orderBy('description')
            ->limit(8)
            ->get(['id', 'description', 'numero_inventaire', 'numero_bon', 'service_id', 'service_code_source']);

        return response()->json($articles->map(function (Article $article) use ($term) {
            $matchedNumber = collect([$article->numero_inventaire, $article->numero_bon])
                ->first(fn ($value) => $value && mb_stripos($value, $term) !== false);

            return [
                'id' => $article->id,
                'description' => $article->description,
                'numero_inventaire' => $article->numero_inventaire,
                'service' => $article->service?->name ?? $article->service_code_source,
                'search_value' => $matchedNumber ?: $article->description,
            ];
        }));
    }

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $serviceCode = $request->string('service_code')->trim()->value();
        $source = $request->string('source')->value();

        return Inertia::render('Articles/Index', [
            'articles' => Article::query()
                ->with('service:id,code,name')
                ->fromSource($source)
                ->when($search, function ($query, $search) {
                    $query->where(function ($query) use ($search) {
                        $query->where('description', 'like', "%{$search}%")
                            ->orWhere('numero_inventaire', 'like', "%{$search}%")
                            ->orWhere('numero_bon', 'like', "%{$search}%")
                            ->orWhere('service_code_source', 'like', "%{$search}%")
                            ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery
                                ->where('code', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%"));
                    });
                })
                ->when($serviceCode, fn ($query) => $query->where(function ($query) use ($serviceCode) {
                    $query->where('service_code_source', $serviceCode)
                        ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery->where('code', $serviceCode));
                }))
                ->orderByDesc('date_mouvement')
                ->paginate(50)
                ->withQueryString(),
            'services' => $this->services(),
            'filters' => ['search' => $search, 'service_code' => $serviceCode, 'source' => $source],
        ]);
    }

    public function print(Request $request)
    {
        $articles = $this->filteredArticles($request)
            ->with('service:id,code,name')
            ->orderByDesc('date_mouvement')
            ->get();

        $servicesByCode = Service::query()->get(['id', 'code', 'name'])
            ->keyBy(fn (Service $service) => (string) $service->code);
        $resolveService = function (Article $article) use ($servicesByCode) {
            if ($article->service) {
                return $article->service;
            }

            $code = trim((string) $article->service_code_source);
            $key = ctype_digit($code) ? (string) ((int) $code) : $code;

            return $servicesByCode->get($key);
        };

        $serviceGroups = $articles->groupBy(function (Article $article) use ($resolveService) {
            $service = $resolveService($article);

            return $service
                ? 'service:'.$service->id
                : 'code:'.(trim((string) $article->service_code_source) ?: 'sans-service');
        })->map(function ($group) use ($resolveService) {
            $firstArticle = $group->first();
            $service = $resolveService($firstArticle);

            return [
                'code' => $service?->code ?? $firstArticle->service_code_source,
                'name' => $service?->name ?? 'Service non référencé',
                'articles' => $group,
            ];
        })->sortBy(fn ($group) => sprintf('%s %s', $group['code'] ?? '', $group['name']))->values();

        $serviceCode = $request->string('service_code')->trim()->value();
        $service = $serviceCode ? Service::query()->where('code', $serviceCode)->first() : null;
        $logoPath = public_path('Logo CHU.jpg');
        $logo = is_file($logoPath)
            ? 'data:image/jpeg;base64,'.base64_encode(file_get_contents($logoPath))
            : null;

        return Pdf::loadView('articles.print', [
            'articles' => $articles,
            'serviceGroups' => $serviceGroups,
            'search' => $request->string('search')->trim()->value(),
            'service' => $service,
            'serviceCode' => $serviceCode,
            'generatedAt' => now()->format('d/m/Y H:i'),
            'logo' => $logo,
        ])
            ->setPaper('a4', 'landscape')
            ->download('mouvements-inventaire.pdf');
    }

    public function create(Request $request): Response
    {
        $request->validate(['facture_id' => ['nullable', 'integer', Rule::exists('factures', 'id')]]);
        if ($request->filled('facture_id')) {
            abort_unless($request->user()->can('factures.view'), 403);
        }

        return Inertia::render('Articles/Create', [
            'services' => $this->services(),
            'factures' => $this->factures($request),
            'factureId' => $request->input('facture_id'),
        ]);
    }

    public function createForFacture(Facture $facture): Response
    {
        return Inertia::render('Articles/Create', [
            'services' => $this->services(),
            'factures' => [$facture->only('id', 'numero_facture', 'date_facture')],
            'factureId' => $facture->id,
            'factureContext' => $facture->only('id', 'numero_facture'),
        ]);
    }

    public function storeForFacture(Request $request, Facture $facture): RedirectResponse
    {
        $request->merge(['facture_id' => $facture->id]);

        return $this->store($request);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedData($request);
        $factureId = $data['facture_id'] ?? null;
        unset($data['facture_id']);
        DB::transaction(function () use ($data, $factureId) {
            $article = Article::create($data);
            if ($factureId !== null) {
                $article->detailFacture()->create(['facture_id' => $factureId]);
            }
        });

        if ($factureId !== null) {
            return redirect()->route('factures.show', $factureId)->with('success', 'Article ajoute a la facture avec succes.');
        }

        return redirect()->route('articles.index')->with('success', 'Article ajoute avec succes.');
    }

    public function show(Request $request, Article $article): Response
    {
        $article->load('service:id,code,name');
        if ($request->user()->can('factures.view')) {
            $article->load('detailFacture.facture:id,numero_facture');
        }

        return Inertia::render('Articles/Show', ['article' => $article]);
    }

    public function edit(Request $request, Article $article): Response
    {
        return Inertia::render('Articles/Edit', [
            'article' => $article->load('detailFacture'),
            'services' => $this->services(),
            'factures' => $this->factures($request),
        ]);
    }

    public function update(Request $request, Article $article): RedirectResponse
    {
        $data = $this->validatedData($request);
        $changeLink = array_key_exists('facture_id', $data);
        $factureId = $data['facture_id'] ?? null;
        unset($data['facture_id']);
        DB::transaction(function () use ($article, $data, $changeLink, $factureId) {
            $article->update($data);
            if ($changeLink) {
                if ($factureId === null) {
                    $article->detailFacture()->delete();
                } else {
                    $article->detailFacture()->updateOrCreate([], ['facture_id' => $factureId]);
                }
            }
        });

        return redirect()->route('articles.index')->with('success', 'Article modifie avec succes.');
    }

    public function destroy(Article $article): RedirectResponse
    {
        $article->delete();

        return redirect()->route('articles.index')->with('success', 'Article supprime avec succes.');
    }

    private function services()
    {
        return Service::query()->orderBy('code')->get(['id', 'code', 'name']);
    }

    private function filteredArticles(Request $request)
    {
        $search = $request->string('search')->trim()->value();
        $serviceCode = $request->string('service_code')->trim()->value();

        return Article::query()
            ->fromSource($request->string('source')->value())
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('description', 'like', "%{$search}%")
                        ->orWhere('numero_inventaire', 'like', "%{$search}%")
                        ->orWhere('numero_bon', 'like', "%{$search}%")
                        ->orWhere('service_code_source', 'like', "%{$search}%")
                        ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery
                            ->where('code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"));
                });
            })
            ->when($serviceCode, fn ($query) => $query->where(function ($query) use ($serviceCode) {
                $query->where('service_code_source', $serviceCode)
                    ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery->where('code', $serviceCode));
            }));
    }

    private function validatedData(Request $request): array
    {
        if ($request->exists('facture_id')) {
            abort_unless($request->user()->can('factures.view'), 403);
        }

        return $request->validate([
            'facture_id' => ['nullable', 'integer', Rule::exists('factures', 'id')],
            'prix_unitaire' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99', 'decimal:0,2'],
            'service_id' => ['nullable', 'integer', Rule::exists('services', 'id')],
            'service_code_source' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:255'],
            'mouvement' => ['nullable', 'string', 'max:10'],
            'date_mouvement' => ['nullable', 'date'],
            'date_source' => ['nullable', 'string', 'max:255'],
            'quantite_entree' => ['nullable', 'numeric', 'min:0'],
            'quantite_sortie' => ['nullable', 'numeric', 'min:0'],
            'numero_bon' => ['nullable', 'string', 'max:255'],
            'observation' => ['nullable', 'string'],
            'numero_inventaire' => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function factures(Request $request)
    {
        return $request->user()->can('factures.view')
            ? Facture::query()->orderByDesc('id')->get(['id', 'numero_facture', 'date_facture'])
            : [];
    }
}
