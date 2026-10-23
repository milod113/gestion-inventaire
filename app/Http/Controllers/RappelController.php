<?php

namespace App\Http\Controllers;

use App\Models\Rappel;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RappelController extends Controller
{
    private const RELATIONS = ['auteur:id,name', 'assigne:id,name', 'terminePar:id,name', 'rappelable'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $onglet = in_array($request->query('onglet'), ['a_venir', 'retard', 'termines'], true) ? $request->query('onglet') : 'a_venir';
        $vue = $request->query('vue') === 'assignes' ? 'assignes' : 'moi';

        // "moi" : ce que je dois faire ; "assignes" : ce que j'ai confie a des collegues.
        $base = fn () => $vue === 'moi'
            ? Rappel::query()->where('assigne_a', $user->id)
            : Rappel::query()->where('user_id', $user->id)->where('assigne_a', '!=', $user->id);

        $query = match ($onglet) {
            'retard' => $base()->ouverts()->whereDate('echeance', '<', today())->chronologique(),
            'termines' => $base()->whereNotNull('termine_at')->orderByDesc('termine_at'),
            default => $base()->ouverts()->whereDate('echeance', '>=', today())->chronologique(),
        };

        return Inertia::render('Rappels/Index', [
            'rappels' => $query->with(self::RELATIONS)->limit(200)->get()->map->presenter($user),
            'onglet' => $onglet,
            'vue' => $vue,
            'compteurs' => [
                'a_venir' => $base()->ouverts()->whereDate('echeance', '>=', today())->count(),
                'retard' => $base()->ouverts()->whereDate('echeance', '<', today())->count(),
                'termines' => $base()->whereNotNull('termine_at')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $rappel = new Rappel($this->validated($request));
        $rappel->user_id = $request->user()->id;
        $rappel->assigne_a ??= $request->user()->id;
        $rappel->save();

        $pour = $rappel->assigne_a === $request->user()->id ? '' : ' et assigne a '.$rappel->assigne->name;

        return back()->with('success', "Rappel cree{$pour}.");
    }

    public function update(Request $request, Rappel $rappel): RedirectResponse
    {
        abort_unless($rappel->peutModifier($request->user()), 403);
        $data = $this->validated($request);
        $data['assigne_a'] ??= $request->user()->id;
        $rappel->update($data);

        return back()->with('success', 'Rappel modifie.');
    }

    /** Marque le rappel comme fait, ou le rouvre s'il l'etait deja. */
    public function terminer(Request $request, Rappel $rappel): RedirectResponse
    {
        abort_unless($rappel->peutTerminer($request->user()), 403);
        $fait = $rappel->termine_at === null;
        $rappel->forceFill([
            'termine_at' => $fait ? now() : null,
            'termine_par' => $fait ? $request->user()->id : null,
        ])->save();

        return back()->with('success', $fait ? 'Rappel termine.' : 'Rappel rouvert.');
    }

    public function reporter(Request $request, Rappel $rappel): RedirectResponse
    {
        abort_unless($rappel->peutTerminer($request->user()), 403);
        $jours = (int) $request->validate(['jours' => ['required', 'integer', Rule::in([1, 7])]])['jours'];
        $rappel->update(['echeance' => today()->addDays($jours)]);

        return back()->with('success', $jours === 1 ? 'Rappel reporte a demain.' : 'Rappel reporte d une semaine.');
    }

    public function destroy(Request $request, Rappel $rappel): RedirectResponse
    {
        abort_unless($rappel->peutModifier($request->user()), 403);
        $rappel->delete();

        return back()->with('success', 'Rappel supprime.');
    }

    /** Contenu de la cloche : rappels en retard, du jour, puis des 7 prochains jours. */
    public function cloche(Request $request): JsonResponse
    {
        $user = $request->user();
        $rappels = Rappel::query()->ouverts()->where('assigne_a', $user->id)
            ->whereDate('echeance', '<=', today()->addDays(7))
            ->chronologique()->with(self::RELATIONS)->limit(8)->get();

        return response()->json([
            'a_echeance' => Rappel::aEcheancePour($user)->count(),
            'rappels' => $rappels->map->presenter($user),
        ]);
    }

    /** Collegues a qui un rappel peut etre assigne. */
    public function utilisateurs(): JsonResponse
    {
        return response()->json(User::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']));
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'texte' => ['required', 'string', 'max:1000'],
            'echeance' => ['required', 'date_format:Y-m-d'],
            'heure' => ['nullable', 'date_format:H:i'],
            'assigne_a' => ['nullable', 'integer', Rule::exists('users', 'id')->where('is_active', true)],
            'rappelable_type' => ['nullable', Rule::in(array_keys(Rappel::FICHES))],
            'rappelable_id' => ['nullable', 'required_with:rappelable_type', 'integer'],
        ], [
            'texte.required' => 'Decrivez le travail a effectuer.',
            'echeance.required' => 'Choisissez une date.',
            'assigne_a.exists' => 'Ce collegue n est pas disponible.',
        ]);

        if (filled($data['rappelable_type'] ?? null)) {
            [$model, $permission] = Rappel::FICHES[$data['rappelable_type']];
            if (! $request->user()->can($permission) || ! $model::whereKey($data['rappelable_id'])->exists()) {
                throw ValidationException::withMessages(['rappelable_id' => 'Cette fiche est introuvable.']);
            }
        } else {
            $data['rappelable_type'] = $data['rappelable_id'] = null;
        }

        return $data;
    }
}
