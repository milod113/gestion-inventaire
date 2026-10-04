<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Facture;
use App\Models\Service;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DataQualityController extends Controller
{
    public function index(Request $request): Response
    {
        $checks = $this->checks();
        $counts = collect($checks)->map(fn (array $check) => $check['query']()->count());

        $selected = $request->string('check')->value();
        if (! isset($checks[$selected])) {
            $selected = $counts->filter()->keys()->first() ?? array_key_first($checks);
        }

        $check = $checks[$selected];
        $rows = $check['query']()
            ->when($check['entity'] === 'article', fn (Builder $query) => $query->with('service:id,code,name'))
            ->when($check['entity'] === 'facture', fn (Builder $query) => $query->with('service:id,code,name'))
            ->orderBy($check['order'] ?? 'id')
            ->orderBy('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Quality/Index', [
            'checks' => collect($checks)->map(fn (array $check, string $key) => [
                'key' => $key,
                'label' => $check['label'],
                'description' => $check['description'],
                'severity' => $check['severity'],
                'entity' => $check['entity'],
                'count' => $counts[$key],
            ])->values(),
            'selected' => $selected,
            'rows' => $rows,
            'totals' => ['articles' => Article::count(), 'factures' => Facture::count()],
            'unknownServiceCodes' => $selected === 'articles_sans_service' ? $this->unknownServiceCodes() : [],
        ]);
    }

    /**
     * Link articles that have no service to the service matching their source code,
     * for codes that have since been added to the service referential.
     */
    public function relinkServices(): RedirectResponse
    {
        $servicesByCode = Service::query()->pluck('id', 'code')->all();
        $linked = 0;

        $codes = Article::query()->whereNull('service_id')->whereNotNull('service_code_source')->distinct()->pluck('service_code_source');
        foreach ($codes as $code) {
            $serviceId = $servicesByCode[$this->serviceKey($code)] ?? null;
            if ($serviceId) {
                $linked += Article::query()->whereNull('service_id')->where('service_code_source', $code)->update(['service_id' => $serviceId]);
            }
        }

        return redirect()->route('quality.index', ['check' => 'articles_sans_service'])
            ->with('success', $linked > 0 ? "{$linked} articles ont ete relies a leur service." : 'Aucun article ne peut etre relie : creez d abord les services manquants.');
    }

    private function checks(): array
    {
        $inventory = 'numero_inventaire';

        return [
            'articles_sans_service' => [
                'label' => 'Articles sans service',
                'description' => 'Le code service d origine ne correspond a aucun service du referentiel.',
                'severity' => 'error',
                'entity' => 'article',
                'order' => 'service_code_source',
                'query' => fn () => Article::query()->whereNull('service_id'),
            ],
            'articles_sans_quantite' => [
                'label' => 'Articles sans quantite',
                'description' => 'Ni quantite d entree ni quantite de sortie renseignee.',
                'severity' => 'error',
                'entity' => 'article',
                'query' => fn () => Article::query()
                    ->where(fn (Builder $query) => $query->whereNull('quantite_entree')->orWhere('quantite_entree', 0))
                    ->where(fn (Builder $query) => $query->whereNull('quantite_sortie')->orWhere('quantite_sortie', 0)),
            ],
            'inventaire_doublon' => [
                'label' => 'N° d inventaire en double',
                'description' => 'Le meme numero est utilise par plusieurs articles (transfert saisi comme nouvelle entree ?).',
                'severity' => 'warning',
                'entity' => 'article',
                'order' => $inventory,
                // Resolved to a plain list first: MariaDB re-runs a grouped IN-subquery for every row.
                'query' => fn () => Article::query()->whereIn($inventory, $this->duplicateInventoryNumbers()),
            ],
            'inventaire_manquant' => [
                'label' => 'N° d inventaire manquant',
                'description' => 'Numero vide ou remplace par des points (....).',
                'severity' => 'warning',
                'entity' => 'article',
                'query' => fn () => Article::query()->where(fn (Builder $query) => $query
                    ->whereNull($inventory)
                    ->orWhereRaw("REPLACE(REPLACE({$inventory}, '.', ''), ' ', '') = ''")),
            ],
            'inventaire_non_numerique' => [
                'label' => 'N° d inventaire sans chiffre',
                'description' => 'Texte a la place d un numero (ex. DON, I.S.M., D.S.P.).',
                'severity' => 'info',
                'entity' => 'article',
                'order' => $inventory,
                'query' => fn () => Article::query()
                    ->whereNotNull($inventory)
                    ->whereRaw("REPLACE(REPLACE({$inventory}, '.', ''), ' ', '') <> ''")
                    ->where(fn (Builder $query) => $this->whereHasNoDigit($query, $inventory)),
            ],
            'factures_sans_date' => [
                'label' => 'Factures sans date',
                'description' => 'La date de facture est absente ou n a pas pu etre lue.',
                'severity' => 'error',
                'entity' => 'facture',
                'query' => fn () => Facture::query()->where(fn (Builder $query) => $query->whereNull('date_facture')->orWhere('date_facture', '')),
            ],
            'factures_montant_nul' => [
                'label' => 'Factures a montant nul',
                'description' => 'Montant absent ou egal a zero.',
                'severity' => 'error',
                'entity' => 'facture',
                'query' => fn () => Facture::query()->where(fn (Builder $query) => $query->whereNull('montant')->orWhere('montant', 0)),
            ],
            'factures_sans_fournisseur' => [
                'label' => 'Factures sans fournisseur',
                'description' => 'Aucun code fournisseur renseigne.',
                'severity' => 'warning',
                'entity' => 'facture',
                'query' => fn () => Facture::query()->where(fn (Builder $query) => $query->whereNull('code_fournisseur')->orWhere('code_fournisseur', '')),
            ],
            'factures_sans_service' => [
                'label' => 'Factures sans service',
                'description' => 'La reference service ne correspond a aucun service.',
                'severity' => 'warning',
                'entity' => 'facture',
                'query' => fn () => Facture::query()->whereNull('service_id'),
            ],
        ];
    }

    /** Service codes used by orphan articles, with how many articles each and whether the service now exists. */
    private function unknownServiceCodes(): array
    {
        $servicesByCode = Service::query()->pluck('id', 'code')->all();

        return Article::query()
            ->whereNull('service_id')
            ->select('service_code_source', DB::raw('count(*) as total'))
            ->groupBy('service_code_source')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'code' => $row->service_code_source,
                'total' => (int) $row->total,
                'linkable' => isset($servicesByCode[$this->serviceKey($row->service_code_source)]),
            ])
            ->all();
    }

    private ?array $duplicateInventoryNumbers = null;

    private function duplicateInventoryNumbers(): array
    {
        return $this->duplicateInventoryNumbers ??= Article::query()
            ->select('numero_inventaire')
            ->whereNotNull('numero_inventaire')
            ->where(fn (Builder $query) => $this->whereHasDigit($query, 'numero_inventaire'))
            ->groupBy('numero_inventaire')
            ->havingRaw('count(*) > 1')
            ->pluck('numero_inventaire')
            ->all();
    }

    private function serviceKey(?string $code): int|string|null
    {
        return ctype_digit((string) $code) ? (int) $code : $code;
    }

    private function whereHasDigit(Builder|\Illuminate\Database\Query\Builder $query, string $column): void
    {
        DB::getDriverName() === 'sqlite'
            ? $query->whereRaw("{$column} GLOB '*[0-9]*'")
            : $query->whereRaw("{$column} REGEXP '[0-9]'");
    }

    private function whereHasNoDigit(Builder $query, string $column): void
    {
        DB::getDriverName() === 'sqlite'
            ? $query->whereRaw("{$column} NOT GLOB '*[0-9]*'")
            : $query->whereRaw("{$column} NOT REGEXP '[0-9]'");
    }
}
