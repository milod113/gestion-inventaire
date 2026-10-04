<?php

namespace App\Http\Controllers;

use App\Models\Facture;
use App\Models\Service;
use App\Services\ServiceReferenceNormalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FactureController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $serviceReference = $request->string('service_reference')->trim()->value();
        $dateFrom = $request->string('date_from')->trim()->value();
        $dateTo = $request->string('date_to')->trim()->value();
        $sort = $request->string('sort')->value();
        $direction = $request->string('direction')->value();
        $sort = in_array($sort, ['date', 'amount', 'number'], true) ? $sort : 'date';
        $direction = $direction === 'asc' ? 'asc' : 'desc';
        $sortColumn = match ($sort) {
            'amount' => 'montant',
            'number' => 'numero_facture',
            default => 'date_facture',
        };

        $query = Facture::query()
            ->with('service:id,code,name')
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('n_bon', 'like', "%{$search}%")
                        ->orWhere('numero_facture', 'like', "%{$search}%")
                        ->orWhere('service_reference', 'like', "%{$search}%");
                });
            })
            ->when($serviceReference, fn ($query) => $query->where('service_reference_normalisee', $serviceReference))
            ->when($dateFrom, fn ($query) => $query->where('date_facture', '>=', $dateFrom))
            ->when($dateTo, fn ($query) => $query->where('date_facture', '<=', $dateTo));

        return Inertia::render('Factures/Index', [
            'factures' => (clone $query)
                ->orderBy($sortColumn, $direction)
                ->orderByDesc('id')
                ->paginate(50)
                ->withQueryString(),
            'serviceReferences' => Facture::query()->whereNotNull('service_reference_normalisee')->where('service_reference_normalisee', '!=', '')->distinct()->orderBy('service_reference_normalisee')->pluck('service_reference_normalisee'),
            'summary' => [
                'count' => (clone $query)->count(),
                'amount' => (clone $query)->sum('montant'),
            ],
            'filters' => [
                'search' => $search,
                'service_reference' => $serviceReference,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Factures/Create', ['services' => $this->services()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedData($request);
        $data['service_reference_normalisee'] = ServiceReferenceNormalizer::normalize($data['service_reference'] ?? null);
        Facture::create($data);

        return redirect()->route('factures.index')->with('success', 'Facture ajoutee avec succes.');
    }

    public function show(Facture $facture): Response
    {
        return Inertia::render('Factures/Show', [
            'facture' => $facture->load('service:id,code,name'),
        ]);
    }

    public function edit(Facture $facture): Response
    {
        return Inertia::render('Factures/Edit', [
            'facture' => $facture,
            'services' => $this->services(),
        ]);
    }

    public function update(Request $request, Facture $facture): RedirectResponse
    {
        $data = $this->validatedData($request);
        $data['service_reference_normalisee'] = ServiceReferenceNormalizer::normalize($data['service_reference'] ?? null);
        $facture->update($data);

        return redirect()->route('factures.index')->with('success', 'Facture modifiee avec succes.');
    }

    public function destroy(Facture $facture): RedirectResponse
    {
        $facture->delete();

        return redirect()->route('factures.index')->with('success', 'Facture supprimee avec succes.');
    }

    private function services()
    {
        return Service::query()->orderBy('code')->get(['id', 'code', 'name']);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'service_id' => ['nullable', 'integer', Rule::exists('services', 'id')],
            'n_bon' => ['nullable', 'string', 'max:255'],
            'service_reference' => ['nullable', 'string', 'max:255'],
            'imputation' => ['nullable', 'string', 'max:255'],
            'n_journal' => ['nullable', 'string', 'max:255'],
            'numero_facture' => ['nullable', 'string', 'max:255'],
            'date_facture' => ['nullable', 'string', 'max:255'],
            'montant' => ['nullable', 'numeric', 'min:0'],
            'code_fournisseur' => ['nullable', 'string', 'max:255'],
            'n_inventaire' => ['nullable', 'string', 'max:255'],
            'cfac' => ['nullable', 'string', 'max:255'],
            'n_mandat' => ['nullable', 'string', 'max:255'],
            'date_mandat' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
