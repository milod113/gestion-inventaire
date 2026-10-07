<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailFacture extends Model
{
    protected $table = 'details_factures';

    protected $fillable = ['facture_id', 'article_id'];

    public function facture(): BelongsTo
    {
        return $this->belongsTo(Facture::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
