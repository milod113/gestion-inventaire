<?php

namespace App\Http\Controllers;

use App\Models\Fournisseur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Recherche et creation rapide de fournisseurs depuis le formulaire de facture. */
class FactureFournisseurController extends Controller
{
    private const COLUMNS = ['id', 'code', 'appellation', 'telephone', 'adresse'];

    public function search(Request $request): JsonResponse
    {
        $term = $request->string('q')->trim()->value();
        if ($term === '') {
            return response()->json([]);
        }

        $fournisseurs = Fournisseur::query()
            ->where(fn ($query) => $query->where('code', 'like', "{$term}%")->orWhere('appellation', 'like', "%{$term}%"))
            // Code exact d'abord, puis codes qui commencent par la saisie, puis correspondances sur le nom.
            ->orderByRaw('CASE WHEN code = ? THEN 0 WHEN code LIKE ? THEN 1 ELSE 2 END', [$term, "{$term}%"])
            ->orderBy('code')
            ->limit(15)
            ->get(self::COLUMNS);

        return response()->json($fournisseurs);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:255', Rule::unique('fournisseurs', 'code')],
            'appellation' => ['required', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:255'],
        ], [
            'code.unique' => 'Ce code fournisseur existe deja : recherchez-le dans la liste.',
        ]);
        $data['code'] = trim($data['code']);

        $fournisseur = Fournisseur::create($data);

        return response()->json($fournisseur->only(self::COLUMNS), 201);
    }
}
