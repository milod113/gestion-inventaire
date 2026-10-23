<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Facture;
use App\Models\Fournisseur;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Recherche globale de la palette de commandes (Ctrl+K) : articles, factures et fournisseurs,
 * limitee aux sections que l'utilisateur a le droit de consulter.
 */
class GlobalSearchController extends Controller
{
    private const LIMIT = 6;

    public function __invoke(Request $request): JsonResponse
    {
        $term = $request->string('q')->trim()->value();
        if (mb_strlen($term) < 2) {
            return response()->json([]);
        }

        $user = $request->user();
        $sections = [];

        if ($user->can('articles.view')) {
            $sections['articles'] = $this->ranked(Article::query(), $term, ['numero_inventaire', 'numero_bon'], ['description'])
                ->get(['id', 'description', 'numero_inventaire', 'mouvement', 'date_mouvement', 'service_code_source'])
                ->map(fn (Article $article) => [
                    'id' => $article->id,
                    'title' => $article->description,
                    'subtitle' => $this->join([
                        $article->numero_inventaire ? "Inv. {$article->numero_inventaire}" : null,
                        match ($article->mouvement) { 'E' => 'Entree', 'S' => 'Sortie', default => $article->mouvement },
                        $article->date_mouvement?->format('d/m/Y'),
                        $article->service_code_source ? "Service {$article->service_code_source}" : null,
                    ]),
                    'url' => route('articles.show', $article),
                ]);
        }

        if ($user->can('factures.view')) {
            $sections['factures'] = $this->ranked(Facture::query(), $term, ['numero_facture', 'n_bon', 'n_mandat', 'code_fournisseur'], [])
                ->get(['id', 'numero_facture', 'date_facture', 'montant', 'code_fournisseur', 'service_reference_normalisee', 'n_mandat'])
                ->map(fn (Facture $facture) => [
                    'id' => $facture->id,
                    'title' => 'Facture '.($facture->numero_facture ?: "#{$facture->id}"),
                    'subtitle' => $this->join([
                        $facture->code_fournisseur,
                        $facture->montant !== null ? number_format((float) $facture->montant, 2, ',', ' ').' DA' : null,
                        $facture->date_facture,
                        $facture->service_reference_normalisee,
                        $facture->n_mandat ? "Mandat {$facture->n_mandat}" : null,
                    ]),
                    'url' => route('factures.show', $facture),
                ]);
        }

        if ($user->can('fournisseurs.view')) {
            $sections['fournisseurs'] = $this->ranked(Fournisseur::query(), $term, ['code'], ['appellation'])
                ->get(['id', 'code', 'appellation', 'telephone'])
                ->map(fn (Fournisseur $fournisseur) => [
                    'id' => $fournisseur->id,
                    'title' => $fournisseur->appellation ?: $fournisseur->code,
                    'subtitle' => $this->join([$fournisseur->code, $fournisseur->telephone ? "Tel. {$fournisseur->telephone}" : null]),
                    'url' => route('fournisseurs.show', $fournisseur),
                ]);
        }

        return response()->json(array_filter($sections, fn ($items) => $items->isNotEmpty()));
    }

    /**
     * Codes et numeros : correspondance exacte puis debut de valeur. Libelles : contient le terme.
     * Les correspondances exactes sur un code remontent en premier.
     */
    private function ranked(Builder $query, string $term, array $codes, array $labels): Builder
    {
        $like = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
        $query->where(function (Builder $query) use ($codes, $labels, $like) {
            foreach ($codes as $column) {
                $query->orWhere($column, 'like', "{$like}%");
            }
            foreach ($labels as $column) {
                $query->orWhere($column, 'like', "%{$like}%");
            }
        });

        $exact = implode(' OR ', array_map(fn ($column) => "{$column} = ?", $codes));

        return $query
            ->orderByRaw("CASE WHEN {$exact} THEN 0 ELSE 1 END", array_fill(0, count($codes), $term))
            ->orderByDesc('id')
            ->limit(self::LIMIT);
    }

    private function join(array $parts): string
    {
        return implode(' · ', array_filter($parts, fn ($part) => $part !== null && $part !== ''));
    }
}
