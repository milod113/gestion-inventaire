<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailFacture extends Model
{
    protected $table = 'details_factures';

    protected $fillable = ['facture_id', 'article_id'];

    /**
     * Les ajouts et retraits d'articles sont journalises sur la facture concernee,
     * pour apparaitre dans son historique.
     */
    protected static function booted(): void
    {
        static::created(fn (self $detail) => $detail->journaliser('article_added', $detail->facture_id));

        static::updated(function (self $detail) {
            if ($detail->wasChanged('facture_id')) {
                $detail->journaliser('article_removed', $detail->getOriginal('facture_id'));
                $detail->journaliser('article_added', $detail->facture_id);
            }
        });

        static::deleted(fn (self $detail) => $detail->journaliser('article_removed', $detail->facture_id));
    }

    public function facture(): BelongsTo
    {
        return $this->belongsTo(Facture::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    private function journaliser(string $event, ?int $factureId): void
    {
        $facture = $factureId ? Facture::find($factureId) : null;
        if (! $facture) {
            return;
        }

        $article = Article::find($this->article_id);
        $values = array_filter([
            'article_id' => $this->article_id,
            'article' => $article?->description,
            'numero_inventaire' => $article?->numero_inventaire,
        ], fn ($value) => $value !== null && $value !== '');

        ActivityLog::record(
            $event,
            $facture,
            $event === 'article_removed' ? $values : null,
            $event === 'article_added' ? $values : null,
        );
    }
}
