<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Rappel extends Model
{
    /** Fiches auxquelles un rappel peut etre rattache : type => [modele, permission de consultation]. */
    public const FICHES = [
        'facture' => [Facture::class, 'factures.view'],
        'article' => [Article::class, 'articles.view'],
        'fournisseur' => [Fournisseur::class, 'fournisseurs.view'],
    ];

    protected $fillable = ['assigne_a', 'texte', 'echeance', 'heure', 'rappelable_type', 'rappelable_id'];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'assigne_a' => 'integer',
            'rappelable_id' => 'integer',
            'echeance' => 'date:Y-m-d',
            'termine_at' => 'datetime',
        ];
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assigne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigne_a');
    }

    public function terminePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'termine_par');
    }

    public function rappelable(): MorphTo
    {
        return $this->morphTo();
    }

    /** Rappels que l'utilisateur voit : ceux qui lui sont assignes et ceux qu'il a crees. */
    public function scopeVisiblePour(Builder $query, User $user): Builder
    {
        return $query->where(fn (Builder $query) => $query->where('assigne_a', $user->id)->orWhere('user_id', $user->id));
    }

    public function scopeOuverts(Builder $query): Builder
    {
        return $query->whereNull('termine_at');
    }

    /** Rappels ouverts assignes a l'utilisateur et arrives a echeance (aujourd'hui ou en retard). */
    public function scopeAEcheancePour(Builder $query, User $user): Builder
    {
        return $query->ouverts()->where('assigne_a', $user->id)->whereDate('echeance', '<=', today());
    }

    public function scopePourFiche(Builder $query, Model $fiche): Builder
    {
        return $query->where('rappelable_type', $fiche->getMorphClass())->where('rappelable_id', $fiche->getKey());
    }

    public function scopeChronologique(Builder $query): Builder
    {
        return $query->orderBy('echeance')->orderByRaw('heure IS NULL')->orderBy('heure')->orderBy('id');
    }

    /** Rappels en cours sur une fiche, parmi ceux que l'utilisateur peut voir (encadre des pages detail). */
    public static function enCoursSurFiche(Model $fiche, User $user)
    {
        return static::query()->pourFiche($fiche)->visiblePour($user)->ouverts()->chronologique()
            ->with('auteur:id,name', 'assigne:id,name', 'rappelable')->get()
            ->map->presenter($user);
    }

    public function peutModifier(User $user): bool
    {
        return $this->user_id === $user->id;
    }

    public function peutTerminer(User $user): bool
    {
        return $this->user_id === $user->id || $this->assigne_a === $user->id;
    }

    /** Donnees affichees par l'interface (carte de rappel). */
    public function presenter(User $user): array
    {
        $fiche = $this->rappelable;
        [, $permission] = self::FICHES[$this->rappelable_type] ?? [null, null];

        return [
            'id' => $this->id,
            'texte' => $this->texte,
            'echeance' => $this->echeance?->format('Y-m-d'),
            'heure' => $this->heure ? substr($this->heure, 0, 5) : null,
            'termine_at' => $this->termine_at?->toIso8601String(),
            'termine_par' => $this->terminePar?->name,
            'auteur' => $this->auteur ? ['id' => $this->auteur->id, 'name' => $this->auteur->name] : null,
            'assigne' => $this->assigne ? ['id' => $this->assigne->id, 'name' => $this->assigne->name] : null,
            'fiche' => $fiche ? [
                'type' => $this->rappelable_type,
                'id' => $fiche->getKey(),
                'label' => self::libelleFiche($this->rappelable_type, $fiche),
                'url' => $permission && $user->can($permission) ? route("{$this->rappelable_type}s.show", $fiche) : null,
            ] : null,
            'peut_modifier' => $this->peutModifier($user),
            'peut_terminer' => $this->peutTerminer($user),
        ];
    }

    public static function libelleFiche(string $type, Model $fiche): string
    {
        return match ($type) {
            'facture' => 'Facture '.($fiche->numero_facture ?: "#{$fiche->id}"),
            'article' => $fiche->description,
            'fournisseur' => $fiche->appellation ?: $fiche->code,
            default => "#{$fiche->getKey()}",
        };
    }
}
