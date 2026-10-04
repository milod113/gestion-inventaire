<?php

namespace App\Http\Controllers;

use App\Models\Fournisseur;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FournisseurController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();

        return Inertia::render('Fournisseurs/Index', [
            'fournisseurs' => Fournisseur::query()
                ->when($search, fn ($query) => $query->where('code', 'like', "%{$search}%")->orWhere('appellation', 'like', "%{$search}%"))
                ->orderBy('appellation')
                ->paginate(50)
                ->withQueryString(),
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Fournisseurs/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        Fournisseur::create($this->validatedData($request));

        return redirect()->route('fournisseurs.index')->with('success', 'Fournisseur ajoute avec succes.');
    }

    public function show(Fournisseur $fournisseur): Response
    {
        return Inertia::render('Fournisseurs/Show', ['fournisseur' => $fournisseur]);
    }

    public function edit(Fournisseur $fournisseur): Response
    {
        return Inertia::render('Fournisseurs/Edit', ['fournisseur' => $fournisseur]);
    }

    public function update(Request $request, Fournisseur $fournisseur): RedirectResponse
    {
        $fournisseur->update($this->validatedData($request, $fournisseur));

        return redirect()->route('fournisseurs.index')->with('success', 'Fournisseur modifie avec succes.');
    }

    public function destroy(Fournisseur $fournisseur): RedirectResponse
    {
        $fournisseur->delete();

        return redirect()->route('fournisseurs.index')->with('success', 'Fournisseur supprime avec succes.');
    }

    private function validatedData(Request $request, ?Fournisseur $fournisseur = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:255', Rule::unique('fournisseurs', 'code')->ignore($fournisseur)],
            'appellation' => ['required', 'string', 'max:255'],
            'adresse' => ['nullable', 'string'],
            'rc_autres' => ['nullable', 'string'],
            'cb_autres' => ['nullable', 'string'],
            'telephone' => ['nullable', 'string', 'max:255'],
            'telex' => ['nullable', 'string', 'max:255'],
            'artv' => ['nullable', 'string'],
            'observation' => ['nullable', 'string'],
        ]);
    }
}
