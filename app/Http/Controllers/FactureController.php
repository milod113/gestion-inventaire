<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Facture;
use App\Models\Fournisseur;
use App\Models\Rappel;
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
        $source = $request->string('source')->value();
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
            ->fromSource($source)
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
                'source' => $source,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Factures/Create', ['services' => Facture::SERVICES]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedData($request);
        $data['service_reference_normalisee'] = ServiceReferenceNormalizer::normalize($data['service_reference'] ?? null);
        $facture = Facture::create($data);

        return redirect()->route('factures.show', $facture)->with('success', 'Facture ajoutee avec succes.');
    }

    public function show(Facture $facture): Response
    {
        $historique = ActivityLog::query()
            ->where('subject_type', 'Facture')
            ->where('subject_id', $facture->id)
            ->orderByDesc('id')
            ->limit(200)
            ->get(['id', 'user_name', 'event', 'old_values', 'new_values', 'motif', 'created_at']);

        return Inertia::render('Factures/Show', [
            'facture' => $facture->load('service:id,code,name', 'creator:id,name', 'editor:id,name', 'fournisseur:id,code,appellation,telephone,adresse'),
            'details' => $facture->details()->with('article')->orderBy('id')->paginate(50),
            'historique' => $historique,
            'rappels' => Rappel::enCoursSurFiche($facture, request()->user()),
            'serviceNames' => $this->serviceNames($facture, $historique),
        ]);
    }

    public function edit(Request $request, Facture $facture): Response|RedirectResponse
    {
        if ($facture->isImported() && ! $request->user()->can('factures.correct_import')) {
            return $this->importedLocked();
        }

        return Inertia::render('Factures/Edit', [
            'facture' => $facture->load('fournisseur:id,code,appellation,telephone,adresse'),
            'services' => Facture::SERVICES,
            'motifs' => Facture::MOTIFS_CORRECTION,
        ]);
    }

    public function update(Request $request, Facture $facture): RedirectResponse
    {
        if (! $facture->isImported()) {
            $data = $this->validatedData($request, $facture);
            $data['service_reference_normalisee'] = ServiceReferenceNormalizer::normalize($data['service_reference'] ?? null);
            $facture->update($data);

            return redirect()->route('factures.index')->with('success', 'Facture modifiee avec succes.');
        }

        if (! $request->user()->can('factures.correct_import')) {
            return $this->importedLocked();
        }

        $data = $this->validatedData($request, $facture);
        $correction = $request->validate([
            'motif_correction' => ['required', Rule::in(array_keys(Facture::MOTIFS_CORRECTION))],
            'motif_precision' => ['nullable', 'required_if:motif_correction,autre', 'string', 'max:500'],
        ], [
            'motif_correction.required' => 'Le motif de la correction est obligatoire.',
            'motif_precision.required_if' => 'Precisez le motif de la correction.',
        ]);
        $motif = Facture::MOTIFS_CORRECTION[$correction['motif_correction']];
        if (filled($correction['motif_precision'] ?? null)) {
            $motif .= ' : '.trim($correction['motif_precision']);
        }

        $data['service_reference_normalisee'] = ServiceReferenceNormalizer::normalize($data['service_reference'] ?? null);
        if (! $facture->corriger($data, $motif)) {
            return back()->with('error', 'Aucune valeur n a ete modifiee : la correction n a pas ete enregistree.');
        }

        return redirect()->route('factures.show', $facture)->with('success', 'Correction enregistree. Les valeurs d origine sont conservees.');
    }

    public function destroy(Facture $facture): RedirectResponse
    {
        if ($facture->isImported()) {
            return $this->importedLocked();
        }

        if ($facture->details()->exists()) {
            return back()->with('error', 'Cette facture contient des articles. Retirez leurs liens avant de supprimer la facture.');
        }

        $facture->delete();

        return redirect()->route('factures.index')->with('success', 'Facture supprimee avec succes.');
    }

    private function importedLocked(): RedirectResponse
    {
        return redirect()->route('factures.index')->with('error', 'Une facture importee est en lecture seule.');
    }

    /** Libelles des services cites dans l'historique et les valeurs d'origine (id => "code - nom"). */
    private function serviceNames(Facture $facture, $historique): array
    {
        $ids = collect([$facture->service_id, $facture->valeurs_origine['service_id'] ?? null])
            ->merge($historique->flatMap(fn (ActivityLog $log) => [$log->old_values['service_id'] ?? null, $log->new_values['service_id'] ?? null]))
            ->filter()
            ->unique();

        return Service::query()->whereIn('id', $ids)->get(['id', 'code', 'name'])
            ->mapWithKeys(fn (Service $service) => [$service->id => "{$service->code} - {$service->name}"])
            ->all();
    }

    private function validatedData(Request $request, ?Facture $facture = null): array
    {
        // Seuls les services de Facture::SERVICES sont proposes ; la reference importee
        // existante d'une facture (ex. "ECONOMET") reste acceptee tant qu'elle n'est pas changee.
        $references = array_filter([...array_keys(Facture::SERVICES), $facture?->service_reference]);

        return $request->validate([
            'service_id' => ['nullable', 'integer', Rule::exists('services', 'id')],
            'n_bon' => ['nullable', 'string', 'max:255'],
            'service_reference' => ['nullable', 'string', 'max:255', Rule::in($references)],
            'imputation' => ['nullable', 'string', 'max:255'],
            'n_journal' => ['nullable', 'string', 'max:255'],
            'numero_facture' => ['nullable', 'string', 'max:255'],
            'date_facture' => ['nullable', 'string', 'max:255'],
            'montant' => ['nullable', 'numeric', 'min:0'],
            // Le fournisseur doit exister dans la table ; un ancien code importe sans fiche reste accepte tant qu'il n'est pas change.
            'code_fournisseur' => ['nullable', 'string', 'max:255', function (string $attribute, mixed $value, \Closure $fail) use ($facture) {
                if ($value !== $facture?->code_fournisseur && ! Fournisseur::where('code', $value)->exists()) {
                    $fail('Ce fournisseur n existe pas : selectionnez-le dans la liste ou creez-le.');
                }
            }],
            'n_inventaire' => ['nullable', 'string', 'max:255'],
            'cfac' => ['nullable', 'string', 'max:255'],
            'n_mandat' => ['nullable', 'string', 'max:255'],
            'date_mandat' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
